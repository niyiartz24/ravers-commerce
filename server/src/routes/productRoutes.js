const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = express.Router();

const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('category').trim().notEmpty().withMessage('Category is required.'),
  body('sizes').optional().isArray().withMessage('Sizes must be a list.'),
];

router.get('/admin/all', authenticate, requireAdmin, productController.listProductsAdmin);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

router.post('/', authenticate, requireAdmin, productValidation, validate, productController.createProduct);
router.put('/:id', authenticate, requireAdmin, productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, productController.deleteProduct);

module.exports = router;
