/**
 * RAVERS API client.
 *
 * API_BASE_URL resolution:
 *  - localhost / 127.0.0.1  -> local backend on port 5000
 *  - anything else          -> window.RAVERS_API_BASE_URL if you've set one
 *                              (e.g. in a small inline <script> before this
 *                              file), otherwise falls back to `${origin}/api`
 *
 * When the frontend (Netlify) and backend (Render/Railway) are on different
 * domains, set window.RAVERS_API_BASE_URL to your backend's full API URL,
 * e.g. window.RAVERS_API_BASE_URL = "https://ravers-api.onrender.com/api";
 */
const API_BASE_URL = (() => {
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return window.RAVERS_API_BASE_URL || `${origin}/api`;
})();

const TOKEN_KEY = 'ravers_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, isFormData = false, auth = true } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // No JSON body (e.g. a static file 404) — fall through with data = null.
  }

  if (!response.ok) {
    const message = (data && data.message) || `Request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

const RaversAPI = {
  baseUrl: API_BASE_URL,

  auth: {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
    me: () => request('/auth/me'),
  },

  products: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.set(key, value);
      });
      const qs = query.toString();
      return request(`/products${qs ? `?${qs}` : ''}`, { auth: false });
    },
    get: (id) => request(`/products/${id}`, { auth: false }),
    adminList: () => request('/products/admin/all'),
    create: (payload) => request('/products', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  },

  orders: {
    create: (payload) => request('/orders', { method: 'POST', body: payload, auth: true }),
    get: (id) => request(`/orders/${id}`),
    myOrders: () => request('/orders/my-orders'),
    listAll: (params = {}) => {
      const qs = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
      return request(`/orders${qs}`);
    },
    updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    track: (reference, email) => request('/orders/track', { method: 'POST', body: { reference, email }, auth: false }),
    verifyPayment: (reference) => request('/orders/verify-payment', { method: 'POST', body: { reference }, auth: false }),
  },

  customOrders: {
    submit: (formData) => request('/custom-orders', { method: 'POST', body: formData, isFormData: true, auth: true }),
    myRequests: () => request('/custom-orders/my-requests'),
    listAll: (params = {}) => {
      const qs = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
      return request(`/custom-orders${qs}`);
    },
    get: (id) => request(`/custom-orders/${id}`),
    updateStatus: (id, payload) => request(`/custom-orders/${id}/status`, { method: 'PATCH', body: payload }),
  },

  admin: {
    dashboard: () => request('/admin/dashboard'),
    customers: () => request('/admin/customers'),
    customer: (id) => request(`/admin/customers/${id}`),
  },
};

function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${RaversAPI.baseUrl.replace(/\/api$/, '')}${path}`;
}

const RaversUtils = {
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  },
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  },
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str === undefined || str === null ? '' : str;
    return div.innerHTML;
  },
  debounce(fn, wait = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
  statusBadgeClass(status) {
    const map = {
      'Order Received': 'received',
      Confirmed: 'confirmed',
      'In Production': 'production',
      'Quality Check': 'quality',
      'Ready for Delivery': 'ready',
      Delivered: 'delivered',
      Cancelled: 'cancelled',
      Submitted: 'submitted',
      Reviewing: 'reviewing',
      'Quote Sent': 'quote',
      Approved: 'approved',
      Completed: 'completed',
    };
    return `status-badge status-badge--${map[status] || 'received'}`;
  },
  qs(selector, scope = document) {
    return scope.querySelector(selector);
  },
  qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  },
};
