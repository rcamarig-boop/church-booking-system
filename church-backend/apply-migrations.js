#!/usr/bin/env node
'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function applyMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    family: 4,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const already = await client.query(
        'SELECT 1 FROM _migrations WHERE name = $1',
        [file]
      );
      if (already.rowCount > 0) {
        console.log(`[migrations] Skipping ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrations] Applying ${file}...`);
      await client.query(sql);
      await client.query(
        'INSERT INTO _migrations (name) VALUES ($1)',
        [file]
      );
      console.log(`[migrations] Applied ${file}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations().catch(err => {
  console.error('[migrations] Error:', err.message);
  process.exit(1);
});
