#!/usr/bin/env node
/**
 * Create the church database if it doesn't exist
 * Usage: node create-database.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
  const pgUser = process.env.PGUSER || 'postgres';
  const pgPassword = process.env.PGPASSWORD || 'postgres';
  const pgHost = process.env.PGHOST || 'localhost';
  const pgPort = Number(process.env.PGPORT) || 5432;
  const pgDatabase = process.env.PGDATABASE || 'church';

  // Connect to default 'postgres' database first
  const client = new Client({
    user: pgUser,
    password: pgPassword,
    host: pgHost,
    port: pgPort,
    database: 'postgres',
  });

  try {
    console.log(`🔧 Connecting to PostgreSQL as ${pgUser}@${pgHost}:${pgPort}...`);
    await client.connect();
    console.log('✅ Connected!');

    console.log(`\n📦 Creating database "${pgDatabase}"...`);
    await client.query(`CREATE DATABASE ${pgDatabase};`);
    console.log(`✅ Database "${pgDatabase}" created!`);

    console.log('\n🎉 Done! You can now run the migration.');
    process.exit(0);
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log(`✅ Database "${pgDatabase}" already exists.`);
      process.exit(0);
    }
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
