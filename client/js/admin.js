/**
 * Admin dashboard — shared shell (auth guard, sidebar, modal helper) plus
 * page-specific logic, gated by which root element is present on the page.
 * Every admin API call is also re-checked server-side; this guard is only
 * for a clean UX, not the real security boundary.
 */

function initAdminShell() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return false;

  if (!RaversAuth.requireAdmin()) return false;

  const user = RaversAuth.getUser();
  const userLabel = document.getElementById('admin-user-name');
  if (userLabel) userLabel.textContent = user.name;

  const toggle = document.getElementById('admin-nav-toggle');
  const nav = document.getElementById('admin-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('is-open'));
  }

  RaversUtils.qsa('[data-logout]').forEach((btn) => btn.addEventListener('click', () => RaversAuth.logout()));

  return true;
}

/* --- Generic modal --------------------------------------------------------- */

function openModal(title, bodyHtml) {
  let overlay = document.getElementById('admin-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'admin-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h3 id="admin-modal-title"></h3>
          <button type="button" class="modal__close" aria-label="Close" id="admin-modal-close">&times;</button>
        </div>
        <div id="admin-modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.getElementById('admin-modal-close').addEventListener('click', closeModal);
  }
  document.getElementById('admin-modal-title').textContent = title;
  document.getElementById('admin-modal-body').innerHTML = bodyHtml;
  overlay.hidden = false;
  return overlay;
}

function closeModal() {
  const overlay = document.getElementById('admin-modal');
  if (overlay) overlay.hidden = true;
}

function toastMessage(message, tone = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '200';
    toast.style.maxWidth = '320px';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<div class="alert ${tone === 'error' ? 'alert--error' : 'alert--success'}" style="margin:0;">${RaversUtils.escapeHtml(message)}</div>`;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

/* --- Dashboard --------------------------------------------------------- */

async function initAdminDashboard() {
  const root = document.getElementById('admin-dashboard-root');
  if (!root) return;

  try {
    const { data } = await RaversAPI.admin.dashboard();

    document.getElementById('stat-total-orders').textContent = data.totalOrders;
    document.getElementById('stat-pending-orders').textContent = data.pendingOrders;
    document.getElementById('stat-in-production').textContent = data.ordersInProduction;
    document.getElementById('stat-custom-requests').textContent = data.totalCustomRequests;

    const recentEl = document.getElementById('recent-orders-body');
    if (data.recentOrders.length === 0) {
      recentEl.innerHTML = '<tr><td colspan="5" class="cell-muted">No orders yet.</td></tr>';
    } else {
      recentEl.innerHTML = data.recentOrders
        .map(
          (order) => `
          <tr>
            <td class="mono">${RaversUtils.escapeHtml(order.orderNumber)}</td>
            <td>${RaversUtils.escapeHtml(order.customerName)}</td>
            <td class="cell-muted">${RaversUtils.formatDate(order.createdAt)}</td>
            <td class="mono">${RaversUtils.formatCurrency(order.total)}</td>
            <td><span class="${RaversUtils.statusBadgeClass(order.status)}">${RaversUtils.escapeHtml(order.status)}</span></td>
          </tr>`
        )
        .join('');
    }
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Could not load dashboard</h3><p>${RaversUtils.escapeHtml(err.message)}</p></div>`;
  }
}

/* --- Products management ------------------------------------------------- */

