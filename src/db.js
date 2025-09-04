const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'Product_DB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

let pool; // will be initialized after ensuring DB exists

async function query(text, params) {
  if (!pool) throw new Error('DB pool not initialized');
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

async function ensureDatabase() {
  // Connect to default 'postgres' DB to check/create our target DB
  const adminPool = new Pool({
    host: cfg.host,
    port: cfg.port,
    database: 'postgres',
    user: cfg.user,
    password: cfg.password,
  });
  try {
    const client = await adminPool.connect();
    try {
      const dbName = cfg.database;
      const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (check.rowCount === 0) {
        await client.query(`CREATE DATABASE "${dbName}"`);
        console.log(`Created database ${dbName}`);
      }
    } finally {
      client.release();
    }
  } finally {
    await adminPool.end();
  }
}

async function createTables() {
  // Users: id, email, password, is_admin, created_at
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Products: id, name, description, price, stock, created_at, updated_at
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@local.test';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const { rows } = await query('SELECT COUNT(*)::int AS count FROM users WHERE is_admin = TRUE');
  if (rows[0].count > 0) return; // Already have an admin

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (email, password, is_admin) VALUES ($1, $2, TRUE)',
    [email, passwordHash]
  );
  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: ${email} / ${password}`);
}

async function initDb() {
  // Ensure DB exists, then create pool to it
  await ensureDatabase();
  pool = new Pool(cfg);
  await createTables();
  await seedAdmin();
}

module.exports = {
  query,
  initDb,
};
