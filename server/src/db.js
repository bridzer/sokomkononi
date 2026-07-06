const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'kalro_farm',
    });

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
