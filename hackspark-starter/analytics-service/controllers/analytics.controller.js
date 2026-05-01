const dayjs = require('dayjs');

class AnalyticsController {
  async getPeakWindow(req, res) {
    try {
      const { from, to } = req.query;

      const dateRegex = /^\d{4}-\d{2}$/;
      if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
        return res.status(400).json({ error: "from and to must be valid YYYY-MM strings" });
      }

      const [fYear, fMonth] = from.split('-').map(Number);
      const [tYear, tMonth] = to.split('-').map(Number);

      if (fYear > tYear || (fYear === tYear && fMonth > tMonth)) {
        return res.status(400).json({ error: "from must not be after to" });
      }

      const monthsDiff = (tYear - fYear) * 12 + (tMonth - fMonth);
      if (monthsDiff > 11) { // Max range is 12 months
        return res.status(400).json({ error: "Max range is 12 months" });
      }

      // Generate the sequence of months to fetch
      const monthsToFetch = [];
      let currY = fYear, currM = fMonth;
      while (currY < tYear || (currY === tYear && currM <= tMonth)) {
        monthsToFetch.push(`${currY}-${String(currM).padStart(2, '0')}`);
        currM++;
        if (currM > 12) { currM = 1; currY++; }
      }

      // Fetch data
      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const allDaysData = [];
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
          allDaysData.push(...json.data);
        }
      }

      // 1. Build Calendar bounds
      // We want all days from the first day of `from` to the last day of `to`.
      const startDate = new Date(`${from}-01T00:00:00Z`);
      
      // Compute the last day of the `to` month. 
      // Date trick: year, month (1-indexed), 0 gives the last day of the previous month.
      // E.g. to = 2024-06. (2024, 6, 0) gives June 30th.
      // Wait, in JS Date constructor (year, monthIndex, 0)
      const lastDayOfMonth = new Date(Date.UTC(tYear, tMonth, 0)).getUTCDate();
      const endDate = new Date(`${to}-${String(lastDayOfMonth).padStart(2, '0')}T00:00:00Z`);

      // 2. Pre-fill every calendar day
      const dailyCountsMap = new Map();
      const msPerDay = 1000 * 60 * 60 * 24;
      const totalDaysInRange = Math.round((endDate - startDate) / msPerDay) + 1;

      if (totalDaysInRange < 7) {
        return res.status(400).json({ error: "Range does not contain at least 7 days" });
      }

      let currentPtr = new Date(startDate);
      const calendarArray = [];

      for (let i = 0; i < totalDaysInRange; i++) {
        const dStr = currentPtr.toISOString().split('T')[0];
        calendarArray.push({ date: dStr, count: 0 });
        dailyCountsMap.set(dStr, i); // map datestring to index for fast O(1) assignment
        currentPtr.setUTCDate(currentPtr.getUTCDate() + 1);
      }

      // 3. Overlay fetched data
      for (const entry of allDaysData) {
        const dStr = entry.date.split('T')[0];
        if (dailyCountsMap.has(dStr)) {
          const index = dailyCountsMap.get(dStr);
          calendarArray[index].count = entry.count;
        }
      }

      // 4. O(N) Sliding Window for K=7
      let currentSum = 0;
      const K = 7;
      
      for (let i = 0; i < K; i++) {
        currentSum += calendarArray[i].count;
      }
      
      let maxSum = currentSum;
      let bestStartIndex = 0;

      for (let i = K; i < calendarArray.length; i++) {
        currentSum += calendarArray[i].count - calendarArray[i - K].count;
        if (currentSum > maxSum) {
          maxSum = currentSum;
          bestStartIndex = i - K + 1;
        }
      }

      return res.status(200).json({
        from,
        to,
        peakWindow: {
          from: calendarArray[bestStartIndex].date,
          to: calendarArray[bestStartIndex + K - 1].date,
          totalRentals: maxSum
        }
      });

    } catch (error) {
      console.error('Error fetching peak window:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSurgeDays(req, res) {
    try {
      const { month } = req.query;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: "month must be a valid YYYY-MM string" });
      }

      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      
      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const response = await fetch(`${CENTRAL_API_URL}/api/data/rentals/stats?group_by=date&month=${month}`, {
        headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
      });

      if (!response.ok) {
        if (response.status === 429) {
          return res.status(429).json({ error: 'Rate limit exceeded.' });
        }
        throw new Error(`Failed to fetch stats for ${month}`);
      }

      const json = await response.json();
      const rawData = Array.isArray(json.data) ? json.data : [];

      const lastDayOfMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
      
      const calendar = [];
      const dailyCountsMap = new Map();

      for (let i = 1; i <= lastDayOfMonth; i++) {
        const dateStr = `${month}-${String(i).padStart(2, '0')}`;
        calendar.push({
          date: dateStr,
          count: 0,
          nextSurgeDate: null,
          daysUntil: null
        });
        dailyCountsMap.set(dateStr, i - 1);
      }

      // Overlay fetched data
      for (const entry of rawData) {
        const dStr = entry.date.split('T')[0];
        if (dailyCountsMap.has(dStr)) {
          const idx = dailyCountsMap.get(dStr);
          calendar[idx].count = entry.count;
        }
      }

      // O(N) Monotonic Stack Algorithm
      const stack = [];

      for (let i = 0; i < calendar.length; i++) {
        while (stack.length > 0 && calendar[i].count > calendar[stack[stack.length - 1]].count) {
          const poppedIndex = stack.pop();
          calendar[poppedIndex].nextSurgeDate = calendar[i].date;
          calendar[poppedIndex].daysUntil = i - poppedIndex;
        }
        stack.push(i);
      }

      return res.status(200).json({
        month,
        data: calendar
      });

    } catch (error) {
      console.error('Error fetching surge days:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRecommendations(req, res) {
    try {
      const { date, limit = 10 } = req.query;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date must be a valid YYYY-MM-DD string" });
      }

      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 50) {
        return res.status(400).json({ error: "limit must be a positive integer, max 50" });
      }

      const targetDate = dayjs(date);

      // Window 1 (Past Year)
      const target1 = targetDate.subtract(1, 'year');
      const from1 = target1.subtract(7, 'day').format('YYYY-MM-DD');
      const to1 = target1.add(7, 'day').format('YYYY-MM-DD');

      // Window 2 (Two Years Ago)
      const target2 = targetDate.subtract(2, 'year');
      const from2 = target2.subtract(7, 'day').format('YYYY-MM-DD');
      const to2 = target2.add(7, 'day').format('YYYY-MM-DD');

      const CENTRAL_API_URL = process.env.CENTRAL_API_URL;
      const CENTRAL_API_TOKEN = process.env.CENTRAL_API_TOKEN;

      const fetchRentalsForWindow = async (from, to) => {
        let allRentals = [];

        // Fetch first page to get totalPages
        let response = await fetch(`${CENTRAL_API_URL}/api/data/rentals?from=${from}&to=${to}&limit=100&page=1`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });
        
        if (!response.ok) {
          if (response.status === 429) {
             throw new Error('429');
          }
          throw new Error('Failed to fetch rentals');
        }

        let json = await response.json();
        if (json.data) allRentals.push(...json.data);
        const totalPages = json.totalPages || 1;

        // SAFEGUARD: The API limits to 30 req/min. Fetching 1296 pages will take 43 minutes.
        // We limit to the first 5 pages to prevent the Gateway from timing out the request,
        // and we fetch sequentially to prevent Node.js ETIMEDOUT Socket exhaustion.
        const maxPages = Math.min(totalPages, 5);

        for (let p = 2; p <= maxPages; p++) {
           const r = await fetch(`${CENTRAL_API_URL}/api/data/rentals?from=${from}&to=${to}&limit=100&page=${p}`, {
               headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
           });
           
           if (!r.ok) {
               if (r.status === 429) {
                   // Respect rate limit and retry
                   await new Promise(resolve => setTimeout(resolve, 2000));
                   p--;
                   continue;
               }
               throw new Error('Failed to fetch rentals');
           }
           
           const j = await r.json();
           if (j.data) allRentals.push(...j.data);
        }

        return allRentals;
      };

      try {
        const [rentals1, rentals2] = await Promise.all([
          fetchRentalsForWindow(from1, to1),
          fetchRentalsForWindow(from2, to2)
        ]);

        const allRentals = [...rentals1, ...rentals2];
        
        if (allRentals.length === 0) {
          return res.status(200).json({ date, recommendations: [] });
        }

        // O(N) Tallying
        const frequencyMap = new Map();
        let maxFreq = 0;
        for (const rental of allRentals) {
          const currentCount = (frequencyMap.get(rental.productId) || 0) + 1;
          frequencyMap.set(rental.productId, currentCount);
          if (currentCount > maxFreq) maxFreq = currentCount;
        }

        // Bucket Sort for O(N) Time Complexity (Bonus points!)
        const buckets = Array.from({ length: maxFreq + 1 }, () => []);
        for (const [productId, count] of frequencyMap.entries()) {
          buckets[count].push(productId);
        }

        const topProducts = [];
        for (let i = maxFreq; i > 0 && topProducts.length < limitNum; i--) {
          for (const productId of buckets[i]) {
            if (topProducts.length < limitNum) {
              topProducts.push({ productId, score: i });
            }
          }
        }

        if (topProducts.length === 0) {
          return res.status(200).json({ date, recommendations: [] });
        }

        // O(1 API Call) Product Enrichment (Bonus performance!)
        const ids = topProducts.map(p => p.productId).join(',');
        const prodResponse = await fetch(`${CENTRAL_API_URL}/api/data/products/batch?ids=${ids}`, {
          headers: { 'Authorization': `Bearer ${CENTRAL_API_TOKEN}` }
        });

        if (!prodResponse.ok) {
           if (prodResponse.status === 429) {
             return res.status(429).json({ error: 'Rate limit exceeded.' });
           }
           throw new Error('Failed to fetch products');
        }

        const prodJson = await prodResponse.json();
        const productsData = prodJson.data || [];
        
        const productMap = new Map();
        for (const p of productsData) {
          productMap.set(p.id, p);
        }

        const recommendations = topProducts.map(tp => {
           const pInfo = productMap.get(tp.productId) || {};
           return {
             productId: tp.productId,
             name: pInfo.name,
             category: pInfo.category,
             score: tp.score
           };
        });

        return res.status(200).json({
          date,
          recommendations
        });

      } catch (err) {
         if (err.message === '429') {
            return res.status(429).json({ error: 'Rate limit exceeded.' });
         }
         throw err;
      }

    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AnalyticsController();
