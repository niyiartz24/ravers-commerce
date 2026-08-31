const orderService = require('./orderService');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function isLiveModeEnabled() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

/**
 * Starts payment for a freshly created order.
 *
 * Mock mode (default, no PAYSTACK_SECRET_KEY set): the order is marked
 * paid immediately so the MVP demo flow completes end to end.
 *
 * Live mode (PAYSTACK_SECRET_KEY set): initializes a real Paystack
 * transaction and returns an authorization_url for the frontend to
 * redirect the customer to. Verification happens in verifyPayment below,
 * called from POST /api/orders/verify-payment once Paystack redirects the
 * customer back to checkout.html?reference=... .
 */
async function processPayment(order) {
  if (!isLiveModeEnabled()) {
    await orderService.markPaid(order.id, `MOCK-${order.orderNumber}`);
    return { mode: 'mock', paid: true, reference: `MOCK-${order.orderNumber}` };
  }

  const reference = `${order.orderNumber}-${Date.now()}`;

  // Optional belt-and-suspenders: if CLIENT_URL is set to a real frontend
  // origin (not the local-dev "*"), pass it explicitly so Paystack redirects
  // back to this order's checkout page with ?reference=... in the URL.
  // Otherwise Paystack falls back to whatever callback URL is configured in
  // Settings -> API Keys & Webhooks on the Paystack dashboard — set that too,
  // since it's the more reliable source of truth in production.
  const configuredOrigin = (process.env.CLIENT_URL || '').split(',')[0].trim();
  const callbackUrl =
    configuredOrigin && configuredOrigin !== '*'
      ? `${configuredOrigin.replace(/\/$/, '')}/checkout.html?reference=${reference}`
      : undefined;

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: order.email,
      amount: Math.round(order.total * 100), // kobo
      reference,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      metadata: { orderNumber: order.orderNumber, orderId: order.id },
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    throw new Error(data.message || 'Could not start payment with Paystack.');
  }

  // Save the reference now so findByPaymentReference can locate this order
  // when the customer is redirected back after paying.
  await orderService.setPendingPaymentReference(order.id, reference);

  return {
    mode: 'live',
    paid: false,
    reference,
    authorizationUrl: data.data.authorization_url,
  };
}

/** Verifies a Paystack transaction reference. Used once live keys are added. */
async function verifyPayment(reference) {
  if (!isLiveModeEnabled()) {
    return { verified: true, mode: 'mock' };
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await response.json();
  const verified = response.ok && data.status && data.data?.status === 'success';
  return { verified, mode: 'live', raw: data };
}

module.exports = { processPayment, verifyPayment, isLiveModeEnabled };
