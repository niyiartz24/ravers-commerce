/**
 * Creates (or promotes/updates) the initial admin account from environment
 * variables. Run with: npm run create-admin
 *
 * Required env vars: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function run() {
  const name = process.env.ADMIN_NAME;
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must all be set in server/.env');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE users SET name = $1, password_hash = $2, role = 'ADMIN' WHERE email = $3",
      [name, passwordHash, email]
    );
    console.log(`Existing account for ${email} updated and promoted to ADMIN.`);
  } else {
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN')",
      [name, email, passwordHash]
    );
    console.log(`Admin account created for ${email}.`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error('Failed to create admin account:', err.message);
  process.exit(1);
});
