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
}

module.exports = new AnalyticsController();
