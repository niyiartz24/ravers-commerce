const { pool } = require('../config/db');
const { AppError } = require('../utils/errors');
const orderService = require('./orderService');
const customOrderService = require('./customOrderService');

async function dashboard() {
  const [orderStats, totalCustomRequests, recent] = await Promise.all([
    orderService.dashboardStats(),
    customOrderService.totalCount(),
    orderService.recentOrders(5),
  ]);

  return {
    totalOrders: orderStats.total_orders,
    pendingOrders: orderStats.pending_orders,
    ordersInProduction: orderStats.orders_in_production,
    totalCustomRequests,
    recentOrders: recent,
  };
}

function mapCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    orderCount: Number(row.order_count),
    customOrderCount: Number(row.custom_order_count),
  };
}

async function listCustomers() {
  const { rows } = await pool.query(`
    SELECT
      u.id, u.name, u.email, u.created_at,
      COUNT(DISTINCT o.id) AS order_count,
      COUNT(DISTINCT c.id) AS custom_order_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    LEFT JOIN custom_orders c ON c.user_id = u.id
    WHERE u.role = 'CUSTOMER'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return rows.map(mapCustomer);
}

async function getCustomer(id) {
  const { rows } = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = $1 AND role = 'CUSTOMER'",
    [id]
  );
  if (rows.length === 0) {
    throw new AppError('Customer not found.', 404);
  }

  const [orders, customOrders] = await Promise.all([
    orderService.myOrders(id),
    customOrderService.myRequests(id),
  ]);

  return {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    createdAt: rows[0].created_at,
    orders,
    customOrders,
  };
}

module.exports = { dashboard, listCustomers, getCustomer };
