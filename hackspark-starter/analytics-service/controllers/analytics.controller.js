const dayjs = require('dayjs');
const analyticsService = require('../services/analytics.service');

function isValidMonth(value) {
  return typeof value === 'string' && dayjs(value, 'YYYY-MM', true).isValid();
}

function isValidDate(value) {
  return typeof value === 'string' && dayjs(value, 'YYYY-MM-DD', true).isValid();
}

function monthDiff(from, to) {
  return dayjs(to, 'YYYY-MM').diff(dayjs(from, 'YYYY-MM'), 'month');
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

      const peakWindow = await analyticsService.getPeakWindow(from, to);

      return res.status(200).json({
        from,
        to,
        peakWindow
      });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async getSurgeDays(req, res) {
    try {
      const { month } = req.query;

      if (!isValidMonth(month)) {
        return res.status(400).json({ error: 'month must be a valid YYYY-MM string' });
      }

      const data = await analyticsService.getSurgeDays(month);

      return res.status(200).json({ month, data });
    } catch (error) {
      return this.handleError(res, error);
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

      const recommendations = await analyticsService.getRecommendations(date, limitNum);

      return res.status(200).json({ date, recommendations });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  handleError(res, error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait for the Central API window to reset before retrying.'
      });
    }

    if (error.status === 504) {
      return res.status(504).json({ error: error.message });
    }

    console.error('Analytics error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

module.exports = new AnalyticsController();
