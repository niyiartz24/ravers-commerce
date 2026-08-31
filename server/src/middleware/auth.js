const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../utils/errors');
const { pool } = require('../config/db');

/**
 * Verifies the JWT on the Authorization header and attaches the current
 * user (id, name, email, role) to req.user. Rejects with 401 if missing
 * or invalid.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('You must be logged in to do that.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Your session has expired. Please log in again.', 401);
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [payload.id]
  );

  if (rows.length === 0) {
    throw new AppError('Account no longer exists.', 401);
  }

  req.user = rows[0];
  next();
});

/**
 * Like authenticate, but does not fail when no token is present — used on
 * routes that behave differently for guests vs signed-in users (checkout).
 */
const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [payload.id]
    );
    req.user = rows[0] || null;
  } catch (err) {
    req.user = null;
  }

  next();
});

/** Requires authenticate to have run first. */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Admin access required.', 403));
  }
  next();
}

module.exports = { authenticate, attachUserIfPresent, requireAdmin };
