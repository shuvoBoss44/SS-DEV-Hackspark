const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const CENTRAL_API_DELAY_MS = Number(process.env.CENTRAL_API_DELAY_MS || 2100);
const CENTRAL_API_TIMEOUT_MS = Number(process.env.CENTRAL_API_TIMEOUT_MS || 30000);
const RENTAL_PAGE_LIMIT = 100;

let centralQueue = Promise.resolve();
let lastCentralRequestAt = 0;

function isValidMonth(value) {
  return typeof value === 'string' && dayjs(value, 'YYYY-MM', true).isValid();
}

function isValidDate(value) {
  return typeof value === 'string' && dayjs(value, 'YYYY-MM-DD', true).isValid();
}

function monthDiff(from, to) {
  return dayjs(to, 'YYYY-MM').diff(dayjs(from, 'YYYY-MM'), 'month');
}

function monthRange(from, to) {
  const months = [];
  let cursor = dayjs(from, 'YYYY-MM');
  const end = dayjs(to, 'YYYY-MM');

  while (cursor.isBefore(end) || cursor.isSame(end, 'month')) {
    months.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }

  return months;
}

function centralHeaders() {
  return { Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}` };
}

function centralUrl(path) {
  return `${process.env.CENTRAL_API_URL}${path}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCentralRequest(task) {
  const run = centralQueue.then(async () => {
    const elapsed = Date.now() - lastCentralRequestAt;
    if (elapsed < CENTRAL_API_DELAY_MS) {
      await sleep(CENTRAL_API_DELAY_MS - elapsed);
    }
    lastCentralRequestAt = Date.now();
    return task();
  });

  centralQueue = run.catch(() => {});
  return run;
}

async function fetchCentralJson(path) {
  return runCentralRequest(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CENTRAL_API_TIMEOUT_MS);

    try {
      const response = await fetch(centralUrl(path), {
        headers: centralHeaders(),
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
}

function handleCentralError(res, error) {
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait for the Central API window to reset before retrying.'
    });
  }

  if (error.status === 504) {
    return res.status(504).json({ error: error.message });
  }

  console.error('Central API error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

function countRentalProduct(rental) {
  return rental.productId ?? rental.product_id;
}

class AnalyticsController {
  async getPeakWindow(req, res) {
    try {
      const { from, to } = req.query;

      if (!isValidMonth(from) || !isValidMonth(to)) {
        return res.status(400).json({ error: 'from and to must be valid YYYY-MM strings' });
      }

      if (dayjs(from, 'YYYY-MM').isAfter(dayjs(to, 'YYYY-MM'))) {
        return res.status(400).json({ error: 'from must not be after to' });
      }

      if (monthDiff(from, to) > 11) {
        return res.status(400).json({ error: 'Max range is 12 months' });
      }

      const allDaysData = [];
      for (const month of monthRange(from, to)) {
        const json = await fetchCentralJson(`/api/data/rentals/stats?group_by=date&month=${month}`);
        if (Array.isArray(json.data)) {
          allDaysData.push(...json.data);
        }
      }

      const startDate = dayjs(`${from}-01`, 'YYYY-MM-DD');
      const endDate = dayjs(to, 'YYYY-MM').endOf('month');
      const totalDaysInRange = endDate.diff(startDate, 'day') + 1;

      if (totalDaysInRange < 7) {
        return res.status(400).json({ error: 'Range does not contain at least 7 days' });
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

      return res.status(200).json({
        from,
        to,
        peakWindow: {
          from: calendar[bestStartIndex].date,
          to: calendar[bestStartIndex + windowSize - 1].date,
          totalRentals: maxSum
        }
      });
    } catch (error) {
      return handleCentralError(res, error);
    }
  }

  async getSurgeDays(req, res) {
    try {
      const { month } = req.query;

      if (!isValidMonth(month)) {
        return res.status(400).json({ error: 'month must be a valid YYYY-MM string' });
      }

      const json = await fetchCentralJson(`/api/data/rentals/stats?group_by=date&month=${month}`);
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

      return res.status(200).json({ month, data: calendar });
    } catch (error) {
      return handleCentralError(res, error);
    }
  }

  async getRecommendations(req, res) {
    try {
      const { date, limit = 10 } = req.query;

      if (!isValidDate(date)) {
        return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
      }

      const limitNum = Number(limit);
      if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 50) {
        return res.status(400).json({ error: 'limit must be a positive integer, max 50' });
      }

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
        return res.status(200).json({ date, recommendations: [] });
      }

      const frequencyMap = new Map();
      let maxFreq = 0;

      for (const rental of allRentals) {
        const productId = countRentalProduct(rental);
        if (!productId) continue;

        const currentCount = (frequencyMap.get(productId) || 0) + 1;
        frequencyMap.set(productId, currentCount);
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
        return res.status(200).json({ date, recommendations: [] });
      }

      const ids = topProducts.map((product) => product.productId).join(',');
      const prodJson = await fetchCentralJson(`/api/data/products/batch?ids=${ids}`);
      const productMap = new Map((prodJson.data || []).map((product) => [product.id, product]));

      const recommendations = topProducts.map((topProduct) => {
        const product = productMap.get(topProduct.productId) || {};
        return {
          productId: topProduct.productId,
          name: product.name,
          category: product.category,
          score: topProduct.score
        };
      });

      return res.status(200).json({ date, recommendations });
    } catch (error) {
      return handleCentralError(res, error);
    }
  }

  async fetchAllRentalsForWindow(from, to) {
    const rentals = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const json = await fetchCentralJson(`/api/data/rentals?from=${from}&to=${to}&limit=${RENTAL_PAGE_LIMIT}&page=${page}`);
      if (Array.isArray(json.data)) {
        rentals.push(...json.data);
      }

      totalPages = Number(json.totalPages || Math.ceil(Number(json.total || 0) / RENTAL_PAGE_LIMIT) || 1);
      page++;
    }

    return rentals;
  }
}

module.exports = new AnalyticsController();
