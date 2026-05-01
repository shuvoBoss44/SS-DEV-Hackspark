const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const CENTRAL_API_DELAY_MS = Number(process.env.CENTRAL_API_DELAY_MS || 2100);
const CENTRAL_API_TIMEOUT_MS = Number(process.env.CENTRAL_API_TIMEOUT_MS || 30000);
const RENTAL_PAGE_LIMIT = 100;

let centralQueue = Promise.resolve();
let lastCentralRequestAt = 0;

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class AnalyticsService {
  constructor() {
    this.centralUrl = process.env.CENTRAL_API_URL;
    this.token = process.env.CENTRAL_API_TOKEN;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async runCentralRequest(task) {
    const run = centralQueue.then(async () => {
      const elapsed = Date.now() - lastCentralRequestAt;
      if (elapsed < CENTRAL_API_DELAY_MS) {
        await this.sleep(CENTRAL_API_DELAY_MS - elapsed);
      }
      lastCentralRequestAt = Date.now();
      return task();
    });

    centralQueue = run.catch(() => {});
    return run;
  }

  async fetchCentralJson(path) {
    // Check cache
    const cached = cache.get(path);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const data = await this.runCentralRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CENTRAL_API_TIMEOUT_MS);

      try {
        const response = await fetch(`${this.centralUrl}${path}`, {
          headers: { Authorization: `Bearer ${this.token}` },
          signal: controller.signal
        });
        const body = await response.json().catch(() => ({}));

        if (response.status === 429) {
          const error = new Error('Rate limit exceeded.');
          error.status = 429;
          error.details = body;
          throw error;
        }

        if (!response.ok) {
          const error = new Error(body.error || body.message || `Central API failed with ${response.status}`);
          error.status = response.status;
          error.details = body;
          throw error;
        }

        return body;
      } catch (error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error('Central API request timed out.');
          timeoutError.status = 504;
          throw timeoutError;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    });

    // Store in cache
    cache.set(path, { data, timestamp: Date.now() });
    return data;
  }

  async getPeakWindow(from, to) {
    const startDate = dayjs(`${from}-01`, 'YYYY-MM-DD');
    const endDate = dayjs(to, 'YYYY-MM').endOf('month');
    const totalDaysInRange = endDate.diff(startDate, 'day') + 1;

    if (totalDaysInRange < 7) {
      const error = new Error('Range does not contain at least 7 days');
      error.status = 400;
      throw error;
    }

    const months = [];
    let cursor = dayjs(from, 'YYYY-MM');
    const endMonth = dayjs(to, 'YYYY-MM');
    while (cursor.isBefore(endMonth) || cursor.isSame(endMonth, 'month')) {
      months.push(cursor.format('YYYY-MM'));
      cursor = cursor.add(1, 'month');
    }

    const allDaysData = [];
    for (const month of months) {
      const json = await this.fetchCentralJson(`/api/data/rentals/stats?group_by=date&month=${month}`);
      if (Array.isArray(json.data)) {
        allDaysData.push(...json.data);
      }
    }

    const calendar = [];
    const indexByDate = new Map();
    for (let i = 0; i < totalDaysInRange; i++) {
      const date = startDate.add(i, 'day').format('YYYY-MM-DD');
      calendar.push({ date, count: 0 });
      indexByDate.set(date, i);
    }

    for (const entry of allDaysData) {
      const date = String(entry.date || '').split('T')[0];
      if (indexByDate.has(date)) {
        calendar[indexByDate.get(date)].count = Number(entry.count || 0);
      }
    }

    const windowSize = 7;
    let currentSum = 0;
    for (let i = 0; i < windowSize; i++) {
      currentSum += calendar[i].count;
    }

    let maxSum = currentSum;
    let bestStartIndex = 0;

    for (let i = windowSize; i < calendar.length; i++) {
      currentSum += calendar[i].count - calendar[i - windowSize].count;
      if (currentSum > maxSum) {
        maxSum = currentSum;
        bestStartIndex = i - windowSize + 1;
      }
    }

    return {
      from: calendar[bestStartIndex].date,
      to: calendar[bestStartIndex + windowSize - 1].date,
      totalRentals: maxSum
    };
  }

  async getSurgeDays(month) {
    const json = await this.fetchCentralJson(`/api/data/rentals/stats?group_by=date&month=${month}`);
    const rawData = Array.isArray(json.data) ? json.data : [];
    const start = dayjs(`${month}-01`, 'YYYY-MM-DD');
    const daysInMonth = start.daysInMonth();
    const calendar = [];
    const indexByDate = new Map();

    for (let i = 0; i < daysInMonth; i++) {
      const date = start.add(i, 'day').format('YYYY-MM-DD');
      calendar.push({ date, count: 0, nextSurgeDate: null, daysUntil: null });
      indexByDate.set(date, i);
    }

    for (const entry of rawData) {
      const date = String(entry.date || '').split('T')[0];
      if (indexByDate.has(date)) {
        calendar[indexByDate.get(date)].count = Number(entry.count || 0);
      }
    }

    const stack = [];
    for (let i = 0; i < calendar.length; i++) {
      while (stack.length > 0 && calendar[i].count > calendar[stack[stack.length - 1]].count) {
        const poppedIndex = stack.pop();
        calendar[poppedIndex].nextSurgeDate = calendar[i].date;
        calendar[poppedIndex].daysUntil = i - poppedIndex;
      }
      stack.push(i);
    }

    return calendar;
  }

  async getRecommendations(date, limitNum) {
    const targetDate = dayjs(date, 'YYYY-MM-DD');
    const windows = [1, 2].map((yearsBack) => {
      const target = targetDate.subtract(yearsBack, 'year');
      return {
        from: target.subtract(7, 'day').format('YYYY-MM-DD'),
        to: target.add(7, 'day').format('YYYY-MM-DD')
      };
    });

    const allRentals = [];
    for (const window of windows) {
      allRentals.push(...await this.fetchAllRentalsForWindow(window.from, window.to));
    }

    if (allRentals.length === 0) {
      return [];
    }

    const frequencyMap = new Map();
    let maxFreq = 0;

    for (const rental of allRentals) {
      const productId = rental.productId ?? rental.product_id;
      if (!productId) continue;

      const normalizedProductId = String(productId);
      const currentCount = (frequencyMap.get(normalizedProductId) || 0) + 1;
      frequencyMap.set(normalizedProductId, currentCount);
      if (currentCount > maxFreq) maxFreq = currentCount;
    }

    const buckets = Array.from({ length: maxFreq + 1 }, () => []);
    for (const [productId, count] of frequencyMap.entries()) {
      buckets[count].push(productId);
    }

    const topProducts = [];
    for (let score = maxFreq; score > 0 && topProducts.length < limitNum; score--) {
      for (const productId of buckets[score]) {
        topProducts.push({ productId, score });
        if (topProducts.length === limitNum) break;
      }
    }

    if (topProducts.length === 0) {
      return [];
    }

    const ids = topProducts.map((product) => product.productId).join(',');
    const prodJson = await this.fetchCentralJson(`/api/data/products/batch?ids=${ids}`);
    const productMap = new Map(
      (prodJson.data || []).map((product) => [String(product.id), product])
    );

    return topProducts.map((topProduct) => {
      const product = productMap.get(topProduct.productId) || {};
      return {
        productId: Number(topProduct.productId),
        name: product.name || `Product #${topProduct.productId}`,
        category: product.category || 'UNCATEGORIZED',
        score: topProduct.score
      };
    });
  }

  async fetchAllRentalsForWindow(from, to) {
    const rentals = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const json = await this.fetchCentralJson(`/api/data/rentals?from=${from}&to=${to}&limit=${RENTAL_PAGE_LIMIT}&page=${page}`);
      if (Array.isArray(json.data)) {
        rentals.push(...json.data);
      }

      totalPages = Number(json.totalPages || Math.ceil(Number(json.total || 0) / RENTAL_PAGE_LIMIT) || 1);
      page++;
    }

    return rentals;
  }
}

module.exports = new AnalyticsService();
