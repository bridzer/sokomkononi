const { Pool } = require('pg');
require('dotenv').config();

/**
 * Railway / cloud proxies often idle-kill TCP connections. Tune the pool so
 * dead clients are recycled quickly instead of crashing the process on ECONNRESET.
 */
function buildPoolConfig() {
  const connectionString = (process.env.DATABASE_URL || '').trim();
  const isRemote =
    Boolean(connectionString) &&
    !/localhost|127\.0\.0\.1/i.test(connectionString);

  const base = {
    max: Number(process.env.PG_POOL_MAX) || 8,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 10_000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 15_000,
    allowExitOnIdle: true,
  };

  if (connectionString) {
    const needsSsl =
      isRemote ||
      /sslmode=require/i.test(connectionString) ||
      process.env.PGSSL === 'true';
    return {
      ...base,
      connectionString,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }

  return {
    ...base,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'kalro_farm',
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  // Idle client dropped by proxy — log and let the pool replace it.
  console.error('[pg] Idle client error (pool will recycle):', err.code || err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

/** Acquire a client with a clear error if the DB is unreachable. */
async function withClient(fn) {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    err.status = 503;
    err.expose = true;
    err.message =
      'Database temporarily unavailable. Please try again in a moment.';
    throw err;
  }
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withClient };
