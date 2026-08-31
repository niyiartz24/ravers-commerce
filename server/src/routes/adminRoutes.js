const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/customers', adminController.listCustomers);
router.get('/customers/:id', adminController.getCustomer);

module.exports = router;
