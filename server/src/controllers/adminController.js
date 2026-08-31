const { asyncHandler } = require('../utils/errors');
const adminService = require('../services/adminService');

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await adminService.dashboard();
  res.status(200).json({ success: true, data: stats });
});

const listCustomers = asyncHandler(async (req, res) => {
  const customers = await adminService.listCustomers();
  res.status(200).json({ success: true, data: { customers, count: customers.length } });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await adminService.getCustomer(Number(req.params.id));
  res.status(200).json({ success: true, data: { customer } });
});

module.exports = { getDashboard, listCustomers, getCustomer };
