require('dotenv').config();
const { Pool } = require('pg');

const DEFAULT_MAX_SLOTS = 5;

// Create connection pool for Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
      const client = await pool.connect();
      try {
        const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
        const result = await client.query(convertedSql, convertedParams);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    },
    all: async (...params) => {
      const client = await pool.connect();
      try {
        const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
        const result = await client.query(convertedSql, convertedParams);
        return result.rows;
      } finally {
        client.release();
      }
    },
    run: async (...params) => {
      const client = await pool.connect();
      try {
        const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
        const result = await client.query(convertedSql, convertedParams);
        return {
          lastInsertRowid: result.rows[0]?.id || null,
          changes: result.rowCount
        };
      } finally {
        client.release();
      }
    }
  };
};

const exec = async (sql) => {
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
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
  const client = await pool.connect();
  try {
    const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
    const result = await client.query(convertedSql, convertedParams);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

const dbAll = async (sql, ...params) => {
  const client = await pool.connect();
  try {
    const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
    const result = await client.query(convertedSql, convertedParams);
    return result.rows;
  } finally {
    client.release();
  }
};

const dbRun = async (sql, ...params) => {
  const client = await pool.connect();
  try {
    const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sql, params);
    const result = await client.query(convertedSql, convertedParams);
    return {
      lastInsertRowid: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  } finally {
    client.release();
  }
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
