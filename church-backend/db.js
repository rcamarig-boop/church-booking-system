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
  // Keep idle connections alive so Supabase/Render don't silently drop them
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Release idle clients after 30 s (before Supabase's ~5-min timeout)
  idleTimeoutMillis: 30000,
  // Fail fast when a new connection cannot be established
  connectionTimeoutMillis: 5000
});

// Prevent an unexpected pool error from crashing the process
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

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

module.exports = {
  DEFAULT_MAX_SLOTS,
  pool,
  prepare,
  exec,
  transaction,
  dbGet,
  dbAll,
  dbRun
};
