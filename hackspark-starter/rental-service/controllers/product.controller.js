class ProductController {
  constructor() {
    this.cachedCategories = null;
    this.categoriesCacheTime = 0;
    this.CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

    // Bind methods to ensure `this` context is correct
    this.getCategories = this.getCategories.bind(this);
    this.getProducts = this.getProducts.bind(this);
    this.getProductById = this.getProductById.bind(this);
  }

  async getCategories() {
    if (this.cachedCategories && (Date.now() - this.categoriesCacheTime < this.CACHE_TTL)) {
      return this.cachedCategories;
    }

    const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
    const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

    const response = await fetch(`${CENTRAL_API_URL}/api/data/categories`, {
      headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error('Failed to fetch categories');
      error.status = response.status;
      error.details = data;
      throw error;
    }

    this.cachedCategories = data.categories;
    this.categoriesCacheTime = Date.now();
    return this.cachedCategories;
  }

  async getProducts(req, res) {
    try {
      const category = req.query.category;

      // Step 1: Validate category if provided (P5)
      if (category) {
        try {
          const validCategories = await this.getCategories();
          if (!validCategories.includes(category)) {
            return res.status(400).json({
              error: `Invalid category '${category}'`,
              validOptions: validCategories
            });
          }
        } catch (err) {
          if (err.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded while verifying category. Please try again later.', details: err.details });
          }
          console.error('Error validating category:', err);
          return res.status(500).json({ error: 'Internal server error while validating category' });
        }
      }

      // Step 2: Fetch products (P3 logic extended for P5)
      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const queryParams = new URLSearchParams(req.query).toString();
      const url = `${CENTRAL_API_URL}/api/data/products${queryParams ? '?' + queryParams : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${CENTRAL_API_TOKEN}`
        }
      });

      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        let message = 'An error occurred while fetching products';
        if (response.status === 404) message = 'Products not found';
        if (response.status === 429) message = 'Rate limit exceeded. Please try again later.';

        return res.status(response.status).json({
          error: message,
          details: data
        });
      }

      // Return the full envelope exactly as received
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: 'Internal server error while communicating with Central API' });
    }
  }

  async getProductById(req, res) {
    try {
      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const { id } = req.params;
      const url = `${CENTRAL_API_URL}/api/data/products/${id}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${CENTRAL_API_TOKEN}`
        }
      });

      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        let message = 'An error occurred while fetching the product';
        if (response.status === 404) message = 'Product not found';
        if (response.status === 429) message = 'Rate limit exceeded. Please try again later.';

        return res.status(response.status).json({
          error: message,
          details: data
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return res.status(500).json({ error: 'Internal server error while communicating with Central API' });
    }
  }
  async checkAvailability(req, res) {
    try {
      const { id } = req.params;
      const { from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: "Missing 'from' or 'to' query parameters" });
      }

      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      let allRentals = [];
      let page = 1;
      let totalPages = 1;

      // Fetch all rentals for the product handling pagination
      while (page <= totalPages) {
        const response = await fetch(`${CENTRAL_API_URL}/api/data/rentals?product_id=${id}&limit=100&page=${page}`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
          }
          throw new Error('Failed to fetch rentals');
        }

        const json = await response.json();
        if (json.data) allRentals.push(...json.data);
        totalPages = json.totalPages || 1;
        page++;
      }

      const parseDate = str => new Date(str + 'T00:00:00Z');
      const formatDate = date => date.toISOString().split('T')[0];

      const reqFrom = parseDate(from);
      const reqTo = parseDate(to);

      // Filter overlapping rentals
      const getRentalStart = rental => rental.from || rental.rentalStart;
      const getRentalEnd = rental => rental.to || rental.rentalEnd;

      const overlapping = allRentals.filter(r => {
        const rFrom = parseDate(getRentalStart(r).split('T')[0]);
        const rTo = parseDate(getRentalEnd(r).split('T')[0]);
        return rFrom <= reqTo && rTo >= reqFrom;
      });

      // Merge overlapping busy periods
      const intervals = overlapping.map(r => ({
        start: parseDate(getRentalStart(r).split('T')[0]),
        end: parseDate(getRentalEnd(r).split('T')[0])
      }));
      intervals.sort((a, b) => a.start - b.start);

      const merged = [];
      for (const interval of intervals) {
        if (merged.length === 0) {
          merged.push(interval);
        } else {
          const last = merged[merged.length - 1];
          if (last.end >= interval.start) {
            last.end = new Date(Math.max(last.end, interval.end));
          } else {
            merged.push(interval);
          }
        }
      }

      // Calculate free windows within the requested range
      const freeWindows = [];
      let currentStart = new Date(reqFrom);

      for (const busy of merged) {
        if (currentStart < busy.start) {
          const freeEnd = new Date(busy.start);
          freeEnd.setDate(freeEnd.getDate() - 1);

          const actualFreeEnd = new Date(Math.min(freeEnd, reqTo));
          if (actualFreeEnd >= currentStart) {
            freeWindows.push({
              start: formatDate(currentStart),
              end: formatDate(actualFreeEnd)
            });
          }
        }

        const nextPossibleStart = new Date(busy.end);
        nextPossibleStart.setDate(nextPossibleStart.getDate() + 1);
        if (nextPossibleStart > currentStart) {
          currentStart = nextPossibleStart;
        }
      }

      if (currentStart <= reqTo) {
        freeWindows.push({
          start: formatDate(currentStart),
          end: formatDate(reqTo)
        });
      }

      const busyPeriodsFormatted = merged.map(b => ({
        start: formatDate(b.start),
        end: formatDate(b.end)
      }));

      return res.status(200).json({
        productId: parseInt(id),
        from,
        to,
        available: merged.length === 0,
        busyPeriods: busyPeriodsFormatted,
        freeWindows
      });

    } catch (error) {
      console.error('Error checking availability:', error);
      return res.status(500).json({ error: 'Internal server error while checking availability' });
    }
  }

  async getKthBusiestDate(req, res) {
    try {
      const { from, to, k } = req.query;

      const dateRegex = /^\d{4}-\d{2}$/;
      if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
        return res.status(400).json({ error: "from and to must be valid YYYY-MM strings" });
      }

      const kNum = parseInt(k, 10);
      if (isNaN(kNum) || kNum <= 0 || String(kNum) !== String(k)) {
        return res.status(400).json({ error: "k must be a positive integer" });
      }

      const [fYear, fMonth] = from.split('-').map(Number);
      const [tYear, tMonth] = to.split('-').map(Number);

      if (fYear > tYear || (fYear === tYear && fMonth > tMonth)) {
        return res.status(400).json({ error: "from must not be after to" });
      }

      const monthsDiff = (tYear - fYear) * 12 + (tMonth - fMonth);
      if (monthsDiff > 11) { // 12 months maximum inclusive
        return res.status(400).json({ error: "Max range is 12 months" });
      }

      const monthsToFetch = [];
      let currY = fYear, currM = fMonth;
      while (currY < tYear || (currY === tYear && currM <= tMonth)) {
        monthsToFetch.push(`${currY}-${String(currM).padStart(2, '0')}`);
        currM++;
        if (currM > 12) { currM = 1; currY++; }
      }

      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const allDays = [];
      // Fetch data sequentially to avoid parallel rate limiting bursts
      for (const m of monthsToFetch) {
        const response = await fetch(`${CENTRAL_API_URL}/api/data/rentals/stats?group_by=date&month=${m}`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded.' });
          }
          throw new Error(`Failed to fetch stats for ${m}`);
        }

        const json = await response.json();
        if (json.data && Array.isArray(json.data)) {
          allDays.push(...json.data);
        }
      }

      if (kNum > allDays.length) {
        return res.status(404).json({ error: "k exceeds the total number of distinct dates available" });
      }

      // Option 1: Min-Heap Implementation (O(N log K) Time, O(K) Space)
      class MinHeap {
        constructor() { this.heap = []; }

        insert(node) {
          this.heap.push(node);
          this.bubbleUp(this.heap.length - 1);
        }

        extractMin() {
          if (this.heap.length === 1) return this.heap.pop();
          const min = this.heap[0];
          this.heap[0] = this.heap.pop();
          this.bubbleDown(0);
          return min;
        }

        peek() { return this.heap[0]; }
        size() { return this.heap.length; }

        bubbleUp(index) {
          while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.heap[index].count >= this.heap[parent].count) break;
            const temp = this.heap[index];
            this.heap[index] = this.heap[parent];
            this.heap[parent] = temp;
            index = parent;
          }
        }

        bubbleDown(index) {
          const length = this.heap.length;
          while (true) {
            let left = 2 * index + 1;
            let right = 2 * index + 2;
            let smallest = index;

            if (left < length && this.heap[left].count < this.heap[smallest].count) smallest = left;
            if (right < length && this.heap[right].count < this.heap[smallest].count) smallest = right;
            if (smallest === index) break;

            const temp = this.heap[index];
            this.heap[index] = this.heap[smallest];
            this.heap[smallest] = temp;
            index = smallest;
          }
        }
      }

      const minHeap = new MinHeap();
      for (const day of allDays) {
        if (minHeap.size() < kNum) {
          minHeap.insert(day);
        } else if (day.count > minHeap.peek().count) {
          minHeap.extractMin();
          minHeap.insert(day);
        }
      }

      const kthElement = minHeap.peek();

      return res.status(200).json({
        from,
        to,
        k: kNum,
        date: kthElement.date.split('T')[0],
        rentalCount: kthElement.count
      });

    } catch (error) {
      console.error('Error fetching kth busiest date:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTopCategories(req, res) {
    try {
      const { id } = req.params;
      const { k } = req.query;

      const kNum = parseInt(k, 10);
      if (isNaN(kNum) || kNum <= 0 || String(kNum) !== String(k)) {
        return res.status(400).json({ error: "k must be a positive integer" });
      }

      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const productCounts = {};
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await fetch(`${CENTRAL_API_URL}/api/data/rentals?renter_id=${id}&limit=100&page=${page}`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded.' });
          }
          throw new Error('Failed to fetch user rentals');
        }

        const json = await response.json();
        if (json.data && Array.isArray(json.data)) {
          for (const rental of json.data) {
            if (rental.productId) {
              productCounts[rental.productId] = (productCounts[rental.productId] || 0) + 1;
            }
          }
        }
        totalPages = json.totalPages || 1;
        page++;
      }

      if (Object.keys(productCounts).length === 0) {
        return res.status(200).json({ userId: parseInt(id), topCategories: [] });
      }

      const distinctIds = Object.keys(productCounts);
      const categoryLookup = {};

      // Batch fetch product details (max 50 per request)
      for (let i = 0; i < distinctIds.length; i += 50) {
        const chunk = distinctIds.slice(i, i + 50);
        const response = await fetch(`${CENTRAL_API_URL}/api/data/products/batch?ids=${chunk.join(',')}`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded.' });
          }
          const text = await response.text();
          console.error('Batch fetch failed:', response.status, response.statusText, text);
          throw new Error('Failed to fetch products batch');
        }

        const json = await response.json();
        if (json.data && Array.isArray(json.data)) {
          for (const product of json.data) {
            categoryLookup[product.id] = product.category;
          }
        }
      }

      const categoryCounts = {};
      for (const [pid, count] of Object.entries(productCounts)) {
        const category = categoryLookup[pid];
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + count;
        }
      }

      const categoriesList = Object.entries(categoryCounts).map(([cat, count]) => ({
        category: cat,
        rentalCount: count
      }));

      // Bounded array trick to find top K categories
      const topK = [];
      for (const cat of categoriesList) {
        topK.push(cat);
        topK.sort((a, b) => b.rentalCount - a.rentalCount); // Sort descending
        if (topK.length > kNum) {
          topK.pop(); // Remove the smallest
        }
      }

      return res.status(200).json({
        userId: parseInt(id),
        topCategories: topK
      });

    } catch (error) {
      console.error('Error fetching top categories:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getFreeStreak(req, res) {
    try {
      const { id } = req.params;
      const { year } = req.query;

      if (!year || !/^\d{4}$/.test(year)) {
        return res.status(400).json({ error: "year must be a valid 4-digit number" });
      }

      const yearStart = new Date(`${year}-01-01T00:00:00Z`);
      const yearEnd = new Date(`${year}-12-31T00:00:00Z`);

      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      let page = 1;
      let totalPages = 1;
      const allRentals = [];

      while (page <= totalPages) {
        const response = await fetch(`${CENTRAL_API_URL}/api/data/rentals?product_id=${id}&limit=100&page=${page}`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded.' });
          }
          throw new Error('Failed to fetch rentals');
        }

        const json = await response.json();
        if (json.data && Array.isArray(json.data)) {
          allRentals.push(...json.data);
        }
        totalPages = json.totalPages || 1;
        page++;
      }

      const busyPeriods = [];
      for (const rental of allRentals) {
        let rStart = new Date(rental.rentalStart.split('T')[0] + 'T00:00:00Z');
        let rEnd = new Date(rental.rentalEnd.split('T')[0] + 'T00:00:00Z');

        // Filter out rentals that do not overlap with the year at all
        if (rEnd < yearStart || rStart > yearEnd) {
          continue;
        }

        // Clip the rental to the year boundaries
        if (rStart < yearStart) rStart = new Date(yearStart);
        if (rEnd > yearEnd) rEnd = new Date(yearEnd);

        busyPeriods.push({ start: rStart, end: rEnd });
      }

      // Sort by start date
      busyPeriods.sort((a, b) => a.start - b.start);

      const addDays = (date, days) => {
        const next = new Date(date);
        next.setUTCDate(next.getUTCDate() + days);
        return next;
      };

      // Merge overlapping or adjacent busy periods.
      const mergedPeriods = [];
      if (busyPeriods.length > 0) {
        let current = busyPeriods[0];
        for (let i = 1; i < busyPeriods.length; i++) {
          const next = busyPeriods[i];
          if (next.start <= addDays(current.end, 1)) {
            if (next.end > current.end) {
              current.end = next.end;
            }
          } else {
            mergedPeriods.push(current);
            current = next;
          }
        }
        mergedPeriods.push(current);
      }

      const formatDate = (date) => date.toISOString().split('T')[0];
      const getInclusiveDays = (start, end) => {
        const msPerDay = 1000 * 60 * 60 * 24;
        return Math.round((end - start) / msPerDay) + 1;
      };

      let longestStreak = {
        from: null,
        to: null,
        days: -1
      };

      let currentPtr = new Date(yearStart);

      for (const period of mergedPeriods) {
        if (currentPtr < period.start) {
          const freeEnd = addDays(period.start, -1);
          const diff = getInclusiveDays(currentPtr, freeEnd);
          if (diff > longestStreak.days) {
            longestStreak = {
              from: formatDate(currentPtr),
              to: formatDate(freeEnd),
              days: diff
            };
          }
        }
        const nextFreeStart = addDays(period.end, 1);
        if (currentPtr < nextFreeStart) {
          currentPtr = nextFreeStart;
        }
      }

      if (currentPtr <= yearEnd) {
        const diff = getInclusiveDays(currentPtr, yearEnd);
        if (diff > longestStreak.days) {
          longestStreak = {
            from: formatDate(currentPtr),
            to: formatDate(yearEnd),
            days: diff
          };
        }
      }

      // Handle edge case where product was fully booked all year
      if (longestStreak.days === -1) {
        longestStreak = {
          from: null,
          to: null,
          days: 0
        };
      }

      return res.status(200).json({
        productId: parseInt(id),
        year: parseInt(year),
        longestFreeStreak: longestStreak
      });

    } catch (error) {
      console.error('Error calculating free streak:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMergedFeed(req, res) {
    try {
      const { productIds, limit } = req.query;

      if (!productIds) {
        return res.status(400).json({ error: "productIds is required" });
      }

      const idsStrArray = productIds.split(',');
      if (idsStrArray.length === 0 || idsStrArray.length > 10) {
        return res.status(400).json({ error: "Must provide 1 to 10 product IDs" });
      }

      const uniqueIds = new Set();
      for (const idStr of idsStrArray) {
        const pId = parseInt(idStr.trim(), 10);
        if (isNaN(pId) || pId <= 0) {
          return res.status(400).json({ error: "Invalid product ID" });
        }
        uniqueIds.add(pId);
      }
      const idsArray = Array.from(uniqueIds);

      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
        return res.status(400).json({ error: "Limit must be a positive integer max 100" });
      }

      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      // Only fetch the first `limit` items for each product since the merged feed is capped at limit.
      const streams = [];
      for (const pid of idsArray) {
        const response = await fetch(`${CENTRAL_API_URL}/api/data/rentals?product_id=${pid}&limit=${limitNum}&page=1`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded.' });
          }
          throw new Error(`Failed to fetch rentals for product ${pid}`);
        }

        const json = await response.json();
        if (json.data && Array.isArray(json.data)) {
          streams.push(json.data);
        } else {
          streams.push([]);
        }
      }

      // Merge Two Sorted Lists helper function
      const mergeTwoLists = (list1, list2, maxLimit) => {
        const merged = [];
        let i = 0;
        let j = 0;

        while (i < list1.length && j < list2.length && merged.length < maxLimit) {
          const date1 = new Date(list1[i].rentalStart);
          const date2 = new Date(list2[j].rentalStart);
          
          if (date1 <= date2) {
            merged.push(list1[i]);
            i++;
          } else {
            merged.push(list2[j]);
            j++;
          }
        }

        while (i < list1.length && merged.length < maxLimit) {
          merged.push(list1[i]);
          i++;
        }
        
        while (j < list2.length && merged.length < maxLimit) {
          merged.push(list2[j]);
          j++;
        }

        return merged;
      };

      // Divide and conquer merge
      const mergeKLists = (lists, left, right, maxLimit) => {
        if (left === right) return lists[left];
        if (left < right) {
          const mid = Math.floor((left + right) / 2);
          const l1 = mergeKLists(lists, left, mid, maxLimit);
          const l2 = mergeKLists(lists, mid + 1, right, maxLimit);
          return mergeTwoLists(l1, l2, maxLimit);
        }
        return [];
      };

      let finalMerged = [];
      if (streams.length > 0) {
        finalMerged = mergeKLists(streams, 0, streams.length - 1, limitNum);
      }

      // Format response exactly as requested
      const formattedFeed = finalMerged.map(r => ({
        rentalId: r.id,
        productId: r.productId,
        rentalStart: r.rentalStart.split('T')[0],
        rentalEnd: r.rentalEnd.split('T')[0]
      }));

      return res.status(200).json({
        productIds: idsArray,
        limit: limitNum,
        feed: formattedFeed
      });

    } catch (error) {
      console.error('Error in merged feed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ProductController();
