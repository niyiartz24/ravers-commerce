const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, attachUserIfPresent, requireAdmin } = require('../middleware/auth');
const { uploadReferenceImage } = require('../middleware/upload');
const customOrderController = require('../controllers/customOrderController');

const router = express.Router();

const submitValidation = [
  body('customerName').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('clothingType').trim().notEmpty().withMessage('Choose a clothing type.'),
  body('designDescription').trim().notEmpty().withMessage('Describe the design you want.'),
];

router.post(
  '/',
  attachUserIfPresent,
  uploadReferenceImage,
  submitValidation,
  validate,
  customOrderController.submitCustomOrder
);

router.get('/my-requests', authenticate, customOrderController.myRequests);
router.get('/', authenticate, requireAdmin, customOrderController.listCustomOrdersAdmin);
router.get('/:id', authenticate, customOrderController.getCustomOrder);

router.patch('/:id/status', authenticate, requireAdmin, customOrderController.updateCustomOrderStatus);

module.exports = router;
