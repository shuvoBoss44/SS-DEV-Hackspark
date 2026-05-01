const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.get('/products/:id/availability', productController.checkAvailability);
router.get('/products/:id/free-streak', productController.getFreeStreak);
router.get('/kth-busiest-date', productController.getKthBusiestDate);
router.get('/users/:id/top-categories', productController.getTopCategories);
router.get('/merged-feed', productController.getMergedFeed);

module.exports = router;
