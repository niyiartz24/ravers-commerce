const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // Fail fast and loud rather than letting every query error out later.
  throw new Error('DATABASE_URL is not set. Copy .env.example to server/.env and fill it in.');
}

const useSSL = String(process.env.DATABASE_SSL).toLowerCase() === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Errors on idle clients — log and keep the process alive.
  console.error('Unexpected database error on idle client', err);
});

module.exports = { pool };