async function initAdminProducts() {
  const root = document.getElementById('admin-products-root');
  if (!root) return;

  const tbody = document.getElementById('products-table-body');
  const addBtn = document.getElementById('add-product-btn');

  function productRow(p) {
    return `
      <tr data-id="${p.id}">
        <td><img class="thumb" src="${RaversUtils.escapeHtml(p.imageUrl)}" alt=""></td>
        <td>${RaversUtils.escapeHtml(p.name)}</td>
        <td class="cell-muted">${RaversUtils.escapeHtml(p.category)}</td>
        <td class="mono">${RaversUtils.formatCurrency(p.price)}</td>
        <td class="cell-muted">${p.featured ? 'Featured' : '—'}</td>
        <td class="cell-actions">
          <button type="button" class="link-action js-edit-product">Edit</button>
          <button type="button" class="link-action link-action--danger js-delete-product">Delete</button>
        </td>
      </tr>
    `;
  }

  async function loadProducts() {
    tbody.innerHTML = '<tr><td colspan="6" class="cell-muted">Loading products...</td></tr>';
    try {
      const { data } = await RaversAPI.products.adminList();
      tbody.innerHTML = data.products.length
        ? data.products.map(productRow).join('')
        : '<tr><td colspan="6" class="cell-muted">No products yet.</td></tr>';
      bindProductRowActions();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-muted">${RaversUtils.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function productFormHtml(p) {
    const product = p || { name: '', description: '', price: '', category: '', imageUrl: '', sizes: [], material: '', featured: false };
    return `
      <form id="product-form">
        <div class="form-row"><label class="form-label">Name</label><input class="form-input" name="name" required value="${RaversUtils.escapeHtml(product.name)}"></div>
        <div class="form-row"><label class="form-label">Description</label><textarea class="form-textarea" name="description">${RaversUtils.escapeHtml(product.description)}</textarea></div>
        <div class="form-row form-row--split">
          <div><label class="form-label">Price (NGN)</label><input class="form-input" name="price" type="number" min="0" step="0.01" required value="${product.price}"></div>
          <div><label class="form-label">Category</label><input class="form-input" name="category" required value="${RaversUtils.escapeHtml(product.category)}"></div>
        </div>
        <div class="form-row"><label class="form-label">Image URL</label><input class="form-input" name="imageUrl" value="${RaversUtils.escapeHtml(product.imageUrl)}"></div>
        <div class="form-row"><label class="form-label">Sizes <span class="optional">(comma separated)</span></label><input class="form-input" name="sizes" value="${product.sizes.join(', ')}"></div>
        <div class="form-row"><label class="form-label">Material</label><input class="form-input" name="material" value="${RaversUtils.escapeHtml(product.material)}"></div>
        <div class="form-row"><label class="checkbox-row"><input type="checkbox" name="featured" ${product.featured ? 'checked' : ''}> Featured product</label></div>
        <div id="product-form-error" class="alert alert--error" hidden></div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" id="product-form-cancel">Cancel</button>
          <button type="submit" class="btn btn--primary">${p ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </form>
    `;
  }

  function openProductForm(product) {
    openModal(product ? 'Edit Product' : 'Add Product', productFormHtml(product));
    const form = document.getElementById('product-form');
    document.getElementById('product-form-cancel').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById('product-form-error');
      errorBox.hidden = true;
      const submitBtn = form.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true);

      const payload = {
        name: form.name.value.trim(),
        description: form.description.value.trim(),
        price: Number(form.price.value),
        category: form.category.value.trim(),
        imageUrl: form.imageUrl.value.trim(),
        sizes: form.sizes.value.split(',').map((s) => s.trim()).filter(Boolean),
        material: form.material.value.trim(),
        featured: form.featured.checked,
      };

      try {
        if (product) {
          await RaversAPI.products.update(product.id, payload);
          toastMessage('Product updated.');
        } else {
          await RaversAPI.products.create(payload);
          toastMessage('Product added.');
        }
        closeModal();
        loadProducts();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.hidden = false;
        setButtonLoading(submitBtn, false);
      }
    });
  }

  function bindProductRowActions() {
    RaversUtils.qsa('.js-edit-product', tbody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('tr').dataset.id);
        const { data } = await RaversAPI.products.get(id);
        openProductForm(data.product);
      });
    });
    RaversUtils.qsa('.js-delete-product', tbody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('tr').dataset.id);
        if (!window.confirm('Delete this product? This cannot be undone.')) return;
        try {
          await RaversAPI.products.remove(id);
          toastMessage('Product deleted.');
          loadProducts();
        } catch (err) {
          toastMessage(err.message, 'error');
        }
      });
    });
  }

  addBtn.addEventListener('click', () => openProductForm(null));
  loadProducts();
}

/* --- Orders management --------------------------------------------------- */

const ADMIN_ORDER_STATUSES = ['Order Received', 'Confirmed', 'In Production', 'Quality Check', 'Ready for Delivery', 'Delivered', 'Cancelled'];

