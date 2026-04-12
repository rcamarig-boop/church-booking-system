require('dotenv').config();
const { Pool } = require('pg');

const DEFAULT_MAX_SLOTS = 5;

// Create connection pool for Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  family: 4,
  ssl: {
    rejectUnauthorized: false
  },
  // Limit the pool size to avoid overwhelming Supabase
  max: 5,
  // Always keep at least 2 warm connections so parallel dashboard requests
  // don't each pay the ~700-900 ms TCP+SSL+Postgres handshake on every page load.
  min: 2,
  // Keep idle connections alive so Supabase/Render don't silently drop them
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Release idle connections after 5 min (Supabase idles out at ~5 min, so
  // this avoids churn while still cleaning up truly unused connections).
  idleTimeoutMillis: 300000,
  // Fail fast when a new connection cannot be established
  connectionTimeoutMillis: 10000
});

// Prevent an unexpected pool error from crashing the process
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// Heartbeat: run a lightweight query every 4 minutes so neither the pool nor
// Supabase drops the minimum connections during periods of server inactivity.
// unref() lets the process exit normally without waiting for this timer.
const heartbeatInterval = setInterval(() => {
  pool.query('SELECT 1').catch(err => {
    console.error('DB heartbeat failed:', err.message);
  });
}, 4 * 60 * 1000);
heartbeatInterval.unref();

// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql, params) {
  if (!params || params.length === 0) {
    return { sql, params };
  }
  
  let paramIndex = 0;
  const newSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
  return { sql: newSql, params };
}

// Wrapper functions to match original API
const prepare = (sql) => {
  return {
    get: async (...params) => {
      const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
      const result = await pool.query(convertedSql, convertedParams);
      return result.rows[0] || null;
    },
    all: async (...params) => {
      const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
      const result = await pool.query(convertedSql, convertedParams);
      return result.rows;
    },
    run: async (...params) => {
      const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
      const result = await pool.query(convertedSql, convertedParams);
      return {
        row: result.rows[0] || null,
        lastInsertRowid: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    }
  };
};

const exec = async (sql) => {
  await pool.query(sql);
};

// Async transaction wrapper
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create a context object that mimics the synchronous prepare
    const transactionContext = {
      prepare: (sql) => ({
        get: async (...params) => {
          const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
          const r = await client.query(convertedSql, convertedParams);
          return r.rows[0] || null;
        },
        all: async (...params) => {
          const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
          const r = await client.query(convertedSql, convertedParams);
          return r.rows;
        },
        run: async (...params) => {
          const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
          const r = await client.query(convertedSql, convertedParams);
          return {
            row: r.rows[0] || null,
            lastInsertRowid: r.rows[0]?.id || null,
            changes: r.rowCount
          };
        }
      })
    };
    
    const result = await fn(transactionContext);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Database query helpers - updated to be async
const dbGet = async (sql, ...params) => {
  const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
  const result = await pool.query(convertedSql, convertedParams);
  return result.rows[0] || null;
};

const dbAll = async (sql, ...params) => {
  const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
  const result = await pool.query(convertedSql, convertedParams);
  return result.rows;
};

const dbRun = async (sql, ...params) => {
  const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
  const result = await pool.query(convertedSql, convertedParams);
  return {
    row: result.rows[0] || null,
    lastInsertRowid: result.rows[0]?.id || null,
    changes: result.rowCount
  };
};

/**
 * Pre-establish pool connections so the first real requests don't pay
 * the full SSL-handshake cost to Supabase.
 */
async function warmPool() {
  const target = Math.min(pool.options.max || 5, 3);
  const clients = [];
  try {
    for (let i = 0; i < target; i++) {
      clients.push(await pool.connect());
    }
    // Verify the connections work
    if (clients.length > 0) {
      await clients[0].query('SELECT 1');
    }
    console.log(`Pool warmed: ${clients.length} connection(s) ready`);
  } finally {
    for (const c of clients) c.release();
  }
}

module.exports = {
  DEFAULT_MAX_SLOTS,
  pool,
  prepare,
  exec,
  transaction,
  dbGet,
  dbAll,
  dbRun,
  warmPool
};
