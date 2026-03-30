require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_MAX_SLOTS = 5;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'church.db');

const sqliteDb = new Database(DB_PATH);

const sqliteContext = {
  prepare: (sql) => sqliteDb.prepare(sql),
  exec: (sql) => sqliteDb.exec(sql)
};

async function transaction(fn) {
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

module.exports = {
  DEFAULT_MAX_SLOTS,
  sqliteContext,
  prepare: (sql) => sqliteContext.prepare(sql),
  exec: (sql) => sqliteContext.exec(sql),
  transaction
};