async function initAdminOrders() {
  const root = document.getElementById('admin-orders-root');
  if (!root) return;

  const tbody = document.getElementById('orders-table-body');
  const filterSelect = document.getElementById('order-status-filter');

  function statusSelectHtml(order) {
    return `<select class="form-select js-status-select" data-id="${order.id}">
      ${ADMIN_ORDER_STATUSES.map((s) => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
    </select>`;
  }

  function orderRow(order) {
    return `
      <tr data-id="${order.id}">
        <td class="mono">${RaversUtils.escapeHtml(order.orderNumber)}</td>
        <td>${RaversUtils.escapeHtml(order.customerName)}<br><span class="cell-muted">${RaversUtils.escapeHtml(order.email)}</span></td>
        <td class="cell-muted">${RaversUtils.formatDate(order.createdAt)}</td>
        <td class="mono">${RaversUtils.formatCurrency(order.total)}</td>
        <td>${statusSelectHtml(order)}</td>
        <td class="cell-actions"><button type="button" class="link-action js-view-order">View</button></td>
      </tr>
    `;
  }

  async function loadOrders() {
    tbody.innerHTML = '<tr><td colspan="6" class="cell-muted">Loading orders...</td></tr>';
    try {
      const { data } = await RaversAPI.orders.listAll({ status: filterSelect.value });
      tbody.innerHTML = data.orders.length
        ? data.orders.map(orderRow).join('')
        : '<tr><td colspan="6" class="cell-muted">No orders found.</td></tr>';
      bindOrderRowActions();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-muted">${RaversUtils.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function showOrderDetailModal(order) {
    const body = `
      <div class="review-summary" style="margin-bottom:16px;">
        <div class="review-summary__row"><dt>Customer</dt><dd>${RaversUtils.escapeHtml(order.customerName)}</dd></div>
        <div class="review-summary__row"><dt>Email</dt><dd>${RaversUtils.escapeHtml(order.email)}</dd></div>
        <div class="review-summary__row"><dt>Phone</dt><dd>${RaversUtils.escapeHtml(order.phone)}</dd></div>
        <div class="review-summary__row"><dt>Address</dt><dd>${RaversUtils.escapeHtml(order.address)}, ${RaversUtils.escapeHtml(order.city)}, ${RaversUtils.escapeHtml(order.state)}</dd></div>
        ${order.notes ? `<div class="review-summary__row"><dt>Notes</dt><dd>${RaversUtils.escapeHtml(order.notes)}</dd></div>` : ''}
        <div class="review-summary__row"><dt>Payment</dt><dd>${RaversUtils.escapeHtml(order.paymentStatus)}</dd></div>
      </div>
      ${order.items
        .map(
          (item) => `
        <div class="checkout-summary__item">
          <div><p class="checkout-summary__item-name">${RaversUtils.escapeHtml(item.productName)}</p>
          <p class="checkout-summary__item-meta">${item.selectedSize ? `Size ${RaversUtils.escapeHtml(item.selectedSize)} · ` : ''}Qty ${item.quantity}</p></div>
          <p class="mono">${RaversUtils.formatCurrency(item.price * item.quantity)}</p>
        </div>`
        )
        .join('')}
      <div class="summary-row summary-row--total"><span>Total</span><span>${RaversUtils.formatCurrency(order.total)}</span></div>
    `;
    openModal(`Order ${order.orderNumber}`, body);
  }

  function bindOrderRowActions() {
    RaversUtils.qsa('.js-status-select', tbody).forEach((select) => {
      select.addEventListener('change', async () => {
        const id = Number(select.dataset.id);
        try {
          await RaversAPI.orders.updateStatus(id, select.value);
          toastMessage('Order status updated.');
        } catch (err) {
          toastMessage(err.message, 'error');
          loadOrders();
        }
      });
    });
    RaversUtils.qsa('.js-view-order', tbody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('tr').dataset.id);
        const { data } = await RaversAPI.orders.get(id);
        showOrderDetailModal(data.order);
      });
    });
  }

  filterSelect.addEventListener('change', loadOrders);
  loadOrders();
}

/* --- Custom order requests ------------------------------------------------ */

const ADMIN_CUSTOM_STATUSES = ['Submitted', 'Reviewing', 'Quote Sent', 'Approved', 'In Production', 'Completed', 'Cancelled'];

