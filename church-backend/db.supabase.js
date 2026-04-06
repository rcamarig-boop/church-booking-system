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

// Wrapper functions to match original API
const prepare = (sql) => {
  return {
    get: async (...params) => {
      const client = await pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    },
    all: async (...params) => {
      const client = await pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    },
    run: async (...params) => {
      const client = await pool.connect();
      try {
        const result = await client.query(sql, params);
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
        get: (...params) => client.query(sql, params).then(r => r.rows[0] || null),
        all: (...params) => client.query(sql, params).then(r => r.rows),
        run: (...params) => client.query(sql, params).then(r => ({
          lastInsertRowid: r.rows[0]?.id || null,
          changes: r.rowCount
        }))
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
    const result = await client.query(sql, params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

const dbAll = async (sql, ...params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
};

const dbRun = async (sql, ...params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
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
