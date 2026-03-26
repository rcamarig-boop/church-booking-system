require('dotenv').config();
const path = require('path');
const { Pool } = require('pg');
const Database = require('better-sqlite3');

const DEFAULT_MAX_SLOTS = 5;
const usePg = process.env.USE_PG === 'true';

let sqliteDb = null;
let pgPool = null;

if (usePg) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === 'require'
      ? { rejectUnauthorized: false }
      : process.env.PGSSLMODE === 'disable'
        ? false
        : undefined
  });
} else {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'church.db');
  sqliteDb = new Database(DB_PATH);
}

/* Helper to convert ? placeholders to $1, $2 for pg */
function toPgParams(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function createPgContext(queryable) {
  return {
    prepare: (sql) => {
      const pgSql = toPgParams(sql);
      return {
        async get(...params) {
          const res = await queryable.query(pgSql, params);
          return res.rows[0] || null;
        },
        async all(...params) {
          const res = await queryable.query(pgSql, params);
          return res.rows;
        },
        async run(...params) {
          const res = await queryable.query(pgSql, params);
          const insertedId = res.rows?.[0]?.id ?? null;
          return { changes: res.rowCount, lastInsertRowid: insertedId };
        }
      };
    },
    async exec(sql) {
      await queryable.query(sql);
    },
    async query(sql, params = []) {
      const res = await queryable.query(toPgParams(sql), params);
      return res.rows;
    }
  };
}

const pgContext = usePg ? createPgContext(pgPool) : null;

const sqliteContext = sqliteDb && {
  prepare: (sql) => sqliteDb.prepare(sql),
  exec: (sql) => sqliteDb.exec(sql)
};

async function transaction(fn) {
  if (usePg) {
    const client = await pgPool.connect();
    const ctx = createPgContext(client);
    try {
      await client.query('BEGIN');
      const result = await fn(ctx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    sqliteDb.exec('BEGIN');
    try {
      const result = await fn(sqliteContext);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      sqliteDb.exec('ROLLBACK');
      throw err;
    }
  }
}

async function ensurePgSchema() {
  if (!usePg) return;
  const schemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'member'
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    name TEXT,
    email TEXT,
    date TEXT,
    slot TEXT,
    service TEXT,
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS booking_requests (
    id SERIAL PRIMARY KEY,
    userId INTEGER,
    name TEXT,
    email TEXT,
    date TEXT,
    slot TEXT,
    service TEXT,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by INTEGER,
    reviewed_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS booking_records (
    id SERIAL PRIMARY KEY,
    request_id INTEGER,
    booking_id INTEGER,
    userId INTEGER,
    name TEXT,
    email TEXT,
    service TEXT,
    date TEXT,
    slot TEXT,
    details TEXT,
    action TEXT,
    note TEXT,
    action_by INTEGER,
    action_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS calendar (
    date TEXT PRIMARY KEY,
    max_slots INTEGER DEFAULT 5,
    booked INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_date_slot ON bookings(date, slot);
  CREATE INDEX IF NOT EXISTS idx_booking_requests_status_created ON booking_requests(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;
  await pgContext.exec(schemaSql);
}

module.exports = {
  usePg,
  DEFAULT_MAX_SLOTS,
  pgContext,
  sqliteContext,
  prepare: (sql) => (usePg ? pgContext.prepare(sql) : sqliteContext.prepare(sql)),
  exec: (sql) => (usePg ? pgContext.exec(sql) : sqliteContext.exec(sql)),
  transaction,
  ensurePgSchema
};
