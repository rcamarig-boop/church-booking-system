#!/usr/bin/env node
/**
 * Quick PostgreSQL connection test
 * Usage: node test-pg-connection.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  if (process.env.USE_PG !== 'true') {
    console.log('❌ USE_PG is not set to true in .env');
    console.log('   Edit .env and set: USE_PG=true');
    process.exit(1);
  }

  const config = {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  };

  console.log('🔍 Testing PostgreSQL connection...');
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);

  const pool = new Pool(config);

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('\n✅ PostgreSQL connection successful!');
    console.log(`   Server time: ${result.rows[0].now}\n`);
    console.log('🚀 Ready to migrate. Run: npm run migrate:sqlite-to-pg');
    process.exit(0);
  } catch (err) {
    console.log('\n❌ Connection failed:');
    console.log(`   ${err.message}\n`);
    console.log('💡 Check your .env file:');
    console.log('   - PGHOST: Is the server reachable?');
    console.log('   - PGDATABASE: Does the database exist?');
    console.log('   - PGUSER/PGPASSWORD: Are credentials correct?\n');
    console.log('📖 See POSTGRESQL_SETUP.md for help.\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
