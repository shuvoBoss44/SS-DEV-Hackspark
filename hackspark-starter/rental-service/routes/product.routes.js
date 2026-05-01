const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);

module.exports = router;
