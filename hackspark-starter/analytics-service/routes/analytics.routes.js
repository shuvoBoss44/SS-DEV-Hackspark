const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/peak-window', analyticsController.getPeakWindow);
router.get('/surge-days', analyticsController.getSurgeDays);
router.get('/recommendations', analyticsController.getRecommendations);

module.exports = router;
