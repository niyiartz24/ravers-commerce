const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, attachUserIfPresent, requireAdmin } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

const router = express.Router();

const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Your cart is empty.'),
  body('customer.name').trim().notEmpty().withMessage('Full name is required.'),
  body('customer.email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('customer.phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('customer.address').trim().notEmpty().withMessage('Delivery address is required.'),
  body('customer.city').trim().notEmpty().withMessage('City is required.'),
  body('customer.state').trim().notEmpty().withMessage('State is required.'),
];

// Guest checkout is allowed, but a logged-in user's order is linked to their account.
router.post('/', attachUserIfPresent, createOrderValidation, validate, orderController.createOrder);

router.post('/track', orderController.trackOrder);
router.post('/verify-payment', orderController.verifyOrderPayment);

router.get('/my-orders', authenticate, orderController.myOrders);
router.get('/', authenticate, requireAdmin, orderController.listOrdersAdmin);
router.get('/:id', authenticate, orderController.getOrder);

router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  body('status').notEmpty().withMessage('Status is required.'),
  validate,
  orderController.updateOrderStatus
);

module.exports = router;
