const { asyncHandler, AppError } = require('../utils/errors');
const customOrderService = require('../services/customOrderService');

const submitCustomOrder = asyncHandler(async (req, res) => {
  const referenceImageUrl = req.file ? `/uploads/custom-orders/${req.file.filename}` : null;

  const customOrder = await customOrderService.create({
    ...req.body,
    referenceImageUrl,
    userId: req.user ? req.user.id : null,
  });

  res.status(201).json({ success: true, data: { customOrder } });
});

const myRequests = asyncHandler(async (req, res) => {
  const requests = await customOrderService.myRequests(req.user.id);
  res.status(200).json({ success: true, data: { customOrders: requests } });
});

const listCustomOrdersAdmin = asyncHandler(async (req, res) => {
  const requests = await customOrderService.listAllForAdmin({ status: req.query.status });
  res.status(200).json({ success: true, data: { customOrders: requests, count: requests.length } });
});

const getCustomOrder = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const customOrder = await customOrderService.getById(Number(req.params.id), {
    userId: req.user.id,
    isAdmin,
  });
  res.status(200).json({ success: true, data: { customOrder } });
});

const updateCustomOrderStatus = asyncHandler(async (req, res) => {
  const { status, estimatedPrice, adminNotes } = req.body;
  if (!status && estimatedPrice === undefined && adminNotes === undefined) {
    throw new AppError('Nothing to update.', 400);
  }
  const customOrder = await customOrderService.updateStatus(Number(req.params.id), {
    status,
    estimatedPrice,
    adminNotes,
  });
  res.status(200).json({ success: true, data: { customOrder } });
});

module.exports = {
  submitCustomOrder,
  myRequests,
  listCustomOrdersAdmin,
  getCustomOrder,
  updateCustomOrderStatus,
};
