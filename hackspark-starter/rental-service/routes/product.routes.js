const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.get('/products/:id/availability', productController.checkAvailability);
router.get('/kth-busiest-date', productController.getKthBusiestDate);

module.exports = router;
