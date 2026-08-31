/**
 * Order tracking — looks up either a regular order or a Custom Studio
 * request by reference number + email (the API checks both automatically).
 */

const ORDER_STATUS_SEQUENCE = ['Order Received', 'Confirmed', 'In Production', 'Quality Check', 'Ready for Delivery', 'Delivered'];
const CUSTOM_STATUS_SEQUENCE = ['Submitted', 'Reviewing', 'Quote Sent', 'Approved', 'In Production', 'Completed'];

function renderTimeline(status, sequence) {
  if (status === 'Cancelled') {
    return '<div class="alert alert--error">This order has been cancelled. Contact us if you believe this is a mistake.</div>';
  }
  const currentIndex = sequence.indexOf(status);
  return `
    <div class="status-timeline">
      ${sequence
        .map((label, i) => {
          const complete = currentIndex >= 0 && i <= currentIndex;
          return `
          <div class="timeline-item ${complete ? 'is-complete' : ''}">
            <span class="timeline-dot"></span>
            <div>
              <p class="timeline-item__label">${RaversUtils.escapeHtml(label)}</p>
              ${i === currentIndex ? '<p class="timeline-item__date">Current status</p>' : ''}
            </div>
          </div>`;
        })
        .join('')}
    </div>
  `;
}

function renderOrderResult(order) {
  return `
    <div class="card">
      <div class="order-summary-card__head">
        <div>
          <p class="order-summary-card__number mono">${RaversUtils.escapeHtml(order.orderNumber)}</p>
          <p class="order-summary-card__date">Placed ${RaversUtils.formatDate(order.createdAt)}</p>
        </div>
        <span class="${RaversUtils.statusBadgeClass(order.status)}">${RaversUtils.escapeHtml(order.status)}</span>
      </div>
      ${renderTimeline(order.status, ORDER_STATUS_SEQUENCE)}
      <div class="tracked-order-items">
        ${order.items
          .map(
            (item) => `
            <div class="checkout-summary__item">
              <div>
                <p class="checkout-summary__item-name">${RaversUtils.escapeHtml(item.productName)}</p>
                <p class="checkout-summary__item-meta">${item.selectedSize ? `Size ${RaversUtils.escapeHtml(item.selectedSize)} · ` : ''}Qty ${item.quantity}</p>
              </div>
              <p class="mono">${RaversUtils.formatCurrency(item.price * item.quantity)}</p>
            </div>`
          )
          .join('')}
        <div class="summary-row summary-row--total">
          <span>Total</span>
          <span>${RaversUtils.formatCurrency(order.total)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderCustomOrderResult(order) {
  return `
    <div class="card">
      <div class="order-summary-card__head">
        <div>
          <p class="order-summary-card__number mono">${RaversUtils.escapeHtml(order.referenceNumber)}</p>
          <p class="order-summary-card__date">Submitted ${RaversUtils.formatDate(order.createdAt)}</p>
        </div>
        <span class="${RaversUtils.statusBadgeClass(order.status)}">${RaversUtils.escapeHtml(order.status)}</span>
      </div>
      ${renderTimeline(order.status, CUSTOM_STATUS_SEQUENCE)}
      <div class="tracked-order-items">
        <div class="review-summary">
          <div class="review-summary__row"><dt>Clothing type</dt><dd>${RaversUtils.escapeHtml(order.clothingType)}</dd></div>
          ${order.size ? `<div class="review-summary__row"><dt>Size</dt><dd>${RaversUtils.escapeHtml(order.size)}</dd></div>` : ''}
          ${order.color ? `<div class="review-summary__row"><dt>Color</dt><dd>${RaversUtils.escapeHtml(order.color)}</dd></div>` : ''}
          <div class="review-summary__row"><dt>Design</dt><dd>${RaversUtils.escapeHtml(order.designDescription)}</dd></div>
          ${
            order.estimatedPrice
              ? `<div class="review-summary__row"><dt>Estimated price</dt><dd>${RaversUtils.formatCurrency(order.estimatedPrice)}</dd></div>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

function initTrackingForm() {
  const form = document.getElementById('tracking-form');
  if (!form) return;

  const resultEl = document.getElementById('tracking-result');
  const errorBox = bindFormError(form);
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hide();
    resultEl.innerHTML = '';
    setButtonLoading(submitBtn, true);

    const reference = form.reference.value.trim();
    const email = form.email.value.trim();

    try {
      const { data } = await RaversAPI.orders.track(reference, email);
      resultEl.innerHTML = data.type === 'order' ? renderOrderResult(data.order) : renderCustomOrderResult(data.order);
    } catch (err) {
      errorBox.show(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', initTrackingForm);
