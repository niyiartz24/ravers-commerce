/**
 * Session storage + auth guards + login/register form wiring.
 * Loaded on every page (after api.js) so nav state stays in sync.
 */

const USER_KEY = 'ravers_user';

const RaversAuth = {
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  },

  isLoggedIn() {
    return Boolean(getToken() && this.getUser());
  },

  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'ADMIN');
  },

  setSession(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  },

  /** Call on account.html — bounces guests to login. */
  requireAuth() {
    if (!this.isLoggedIn()) {
      const next = encodeURIComponent(window.location.pathname.split('/').pop());
      window.location.href = `login.html?redirect=${next}`;
      return false;
    }
    return true;
  },

  /** Call on every admin/*.html page. */
  requireAdmin() {
    if (!this.isLoggedIn()) {
      window.location.href = '../login.html?redirect=admin';
      return false;
    }
    if (!this.isAdmin()) {
      window.location.href = '../account.html';
      return false;
    }
    return true;
  },
};

function updateNavAuthState() {
  const accountLink = document.getElementById('account-link');
  if (!accountLink) return;
  const user = RaversAuth.getUser();
  if (user) {
    accountLink.href = 'account.html';
    accountLink.innerHTML = `<span class="account-label">${RaversUtils.escapeHtml(user.name.split(' ')[0])}</span>`;
  } else {
    accountLink.href = 'login.html';
    accountLink.innerHTML = '<span class="account-label">Account</span>';
  }
}

function bindFormError(form) {
  let banner = form.querySelector('.js-form-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'alert alert--error js-form-error';
    banner.hidden = true;
    banner.setAttribute('role', 'alert');
    form.prepend(banner);
  }
  return {
    show(message) {
      banner.textContent = message;
      banner.hidden = false;
    },
    hide() {
      banner.hidden = true;
    },
  };
}

function setButtonLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle('btn--loading', loading);
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  const errorBox = bindFormError(form);
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hide();
    setButtonLoading(submitBtn, true);

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      const { data } = await RaversAPI.auth.login({ email, password });
      RaversAuth.setSession(data.user, data.token);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      window.location.href = redirect === 'admin' ? 'admin/index.html' : redirect ? `${redirect}.html` : 'account.html';
    } catch (err) {
      errorBox.show(err.message);
      setButtonLoading(submitBtn, false);
    }
  });
}

function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;
  const errorBox = bindFormError(form);
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hide();

    if (form.password.value !== form.confirmPassword.value) {
      errorBox.show('Passwords do not match.');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      const { data } = await RaversAPI.auth.register({
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
      });
      RaversAuth.setSession(data.user, data.token);
      window.location.href = 'account.html';
    } catch (err) {
      errorBox.show(err.message);
      setButtonLoading(submitBtn, false);
    }
  });
}

function initLogoutButtons() {
  RaversUtils.qsa('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', () => RaversAuth.logout());
  });
}

function initMobileNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

/* --- Account page ---------------------------------------------------------- */

function orderSummaryCard(order) {
  return `
    <div class="order-summary-card">
      <div class="order-summary-card__head">
        <div>
          <p class="order-summary-card__number">${RaversUtils.escapeHtml(order.orderNumber)}</p>
          <p class="order-summary-card__date">${RaversUtils.formatDate(order.createdAt)}</p>
        </div>
        <span class="${RaversUtils.statusBadgeClass(order.status)}">${RaversUtils.escapeHtml(order.status)}</span>
      </div>
      <p class="order-summary-card__total">${RaversUtils.formatCurrency(order.total)}</p>
    </div>
  `;
}

function customOrderSummaryCard(order) {
  return `
    <div class="order-summary-card">
      <div class="order-summary-card__head">
        <div>
          <p class="order-summary-card__number">${RaversUtils.escapeHtml(order.referenceNumber)}</p>
          <p class="order-summary-card__date">${RaversUtils.formatDate(order.createdAt)} &middot; ${RaversUtils.escapeHtml(order.clothingType)}</p>
        </div>
        <span class="${RaversUtils.statusBadgeClass(order.status)}">${RaversUtils.escapeHtml(order.status)}</span>
      </div>
      ${order.estimatedPrice ? `<p class="order-summary-card__total">${RaversUtils.formatCurrency(order.estimatedPrice)}</p>` : ''}
    </div>
  `;
}

async function loadAccountOrders() {
  const list = document.getElementById('account-orders-list');
  if (!list) return;
  try {
    const { data } = await RaversAPI.orders.myOrders();
    list.innerHTML = data.orders.length
      ? data.orders.map(orderSummaryCard).join('')
      : '<div class="empty-state"><h3>No orders yet</h3><p>Your ready-made orders will show up here.</p></div>';
  } catch (err) {
    list.innerHTML = `<p class="text-muted">${RaversUtils.escapeHtml(err.message)}</p>`;
  }
}

async function loadAccountCustomOrders() {
  const list = document.getElementById('account-custom-orders-list');
  if (!list) return;
  try {
    const { data } = await RaversAPI.customOrders.myRequests();
    list.innerHTML = data.customOrders.length
      ? data.customOrders.map(customOrderSummaryCard).join('')
      : '<div class="empty-state"><h3>No custom requests yet</h3><p>Start one in the Custom Studio.</p></div>';
  } catch (err) {
    list.innerHTML = `<p class="text-muted">${RaversUtils.escapeHtml(err.message)}</p>`;
  }
}

function initAccountPage() {
  const root = document.getElementById('account-root');
  if (!root) return;
  if (!RaversAuth.requireAuth()) return;

  const user = RaversAuth.getUser();
  document.getElementById('account-name').textContent = user.name;
  document.getElementById('account-email').textContent = user.email;
  document.getElementById('account-joined').textContent = RaversUtils.formatDate(user.createdAt);

  const navButtons = RaversUtils.qsa('.account-nav button[data-panel]');
  const panels = RaversUtils.qsa('.account-panel');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      navButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === btn.dataset.panel));
    });
  });

  loadAccountOrders();
  loadAccountCustomOrders();
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavAuthState();
  initLoginForm();
  initRegisterForm();
  initLogoutButtons();
  initMobileNavToggle();
  initAccountPage();
});
