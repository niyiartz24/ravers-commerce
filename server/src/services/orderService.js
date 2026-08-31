const { pool } = require('../config/db');
const { AppError } = require('../utils/errors');
const { generateUniqueCode } = require('./referenceNumber');

const DELIVERY_FEE = 3500; // flat placeholder — swap for a real rates table/API later

function mapOrder(row, items = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    notes: row.notes,
    status: row.status,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    paymentStatus: row.payment_status,
    paymentReference: row.payment_reference,
    createdAt: row.created_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      price: Number(item.price),
      quantity: item.quantity,
      selectedSize: item.selected_size,
    })),
  };
}

async function orderNumberExists(code) {
  const { rows } = await pool.query('SELECT 1 FROM orders WHERE order_number = $1', [code]);
  return rows.length > 0;
}

/**
 * Creates an order + its line items in a single transaction. Prices are
 * always re-read from the products table server-side — client-submitted
 * prices are never trusted.
 */
async function create({ items, customer, userId }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resolvedItems = [];
    let subtotal = 0;

    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      const { rows } = await client.query(
        'SELECT id, name, price, sizes FROM products WHERE id = $1 AND is_active = TRUE',
        [item.productId]
      );
      if (rows.length === 0) {
        throw new AppError(`One of the items in your cart is no longer available.`, 400);
      }
      const product = rows[0];
      const quantity = Number(item.quantity) || 1;
      if (quantity < 1) {
        throw new AppError('Quantity must be at least 1.', 400);
      }
      const lineTotal = Number(product.price) * quantity;
      subtotal += lineTotal;

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        price: Number(product.price),
        quantity,
        selectedSize: item.selectedSize || '',
      });
    }

    const total = subtotal + DELIVERY_FEE;
    const orderNumber = await generateUniqueCode('RAV', orderNumberExists);

    const orderResult = await client.query(
      `INSERT INTO orders
        (order_number, user_id, customer_name, email, phone, address, city, state, notes, subtotal, delivery_fee, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        orderNumber,
        userId || null,
        customer.name,
        customer.email.trim().toLowerCase(),
        customer.phone,
        customer.address,
        customer.city,
        customer.state,
        customer.notes || '',
        subtotal,
        DELIVERY_FEE,
        total,
      ]
    );
    const order = orderResult.rows[0];

    for (const item of resolvedItems) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, selected_size)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId, item.productName, item.price, item.quantity, item.selectedSize]
      );
    }

    await client.query('COMMIT');
    const insertedItems = await getItemsFor(order.id);
    return mapOrder(order, insertedItems);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getItemsFor(orderId) {
  const { rows } = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [orderId]);
  return rows;
}

async function getById(id, { userId, isAdmin } = {}) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (rows.length === 0) {
    throw new AppError('Order not found.', 404);
  }
  const order = rows[0];
  if (!isAdmin && userId && order.user_id !== userId) {
    throw new AppError('You do not have access to this order.', 403);
  }
  const items = await getItemsFor(order.id);
  return mapOrder(order, items);
}

async function myOrders(userId) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  const results = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const items = await getItemsFor(row.id);
    results.push(mapOrder(row, items));
  }
  return results;
}

async function listAllForAdmin({ status } = {}) {
  const params = [];
  let query = 'SELECT * FROM orders';
  if (status) {
    params.push(status);
    query += ` WHERE status = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  return rows.map((row) => mapOrder(row));
}

async function updateStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (rows.length === 0) {
    throw new AppError('Order not found.', 404);
  }
  const items = await getItemsFor(id);
  return mapOrder(rows[0], items);
}

async function markPaid(id, paymentReference) {
  const { rows } = await pool.query(
    `UPDATE orders SET payment_status = 'paid', payment_reference = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [paymentReference, id]
  );
  return rows[0];
}

/** Called right after Paystack's initialize call succeeds, so the pending
 *  reference can be looked back up once the customer returns from checkout. */
async function setPendingPaymentReference(id, paymentReference) {
  await pool.query(
    'UPDATE orders SET payment_reference = $1, updated_at = NOW() WHERE id = $2',
    [paymentReference, id]
  );
}

async function findByPaymentReference(reference) {
  const { rows } = await pool.query('SELECT * FROM orders WHERE payment_reference = $1', [reference]);
  if (rows.length === 0) return null;
  const items = await getItemsFor(rows[0].id);
  return mapOrder(rows[0], items);
}

async function track(orderNumber, email) {
  const { rows } = await pool.query(
    'SELECT * FROM orders WHERE order_number = $1 AND LOWER(email) = LOWER($2)',
    [orderNumber, email]
  );
  if (rows.length === 0) return null;
  const items = await getItemsFor(rows[0].id);
  return mapOrder(rows[0], items);
}

async function dashboardStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE status = 'Order Received')::int AS pending_orders,
      COUNT(*) FILTER (WHERE status = 'In Production')::int AS orders_in_production
    FROM orders
  `);
  return rows[0];
}

async function recentOrders(limit = 5) {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows.map((row) => mapOrder(row));
}

module.exports = {
  create,
  getById,
  myOrders,
  listAllForAdmin,
  updateStatus,
  markPaid,
  setPendingPaymentReference,
  findByPaymentReference,
  track,
  dashboardStats,
  recentOrders,
  DELIVERY_FEE,
};
