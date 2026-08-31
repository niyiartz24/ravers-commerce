const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { AppError } = require('../utils/errors');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

async function register({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    throw new AppError('An account with that email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'CUSTOMER')
     RETURNING id, name, email, role, created_at`,
    [name.trim(), normalizedEmail, passwordHash]
  );

  const user = rows[0];
  return { user: publicUser(user), token: signToken(user) };
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  if (rows.length === 0) {
    throw new AppError('Incorrect email or password.', 401);
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new AppError('Incorrect email or password.', 401);
  }

  return { user: publicUser(user), token: signToken(user) };
}

module.exports = { register, login, publicUser };
