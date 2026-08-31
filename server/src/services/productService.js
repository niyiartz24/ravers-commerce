const { pool } = require('../config/db');
const { AppError } = require('../utils/errors');

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(name, ignoreId = null) {
  const base = slugify(name) || 'product';
  let candidate = base;
  let suffix = 1;

  /* eslint-disable no-await-in-loop */
  while (true) {
    const { rows } = await pool.query(
      ignoreId
        ? 'SELECT id FROM products WHERE slug = $1 AND id != $2'
        : 'SELECT id FROM products WHERE slug = $1',
      ignoreId ? [candidate, ignoreId] : [candidate]
    );
    if (rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  /* eslint-enable no-await-in-loop */
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    imageUrl: row.image_url,
    sizes: row.sizes,
    material: row.material,
    featured: row.featured,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function list({ search, category, featured, limit, excludeId } = {}) {
  const conditions = ['is_active = TRUE'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (featured === true) {
    conditions.push('featured = TRUE');
  }
  if (excludeId) {
    params.push(excludeId);
    conditions.push(`id != $${params.length}`);
  }

  let query = `SELECT * FROM products WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;

  if (limit) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
  }

  const { rows } = await pool.query(query, params);
  return rows.map(mapProduct);
}

/** Admin listing — includes inactive products, no default limit. */
async function listAllForAdmin() {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
  return rows.map(mapProduct);
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (rows.length === 0) {
    throw new AppError('Product not found.', 404);
  }
  return mapProduct(rows[0]);
}

async function create(data) {
  const slug = await uniqueSlug(data.name);

  const { rows } = await pool.query(
    `INSERT INTO products (name, slug, description, price, category, image_url, sizes, material, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.name,
      slug,
      data.description || '',
      data.price,
      data.category,
      data.imageUrl || '',
      data.sizes || [],
      data.material || '',
      Boolean(data.featured),
    ]
  );

  return mapProduct(rows[0]);
}

async function update(id, data) {
  await getById(id); // 404s if missing

  const slug = data.name ? await uniqueSlug(data.name, id) : undefined;

  const fields = [];
  const params = [];
  let i = 1;

  const set = (column, value) => {
    fields.push(`${column} = $${i}`);
    params.push(value);
    i += 1;
  };

  if (data.name !== undefined) set('name', data.name);
  if (slug) set('slug', slug);
  if (data.description !== undefined) set('description', data.description);
  if (data.price !== undefined) set('price', data.price);
  if (data.category !== undefined) set('category', data.category);
  if (data.imageUrl !== undefined) set('image_url', data.imageUrl);
  if (data.sizes !== undefined) set('sizes', data.sizes);
  if (data.material !== undefined) set('material', data.material);
  if (data.featured !== undefined) set('featured', Boolean(data.featured));
  if (data.isActive !== undefined) set('is_active', Boolean(data.isActive));

  set('updated_at', new Date());
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );

  return mapProduct(rows[0]);
}

async function remove(id) {
  await getById(id); // 404s if missing
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
}

module.exports = { list, listAllForAdmin, getById, create, update, remove, mapProduct };