async function initAdminCustomOrders() {
  const root = document.getElementById('admin-custom-orders-root');
  if (!root) return;

  const tbody = document.getElementById('custom-orders-table-body');
  const filterSelect = document.getElementById('custom-order-status-filter');

  function row(order) {
    return `
      <tr data-id="${order.id}">
        <td class="mono">${RaversUtils.escapeHtml(order.referenceNumber)}</td>
        <td>${RaversUtils.escapeHtml(order.customerName)}<br><span class="cell-muted">${RaversUtils.escapeHtml(order.email)}</span></td>
        <td class="cell-muted">${RaversUtils.escapeHtml(order.clothingType)}</td>
        <td class="cell-muted">${RaversUtils.formatDate(order.createdAt)}</td>
        <td><span class="${RaversUtils.statusBadgeClass(order.status)}">${RaversUtils.escapeHtml(order.status)}</span></td>
        <td class="cell-actions"><button type="button" class="link-action js-view-custom-order">Review</button></td>
      </tr>
    `;
  }

  async function loadCustomOrders() {
    tbody.innerHTML = '<tr><td colspan="6" class="cell-muted">Loading requests...</td></tr>';
    try {
      const { data } = await RaversAPI.customOrders.listAll({ status: filterSelect.value });
      tbody.innerHTML = data.customOrders.length
        ? data.customOrders.map(row).join('')
        : '<tr><td colspan="6" class="cell-muted">No requests found.</td></tr>';
      bindActions();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-muted">${RaversUtils.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function showCustomOrderModal(order) {
    const imageHtml = order.referenceImageUrl
      ? `<p><a class="reference-preview-link" href="${fileUrl(order.referenceImageUrl)}" target="_blank" rel="noopener">View reference file &rarr;</a></p>`
      : '<p class="cell-muted">No reference file attached.</p>';

    const body = `
      <div class="review-summary" style="margin-bottom:16px;">
        <div class="review-summary__row"><dt>Customer</dt><dd>${RaversUtils.escapeHtml(order.customerName)}</dd></div>
        <div class="review-summary__row"><dt>Email</dt><dd>${RaversUtils.escapeHtml(order.email)}</dd></div>
        <div class="review-summary__row"><dt>Phone</dt><dd>${RaversUtils.escapeHtml(order.phone)}</dd></div>
        <div class="review-summary__row"><dt>Clothing type</dt><dd>${RaversUtils.escapeHtml(order.clothingType)}</dd></div>
        ${order.size ? `<div class="review-summary__row"><dt>Size</dt><dd>${RaversUtils.escapeHtml(order.size)}</dd></div>` : ''}
        ${order.color ? `<div class="review-summary__row"><dt>Color</dt><dd>${RaversUtils.escapeHtml(order.color)}</dd></div>` : ''}
        ${order.fitStyle ? `<div class="review-summary__row"><dt>Fit / style</dt><dd>${RaversUtils.escapeHtml(order.fitStyle)}</dd></div>` : ''}
        <div class="review-summary__row"><dt>Design</dt><dd>${RaversUtils.escapeHtml(order.designDescription)}</dd></div>
        ${order.designNotes ? `<div class="review-summary__row"><dt>Notes</dt><dd>${RaversUtils.escapeHtml(order.designNotes)}</dd></div>` : ''}
      </div>
      ${imageHtml}
      <form id="custom-order-status-form" style="margin-top:20px;">
        <div class="form-row">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            ${ADMIN_CUSTOM_STATUSES.map((s) => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Estimated price (NGN) <span class="optional">(optional)</span></label>
          <input class="form-input" type="number" min="0" step="0.01" name="estimatedPrice" value="${order.estimatedPrice ?? ''}">
        </div>
        <div class="form-row">
          <label class="form-label">Admin notes <span class="optional">(optional)</span></label>
          <textarea class="form-textarea" name="adminNotes">${RaversUtils.escapeHtml(order.adminNotes || '')}</textarea>
        </div>
        <div id="custom-order-status-error" class="alert alert--error" hidden></div>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" id="custom-order-cancel">Close</button>
          <button type="submit" class="btn btn--primary">Save</button>
        </div>
      </form>
    `;

    openModal(`Custom Request ${order.referenceNumber}`, body);
    document.getElementById('custom-order-cancel').addEventListener('click', closeModal);
    document.getElementById('custom-order-status-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const errorBox = document.getElementById('custom-order-status-error');
      errorBox.hidden = true;
      const submitBtn = form.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true);
      try {
        await RaversAPI.customOrders.updateStatus(order.id, {
          status: form.status.value,
          estimatedPrice: form.estimatedPrice.value ? Number(form.estimatedPrice.value) : undefined,
          adminNotes: form.adminNotes.value.trim(),
        });
        toastMessage('Request updated.');
        closeModal();
        loadCustomOrders();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.hidden = false;
        setButtonLoading(submitBtn, false);
      }
    });
  }

  function bindActions() {
    RaversUtils.qsa('.js-view-custom-order', tbody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('tr').dataset.id);
        const { data } = await RaversAPI.customOrders.get(id);
        showCustomOrderModal(data.customOrder);
      });
    });
  }

  filterSelect.addEventListener('change', loadCustomOrders);
  loadCustomOrders();
}

