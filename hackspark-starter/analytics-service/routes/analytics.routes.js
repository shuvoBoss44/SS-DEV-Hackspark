const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/peak-window', analyticsController.getPeakWindow);

module.exports = router;
