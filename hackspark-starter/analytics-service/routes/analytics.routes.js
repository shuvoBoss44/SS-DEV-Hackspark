const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/peak-window', analyticsController.getPeakWindow.bind(analyticsController));
router.get('/surge-days', analyticsController.getSurgeDays.bind(analyticsController));
router.get('/recommendations', analyticsController.getRecommendations.bind(analyticsController));

module.exports = router;
