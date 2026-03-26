// Copy data from SQLite (better-sqlite3) to Postgres using env credentials.
// Usage: node migrate_sqlite_to_pg.js
// Set USE_PG=true and PG* env vars / DATABASE_URL to point to the target Postgres.

const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'church.db');
const sqlite = new Database(DB_PATH, { readonly: true });

const pool = new Pool({
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

async function withClient(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function rows(sql) {
  return sqlite.prepare(sql).all();
}

function columns(table) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

async function load() {
  const userCols = columns('users');
  const bookingCols = columns('bookings');
  const requestCols = columns('booking_requests');
  const recordCols = columns('booking_records');
  const eventCols = columns('events');

  const tables = {
    users: rows('SELECT * FROM users').map(r => ({
      id: r.id,
      name: r.name ?? null,
      email: r.email ?? null,
      password: r.password ?? r.password_hash ?? null,
      role: r.role ?? 'member'
    })),
    calendar: rows('SELECT date,max_slots,booked FROM calendar'),
    bookings: rows('SELECT * FROM bookings').map(r => ({
      id: r.id,
      userId: r.userId ?? r.user_id ?? null,
      name: r.name ?? r.user_name ?? null,
      email: r.email ?? r.user_email ?? null,
      date: r.date,
      slot: r.slot ?? r.time_slot ?? null,
      service: r.service ?? r.service_type ?? null,
      details: r.details ?? null
    })),
    booking_requests: rows('SELECT * FROM booking_requests').map(r => ({
      id: r.id,
      userId: r.userId ?? r.user_id ?? null,
      name: r.name ?? r.user_name ?? null,
      email: r.email ?? r.user_email ?? null,
      date: r.date,
      slot: r.slot ?? r.time_slot ?? null,
      service: r.service ?? r.service_type ?? null,
      details: r.details ?? null,
      status: r.status ?? 'pending',
      created_at: r.created_at ?? null,
      reviewed_by: r.reviewed_by ?? null,
      reviewed_at: r.reviewed_at ?? null
    })),
    booking_records: rows('SELECT * FROM booking_records').map(r => ({
      id: r.id,
      request_id: r.request_id ?? null,
      booking_id: r.booking_id ?? null,
      userId: r.userId ?? r.user_id ?? null,
      name: r.name ?? r.user_name ?? null,
      email: r.email ?? r.user_email ?? null,
      service: r.service ?? r.service_type ?? null,
      date: r.date,
      slot: r.slot ?? r.time_slot ?? null,
      details: r.details ?? null,
      action: r.action ?? null,
      note: r.note ?? null,
      action_by: r.action_by ?? null,
      action_at: r.action_at ?? null
    })),
    events: rows('SELECT * FROM events').map(r => ({
      id: r.id,
      title: r.title ?? null,
      date: r.date ?? null,
      time: r.time ?? r.time_slot ?? null,
      description: r.description ?? null
    }))
  };

  await withClient(async (c) => {
    // Truncate in FK-safe order.
    await c.query('TRUNCATE booking_records, booking_requests, bookings, events, calendar, users RESTART IDENTITY');

    const copy = async (table, cols, data) => {
      if (!data.length) return;
      const placeholders = data.map(
        (_, i) => `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`
      ).join(',');
      const flat = data.flatMap(row => cols.map(col => row[col] ?? null));
      await c.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders}`, flat);
    };

    await copy('users', ['id', 'name', 'email', 'password', 'role'], tables.users);
    await copy('calendar', ['date', 'max_slots', 'booked'], tables.calendar);
    await copy('bookings', ['id','userId','name','email','date','slot','service','details'], tables.bookings);
    await copy('booking_requests', [
      'id','userId','name','email','date','slot','service','details','status','created_at','reviewed_by','reviewed_at'
    ], tables.booking_requests);
    await copy('booking_records', [
      'id','request_id','booking_id','userId','name','email','service','date','slot','details','action','note','action_by','action_at'
    ], tables.booking_records);
    await copy('events', ['id','title','date','time','description'], tables.events);
  });
}

load()
  .then(() => {
    console.log('Migration completed.');
    return pool.end();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    pool.end().then(() => process.exit(1));
  });
