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
      const overlapping = allRentals.filter(r => {
        const rFrom = parseDate(r.from);
        const rTo = parseDate(r.to);
        return rFrom <= reqTo && rTo >= reqFrom;
      });

      // Merge overlapping busy periods
      const intervals = overlapping.map(r => ({ start: parseDate(r.from), end: parseDate(r.to) }));
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

      // Quickselect implementation for O(N) average time complexity finding Kth largest
      const quickSelectDesc = (arr, left, right, targetIndex) => {
        if (left === right) return arr[left];
        
        const pivotValue = arr[right].count;
        let pivotIndex = left;
        for (let i = left; i < right; i++) {
          if (arr[i].count > pivotValue) {
            const temp = arr[i]; arr[i] = arr[pivotIndex]; arr[pivotIndex] = temp;
            pivotIndex++;
          }
        }
        const temp = arr[pivotIndex]; arr[pivotIndex] = arr[right]; arr[right] = temp;

        if (targetIndex === pivotIndex) return arr[targetIndex];
        else if (targetIndex < pivotIndex) return quickSelectDesc(arr, left, pivotIndex - 1, targetIndex);
        else return quickSelectDesc(arr, pivotIndex + 1, right, targetIndex);
      };

      const kthElement = quickSelectDesc(allDays, 0, allDays.length - 1, kNum - 1);

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
}

module.exports = new ProductController();
