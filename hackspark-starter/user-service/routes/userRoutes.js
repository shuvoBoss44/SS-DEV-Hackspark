const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const discountController = require('../controllers/discountController');
const authMiddleware = require('../middlewares/auth');

// Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);

// Discount Route
router.get('/:id/discount', discountController.getDiscount);

module.exports = router;