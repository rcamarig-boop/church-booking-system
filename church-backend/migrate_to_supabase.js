#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const BACKUP_FILE = './church_backup_2026-04-06T09-01-59-921Z.json';

async function migrateData() {
  console.log('\n🔄 CHURCH PROJECT - DATA MIGRATION (SQLITE → POSTGRESQL)\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Verify DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL not configured!\n');
    console.log('To complete migration, you need to:\n');
    console.log('1. Set up Supabase (https://supabase.com)');
    console.log('2. Create tables using the schema SQL (from QUICK_START.md)');
    console.log('3. Copy DATABASE_URL from Supabase Dashboard');
    console.log('4. Add to .env file: DATABASE_URL=postgresql://...\n');
    process.exit(1);
  }

  // Step 2: Read backup file
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ ERROR: Backup file not found: ${BACKUP_FILE}\n`);
    process.exit(1);
  }

  console.log(`📂 Reading backup file: ${BACKUP_FILE}\n`);
  const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));

  // Step 3: Connect to PostgreSQL
  console.log('🔌 Connecting to PostgreSQL...\n');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ Connected to PostgreSQL\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 4: Import data
    console.log('📥 IMPORTING DATA:\n');

    let totalImported = 0;
    for (const [table, rows] of Object.entries(data)) {
      if (!rows || rows.length === 0) {
        console.log(`  ⊘ ${table}: 0 rows (empty)`);
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        let successCount = 0;
        for (const row of rows) {
          const keys = Object.keys(row);
          const values = keys.map(k => row[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          const sql = `INSERT INTO ${table} (${keys.join(', ')}) 
                      VALUES (${placeholders}) 
                      ON CONFLICT DO NOTHING`;
          
          try {
            await client.query(sql, values);
            successCount++;
          } catch (err) {
            // Skip duplicates/conflicts silently
          }
        }

        await client.query('COMMIT');
        console.log(`  ✓ ${table}: ${successCount}/${rows.length} rows imported`);
        totalImported += successCount;
      } catch (err) {
        await client.query('ROLLBACK');
        console.log(`  ✗ ${table}: Error - ${err.message}`);
      } finally {
        client.release();
      }
    }

    console.log(`\n✅ Migration Complete! Imported ${totalImported} total records\n`);

    // Step 5: Verify
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 VERIFICATION:\n');

    const client = await pool.connect();
    for (const table of Object.keys(data)) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`  ${table}: ${count} rows`);
    }
    client.release();

    console.log('\n✅ SUCCESS! Data migration complete.\n');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 NEXT STEPS:\n');
    console.log('1. Install dependencies: npm install');
    console.log('2. Test the server: npm start');
    console.log('3. Test login in browser: http://localhost:4000');
    console.log('4. When ready to deploy, follow QUICK_START.md');
    console.log('5. Commit changes: git add -A && git commit -m "Migrate to PostgreSQL"\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('- Verify DATABASE_URL is correct');
    console.error('- Ensure Supabase tables were created (run schema SQL)');
    console.error('- Check PostgreSQL is running and accessible');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
