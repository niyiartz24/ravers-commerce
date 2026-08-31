const { asyncHandler, AppError } = require('../utils/errors');
const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const customOrderService = require('../services/customOrderService');

const createOrder = asyncHandler(async (req, res) => {
  const { items, customer } = req.body;

  const order = await orderService.create({
    items,
    customer,
    userId: req.user ? req.user.id : null,
  });

  const payment = await paymentService.processPayment(order);

  // Reflect the mock-paid status immediately if we just marked it paid.
  const finalOrder = payment.paid ? { ...order, paymentStatus: 'paid', paymentReference: payment.reference } : order;

  res.status(201).json({ success: true, data: { order: finalOrder, payment } });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getById(Number(req.params.id), {
    userId: req.user ? req.user.id : null,
    isAdmin: req.user ? req.user.role === 'ADMIN' : false,
  });
  res.status(200).json({ success: true, data: { order } });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.myOrders(req.user.id);
  res.status(200).json({ success: true, data: { orders } });
});

const listOrdersAdmin = asyncHandler(async (req, res) => {
  const orders = await orderService.listAllForAdmin({ status: req.query.status });
  res.status(200).json({ success: true, data: { orders, count: orders.length } });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(Number(req.params.id), req.body.status);
  res.status(200).json({ success: true, data: { order } });
});

const trackOrder = asyncHandler(async (req, res) => {
  const { reference, email } = req.body;
  if (!reference || !email) {
    throw new AppError('Enter your order number and the email used at checkout.', 400);
  }

  const cleanReference = reference.trim().toUpperCase();

  const order = await orderService.track(cleanReference, email);
  if (order) {
    return res.status(200).json({ success: true, data: { type: 'order', order } });
  }

  const customOrder = await customOrderService.track(cleanReference, email);
  if (customOrder) {
    return res.status(200).json({ success: true, data: { type: 'custom_order', order: customOrder } });
  }

  throw new AppError('No order found with that reference and email. Double-check both and try again.', 404);
});

// Called by the frontend once Paystack redirects the customer back to
// checkout.html?reference=... . Always re-verifies with Paystack server-side
// before marking anything paid — never trusts the redirect alone.
const verifyOrderPayment = asyncHandler(async (req, res) => {
  const { reference } = req.body;
  if (!reference) {
    throw new AppError('Missing payment reference.', 400);
  }

  const order = await orderService.findByPaymentReference(reference);
  if (!order) {
    throw new AppError('No order found for that payment reference.', 404);
  }

  if (order.paymentStatus === 'paid') {
    return res.status(200).json({ success: true, data: { order, verified: true } });
  }

  const result = await paymentService.verifyPayment(reference);
  if (!result.verified) {
    return res.status(200).json({ success: true, data: { order, verified: false } });
  }

  await orderService.markPaid(order.id, reference);
  const paidOrder = { ...order, paymentStatus: 'paid', paymentReference: reference };
  res.status(200).json({ success: true, data: { order: paidOrder, verified: true } });
});

module.exports = {
  createOrder,
  getOrder,
  myOrders,
  listOrdersAdmin,
  updateOrderStatus,
  trackOrder,
  verifyOrderPayment,
};
