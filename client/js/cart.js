/**
 * Guest-friendly cart, persisted to localStorage. An authenticated user's
 * cart still lives here until checkout — that's when it becomes a real
 * order saved to the database (see checkout.js).
 */

const CART_KEY = 'ravers_cart';
const DELIVERY_FEE_ESTIMATE = 3500; // must match server DELIVERY_FEE in orderService.js

const RaversCart = {
  getItems() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
  },

  addItem({ productId, name, price, imageUrl, size, quantity }) {
    const items = this.getItems();
    const existing = items.find((i) => i.productId === productId && i.size === size);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, name, price, imageUrl, size, quantity });
    }
    this.saveItems(items);
  },

  updateQuantity(productId, size, quantity) {
    let items = this.getItems();
    if (quantity <= 0) {
      items = items.filter((i) => !(i.productId === productId && i.size === size));
    } else {
      const item = items.find((i) => i.productId === productId && i.size === size);
      if (item) item.quantity = quantity;
    }
    this.saveItems(items);
  },

  removeItem(productId, size) {
    const items = this.getItems().filter((i) => !(i.productId === productId && i.size === size));
    this.saveItems(items);
  },

  clear() {
    this.saveItems([]);
  },

  getCount() {
    return this.getItems().reduce((sum, i) => sum + i.quantity, 0);
  },

  getSubtotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
};

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = RaversCart.getCount();
}

function cartItemMarkup(item) {
  const lineTotal = item.price * item.quantity;
  return `
    <div class="cart-item" data-product-id="${item.productId}" data-size="${RaversUtils.escapeHtml(item.size)}">
      <img class="cart-item__image" src="${RaversUtils.escapeHtml(item.imageUrl)}" alt="${RaversUtils.escapeHtml(item.name)}" loading="lazy">
      <div class="cart-item__body">
        <p class="cart-item__name">${RaversUtils.escapeHtml(item.name)}</p>
        <p class="cart-item__meta">${item.size ? `Size ${RaversUtils.escapeHtml(item.size)}` : 'One size'}</p>
        <div class="cart-item__controls">
          <div class="qty-control" role="group" aria-label="Quantity">
            <button type="button" class="js-qty-decrease" aria-label="Decrease quantity">&minus;</button>
            <input type="text" class="js-qty-input" value="${item.quantity}" inputmode="numeric" aria-label="Quantity" readonly>
            <button type="button" class="js-qty-increase" aria-label="Increase quantity">&plus;</button>
          </div>
          <button type="button" class="cart-item__remove js-remove-item">Remove</button>
        </div>
      </div>
      <p class="cart-item__price">${RaversUtils.formatCurrency(lineTotal)}</p>
    </div>
  `;
}

function renderCartPage() {
  const listEl = document.getElementById('cart-items');
  if (!listEl) return;

  const emptyEl = document.getElementById('cart-empty');
  const summaryEl = document.getElementById('cart-summary');
  const items = RaversCart.getItems();

  if (items.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    if (summaryEl) summaryEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (summaryEl) summaryEl.hidden = false;

  listEl.innerHTML = items.map(cartItemMarkup).join('');

  listEl.querySelectorAll('.cart-item').forEach((row) => {
    const productId = Number(row.dataset.productId);
    const size = row.dataset.size;
    const item = items.find((i) => i.productId === productId && i.size === size);

    row.querySelector('.js-qty-decrease').addEventListener('click', () => {
      RaversCart.updateQuantity(productId, size, item.quantity - 1);
      renderCartPage();
    });
    row.querySelector('.js-qty-increase').addEventListener('click', () => {
      RaversCart.updateQuantity(productId, size, item.quantity + 1);
      renderCartPage();
    });
    row.querySelector('.js-remove-item').addEventListener('click', () => {
      RaversCart.removeItem(productId, size);
      renderCartPage();
    });
  });

  renderCartSummary();
}

function renderCartSummary() {
  const subtotal = RaversCart.getSubtotal();
  const subtotalEl = document.getElementById('summary-subtotal');
  const deliveryEl = document.getElementById('summary-delivery');
  const totalEl = document.getElementById('summary-total');

  if (subtotalEl) subtotalEl.textContent = RaversUtils.formatCurrency(subtotal);
  if (deliveryEl) deliveryEl.textContent = RaversUtils.formatCurrency(DELIVERY_FEE_ESTIMATE);
  if (totalEl) totalEl.textContent = RaversUtils.formatCurrency(subtotal + DELIVERY_FEE_ESTIMATE);
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCartPage();
});
