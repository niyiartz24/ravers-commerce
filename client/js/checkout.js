/**
 * Checkout — renders the cart as an order summary, validates and submits
 * the delivery form, creates the order via the API, then either:
 *  - mock mode: shows the confirmation immediately (order is auto-paid), or
 *  - live mode: redirects to Paystack, then verifies + confirms when the
 *    customer is redirected back to checkout.html?reference=...
 * Payment is only ever considered successful once the server confirms it
 * via /api/orders/verify-payment — the redirect itself proves nothing.
 */

function renderCheckoutSummary() {
  const listEl = document.getElementById('checkout-items');
  if (!listEl) return null;

  const items = RaversCart.getItems();
  if (items.length === 0) {
    window.location.href = 'cart.html';
    return null;
  }

  listEl.innerHTML = items
    .map(
      (item) => `
      <div class="checkout-summary__item">
        <div>
          <p class="checkout-summary__item-name">${RaversUtils.escapeHtml(item.name)}</p>
          <p class="checkout-summary__item-meta">${item.size ? `Size ${RaversUtils.escapeHtml(item.size)} · ` : ''}Qty ${item.quantity}</p>
        </div>
        <p class="mono">${RaversUtils.formatCurrency(item.price * item.quantity)}</p>
      </div>`
    )
    .join('');

  const subtotal = RaversCart.getSubtotal();
  document.getElementById('checkout-subtotal').textContent = RaversUtils.formatCurrency(subtotal);
  document.getElementById('checkout-delivery').textContent = RaversUtils.formatCurrency(DELIVERY_FEE_ESTIMATE);
  document.getElementById('checkout-total').textContent = RaversUtils.formatCurrency(subtotal + DELIVERY_FEE_ESTIMATE);

  return items;
}

function prefillCheckoutForm() {
  const user = RaversAuth.getUser();
  if (!user) return;
  const nameField = document.getElementById('checkout-name');
  const emailField = document.getElementById('checkout-email');
  if (nameField && !nameField.value) nameField.value = user.name;
  if (emailField && !emailField.value) emailField.value = user.email;
}

function initCheckoutForm(items) {
  const form = document.getElementById('checkout-form');
  if (!form || !items) return;

  const errorBox = bindFormError(form);
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hide();
    setButtonLoading(submitBtn, true);

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedSize: item.size,
      })),
      customer: {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        address: form.address.value.trim(),
        city: form.city.value.trim(),
        state: form.state.value.trim(),
        notes: form.notes.value.trim(),
      },
    };

    try {
      const { data } = await RaversAPI.orders.create(payload);

      if (data.payment.mode === 'live' && data.payment.authorizationUrl) {
        // Order is created and reserved; payment isn't confirmed until the
        // customer completes it on Paystack and we verify server-side.
        RaversCart.clear();
        window.location.href = data.payment.authorizationUrl;
        return;
      }

      // Mock mode — already marked paid server-side.
      RaversCart.clear();
      renderConfirmation(data.order);
    } catch (err) {
      errorBox.show(err.message);
      setButtonLoading(submitBtn, false);
    }
  });
}

function confirmationMarkup(order) {
  return `
    <p class="eyebrow">Order Confirmed</p>
    <h1>Thank you.</h1>
    <p class="text-muted">A confirmation has been sent to ${RaversUtils.escapeHtml(order.email)}. Save your order number to track it any time.</p>
    <p class="confirmation-panel__ref">${RaversUtils.escapeHtml(order.orderNumber)}</p>
    <p class="text-muted">Total paid: <strong>${RaversUtils.formatCurrency(order.total)}</strong></p>
    <div class="hero__actions" style="justify-content:center;margin-top:24px;">
      <a href="track-order.html" class="btn btn--outline">Track This Order</a>
      <a href="shop.html" class="btn btn--primary">Continue Shopping</a>
    </div>
  `;
}

function paymentPendingMarkup() {
  return '<div class="loading-state"><span class="spinner"></span> Confirming your payment...</div>';
}

function paymentNotConfirmedMarkup(orderNumber) {
  return `
    <p class="eyebrow">Payment Not Confirmed</p>
    <h1>We couldn't confirm this payment yet.</h1>
    <p class="text-muted">If you completed payment on Paystack, this can occasionally take a minute to reflect — refresh this page to check again. Your order <strong>${RaversUtils.escapeHtml(orderNumber)}</strong> is saved either way.</p>
    <div class="hero__actions" style="justify-content:center;margin-top:24px;">
      <button type="button" class="btn btn--outline" onclick="window.location.reload()">Check Again</button>
      <a href="track-order.html" class="btn btn--primary">Track This Order</a>
    </div>
  `;
}

function renderConfirmation(order) {
  const layout = document.getElementById('checkout-layout');
  if (layout) layout.hidden = true;
  const confirmation = document.getElementById('checkout-confirmation');
  confirmation.innerHTML = confirmationMarkup(order);
  confirmation.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handlePaymentReturn(reference) {
  const layout = document.getElementById('checkout-layout');
  if (layout) layout.hidden = true;
  const confirmation = document.getElementById('checkout-confirmation');
  confirmation.innerHTML = paymentPendingMarkup();
  confirmation.hidden = false;

  try {
    const { data } = await RaversAPI.orders.verifyPayment(reference);
    if (data.verified) {
      confirmation.innerHTML = confirmationMarkup(data.order);
    } else {
      confirmation.innerHTML = paymentNotConfirmedMarkup(data.order.orderNumber);
    }
  } catch (err) {
    confirmation.innerHTML = `<div class="alert alert--error">${RaversUtils.escapeHtml(err.message)}</div>`;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('checkout-confirmation')) return; // not the checkout page

  const params = new URLSearchParams(window.location.search);
  const returningReference = params.get('reference') || params.get('trxref');

  if (returningReference) {
    handlePaymentReturn(returningReference);
    return;
  }

  const items = renderCheckoutSummary();
  prefillCheckoutForm();
  initCheckoutForm(items);
});
