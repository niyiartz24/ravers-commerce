/**
 * Product catalog rendering: home page featured strip, shop grid with
 * search/category filtering, and the product detail page.
 */

function productCardMarkup(product) {
  return `
    <a class="product-card" href="product.html?id=${product.id}">
      <div class="product-card__image-wrap">
        <img src="${RaversUtils.escapeHtml(product.imageUrl)}" alt="${RaversUtils.escapeHtml(product.name)}" loading="lazy">
        <span class="product-card__view">View Product</span>
      </div>
      <p class="product-card__category">${RaversUtils.escapeHtml(product.category)}</p>
      <p class="product-card__name">${RaversUtils.escapeHtml(product.name)}</p>
      <p class="product-card__price">${RaversUtils.formatCurrency(product.price)}</p>
    </a>
  `;
}

function gridSkeletonMarkup(count) {
  return Array.from({ length: count })
    .map(
      () => `
      <div>
        <div class="skeleton" style="aspect-ratio:4/5;margin-bottom:12px;"></div>
        <div class="skeleton" style="height:12px;width:60%;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:14px;width:80%;"></div>
      </div>`
    )
    .join('');
}

/* --- Home page: featured products ---------------------------------------- */

async function renderFeaturedProducts() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  grid.innerHTML = gridSkeletonMarkup(4);

  try {
    const { data } = await RaversAPI.products.list({ featured: true, limit: 4 });
    if (data.products.length === 0) {
      grid.innerHTML = '<p class="text-muted">New pieces are on the way — check back soon.</p>';
      return;
    }
    grid.innerHTML = data.products.map(productCardMarkup).join('');
  } catch (err) {
    grid.innerHTML = `<p class="text-muted">Could not load products: ${RaversUtils.escapeHtml(err.message)}</p>`;
  }
}

/* --- Shop page ------------------------------------------------------------ */

function initShopPage() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const searchInput = document.getElementById('shop-search-input');
  const countEl = document.getElementById('product-count');
  const emptyEl = document.getElementById('shop-empty');
  const filterButtons = RaversUtils.qsa('.js-category-filter');

  const state = { search: '', category: '' };

  async function load() {
    grid.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    grid.innerHTML = gridSkeletonMarkup(8);

    try {
      const { data } = await RaversAPI.products.list({ search: state.search, category: state.category });
      if (countEl) {
        countEl.textContent = `${data.count} ${data.count === 1 ? 'product' : 'products'}`;
      }
      if (data.products.length === 0) {
        grid.hidden = true;
        if (emptyEl) emptyEl.hidden = false;
        return;
      }
      grid.innerHTML = data.products.map(productCardMarkup).join('');
    } catch (err) {
      grid.innerHTML = `<p class="text-muted">Could not load products: ${RaversUtils.escapeHtml(err.message)}</p>`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      RaversUtils.debounce((e) => {
        state.search = e.target.value.trim();
        load();
      }, 350)
    );
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      state.category = btn.dataset.category || '';
      load();
    });
  });

  // Support ?category= deep link from the home page category teasers, if any.
  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get('category');
  if (initialCategory) {
    state.category = initialCategory;
    const match = filterButtons.find((b) => b.dataset.category === initialCategory);
    if (match) {
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      match.setAttribute('aria-pressed', 'true');
    }
  }

  load();
}

/* --- Product detail page --------------------------------------------------- */

function initProductDetailPage() {
  const root = document.getElementById('product-detail-root');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    root.innerHTML = '<div class="empty-state"><h3>Product not found</h3><p>No product was specified.</p></div>';
    return;
  }

  loadProduct(Number(productId));
}

let selectedSize = '';
let selectedQty = 1;

async function loadProduct(id) {
  const root = document.getElementById('product-detail-root');

  try {
    const { data } = await RaversAPI.products.get(id);
    renderProductDetail(data.product);
    loadRelatedProducts(data.product);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Product not found</h3><p>${RaversUtils.escapeHtml(err.message)}</p></div>`;
  }
}

function renderProductDetail(product) {
  document.title = `${product.name} — RAVERS`;

  selectedSize = product.sizes[0] || '';
  selectedQty = 1;

  const sizeButtons = product.sizes
    .map(
      (size, i) => `<button type="button" class="choice-pill js-size-btn" data-size="${RaversUtils.escapeHtml(size)}" aria-pressed="${i === 0}">${RaversUtils.escapeHtml(size)}</button>`
    )
    .join('');

  document.getElementById('product-detail-root').innerHTML = `
    <div class="product-detail">
      <div class="product-detail__image-wrap">
        <img src="${RaversUtils.escapeHtml(product.imageUrl)}" alt="${RaversUtils.escapeHtml(product.name)}">
      </div>
      <div class="product-detail__info">
        <p class="eyebrow product-detail__category">${RaversUtils.escapeHtml(product.category)}</p>
        <h1>${RaversUtils.escapeHtml(product.name)}</h1>
        <p class="product-detail__price">${RaversUtils.formatCurrency(product.price)}</p>
        <p class="product-detail__description">${RaversUtils.escapeHtml(product.description)}</p>

        ${
          product.sizes.length
            ? `<div class="product-detail__section">
                <span class="form-label">Size</span>
                <div class="choice-group" id="size-picker">${sizeButtons}</div>
              </div>`
            : ''
        }

        <div class="product-detail__section">
          <span class="form-label">Quantity</span>
          <div class="qty-control">
            <button type="button" id="detail-qty-decrease" aria-label="Decrease quantity">&minus;</button>
            <input type="text" id="detail-qty-input" value="1" inputmode="numeric" aria-label="Quantity" readonly>
            <button type="button" id="detail-qty-increase" aria-label="Increase quantity">&plus;</button>
          </div>
        </div>

        <div class="product-detail__actions">
          <button type="button" class="btn btn--primary" id="add-to-cart-btn">Add to Cart</button>
          <span id="add-to-cart-feedback" class="text-muted" style="font-size:0.875rem;" hidden>Added to cart</span>
        </div>

        <div class="product-detail__meta">
          <dl>
            <dt>Material</dt>
            <dd>${RaversUtils.escapeHtml(product.material || 'Details on request')}</dd>
          </dl>
        </div>
      </div>
    </div>
  `;

  RaversUtils.qsa('.js-size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      RaversUtils.qsa('.js-size-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      selectedSize = btn.dataset.size;
    });
  });

  const qtyInput = document.getElementById('detail-qty-input');
  document.getElementById('detail-qty-decrease').addEventListener('click', () => {
    selectedQty = Math.max(1, selectedQty - 1);
    qtyInput.value = selectedQty;
  });
  document.getElementById('detail-qty-increase').addEventListener('click', () => {
    selectedQty += 1;
    qtyInput.value = selectedQty;
  });

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    RaversCart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      size: selectedSize,
      quantity: selectedQty,
    });
    const feedback = document.getElementById('add-to-cart-feedback');
    feedback.hidden = false;
    setTimeout(() => {
      feedback.hidden = true;
    }, 2000);
  });
}

async function loadRelatedProducts(product) {
  const section = document.getElementById('related-products');
  const grid = document.getElementById('related-grid');
  if (!section || !grid) return;

  try {
    const { data } = await RaversAPI.products.list({ category: product.category, exclude: product.id, limit: 4 });
    if (data.products.length === 0) {
      section.hidden = true;
      return;
    }
    grid.innerHTML = data.products.map(productCardMarkup).join('');
    section.hidden = false;
  } catch (err) {
    section.hidden = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedProducts();
  initShopPage();
  initProductDetailPage();
});
