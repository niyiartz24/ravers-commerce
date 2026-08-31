const { pool } = require('../config/db');
const { AppError } = require('../utils/errors');
const { generateUniqueCode } = require('./referenceNumber');

function mapCustomOrder(row) {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    userId: row.user_id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    clothingType: row.clothing_type,
    size: row.size,
    color: row.color,
    fitStyle: row.fit_style,
    designDescription: row.design_description,
    designNotes: row.design_notes,
    referenceImageUrl: row.reference_image_url,
    status: row.status,
    estimatedPrice: row.estimated_price === null ? null : Number(row.estimated_price),
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
  };
}

async function referenceExists(code) {
  const { rows } = await pool.query('SELECT 1 FROM custom_orders WHERE reference_number = $1', [code]);
  return rows.length > 0;
}

async function create(data) {
  const referenceNumber = await generateUniqueCode('RAVC', referenceExists);

  const { rows } = await pool.query(
    `INSERT INTO custom_orders
      (reference_number, user_id, customer_name, email, phone, clothing_type, size, color,
       fit_style, design_description, design_notes, reference_image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      referenceNumber,
      data.userId || null,
      data.customerName,
      data.email.trim().toLowerCase(),
      data.phone,
      data.clothingType,
      data.size || '',
      data.color || '',
      data.fitStyle || '',
      data.designDescription,
      data.designNotes || '',
      data.referenceImageUrl || null,
    ]
  );

  return mapCustomOrder(rows[0]);
}

async function getById(id, { userId, isAdmin } = {}) {
  const { rows } = await pool.query('SELECT * FROM custom_orders WHERE id = $1', [id]);
  if (rows.length === 0) {
    throw new AppError('Custom order request not found.', 404);
  }
  const row = rows[0];
  if (!isAdmin && userId && row.user_id !== userId) {
    throw new AppError('You do not have access to this request.', 403);
  }
  return mapCustomOrder(row);
}

async function myRequests(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM custom_orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(mapCustomOrder);
}

async function listAllForAdmin({ status } = {}) {
  const params = [];
  let query = 'SELECT * FROM custom_orders';
  if (status) {
    params.push(status);
    query += ` WHERE status = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  return rows.map(mapCustomOrder);
}

async function updateStatus(id, { status, estimatedPrice, adminNotes }) {
  const fields = [];
  const params = [];
  let i = 1;

  const set = (column, value) => {
    fields.push(`${column} = $${i}`);
    params.push(value);
    i += 1;
  };

  if (status !== undefined) set('status', status);
  if (estimatedPrice !== undefined) set('estimated_price', estimatedPrice);
  if (adminNotes !== undefined) set('admin_notes', adminNotes);
  set('updated_at', new Date());

  params.push(id);

  const { rows } = await pool.query(
    `UPDATE custom_orders SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    params
  );
  if (rows.length === 0) {
    throw new AppError('Custom order request not found.', 404);
  }
  return mapCustomOrder(rows[0]);
}

async function track(referenceNumber, email) {
  const { rows } = await pool.query(
    'SELECT * FROM custom_orders WHERE reference_number = $1 AND LOWER(email) = LOWER($2)',
    [referenceNumber, email]
  );
  if (rows.length === 0) return null;
  return mapCustomOrder(rows[0]);
}

async function totalCount() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM custom_orders');
  return rows[0].count;
}

module.exports = {
  create,
  getById,
  myRequests,
  listAllForAdmin,
  updateStatus,
  track,
  totalCount,
  mapCustomOrder,
};