/* --- Customers ------------------------------------------------------------ */

async function initAdminCustomers() {
  const root = document.getElementById('admin-customers-root');
  if (!root) return;

  const tbody = document.getElementById('customers-table-body');

  function row(c) {
    return `
      <tr data-id="${c.id}">
        <td>${RaversUtils.escapeHtml(c.name)}</td>
        <td class="cell-muted">${RaversUtils.escapeHtml(c.email)}</td>
        <td class="cell-muted">${RaversUtils.formatDate(c.createdAt)}</td>
        <td class="mono">${c.orderCount}</td>
        <td class="mono">${c.customOrderCount}</td>
        <td class="cell-actions"><button type="button" class="link-action js-view-customer">View</button></td>
      </tr>
    `;
  }

  async function loadCustomers() {
    tbody.innerHTML = '<tr><td colspan="6" class="cell-muted">Loading customers...</td></tr>';
    try {
      const { data } = await RaversAPI.admin.customers();
      tbody.innerHTML = data.customers.length
        ? data.customers.map(row).join('')
        : '<tr><td colspan="6" class="cell-muted">No customers yet.</td></tr>';
      bindActions();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="cell-muted">${RaversUtils.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function showCustomerModal(customer) {
    const ordersHtml = customer.orders.length
      ? customer.orders
          .map(
            (o) => `
        <div class="checkout-summary__item">
          <div><p class="checkout-summary__item-name mono">${RaversUtils.escapeHtml(o.orderNumber)}</p>
          <p class="checkout-summary__item-meta">${RaversUtils.formatDate(o.createdAt)} · ${RaversUtils.escapeHtml(o.status)}</p></div>
          <p class="mono">${RaversUtils.formatCurrency(o.total)}</p>
        </div>`
          )
          .join('')
      : '<p class="cell-muted">No orders yet.</p>';

    const customOrdersHtml = customer.customOrders.length
      ? customer.customOrders
          .map(
            (o) => `
        <div class="checkout-summary__item">
          <div><p class="checkout-summary__item-name mono">${RaversUtils.escapeHtml(o.referenceNumber)}</p>
          <p class="checkout-summary__item-meta">${RaversUtils.formatDate(o.createdAt)} · ${RaversUtils.escapeHtml(o.clothingType)}</p></div>
          <span class="${RaversUtils.statusBadgeClass(o.status)}">${RaversUtils.escapeHtml(o.status)}</span>
        </div>`
          )
          .join('')
      : '<p class="cell-muted">No custom requests yet.</p>';

    const body = `
      <div class="review-summary" style="margin-bottom:20px;">
        <div class="review-summary__row"><dt>Email</dt><dd>${RaversUtils.escapeHtml(customer.email)}</dd></div>
        <div class="review-summary__row"><dt>Joined</dt><dd>${RaversUtils.formatDate(customer.createdAt)}</dd></div>
      </div>
      <h4>Orders</h4>
      ${ordersHtml}
      <h4 style="margin-top:20px;">Custom Requests</h4>
      ${customOrdersHtml}
    `;
    openModal(customer.name, body);
  }

  function bindActions() {
    RaversUtils.qsa('.js-view-customer', tbody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('tr').dataset.id);
        const { data } = await RaversAPI.admin.customer(id);
        showCustomerModal(data.customer);
      });
    });
  }

  loadCustomers();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!initAdminShell()) return;
  initAdminDashboard();
  initAdminProducts();
  initAdminOrders();
  initAdminCustomOrders();
  initAdminCustomers();
});
