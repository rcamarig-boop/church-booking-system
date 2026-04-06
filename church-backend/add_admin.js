require('dotenv').config();
const bcrypt = require('bcryptjs');
const { dbAll, dbRun } = require('./db');

async function main() {
  const userColumns = await dbAll(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users'
  `);
  const names = new Set(userColumns.map(c => c.column_name));
  const passwordColumn = names.has('password') ? 'password' : names.has('password_hash') ? 'password_hash' : null;
  const hasPhoneColumn = names.has('phone');

  if (!passwordColumn) {
    console.error('Users table missing password/password_hash column.');
    process.exit(1);
  }

  const hash = await bcrypt.hash('admin1234', 10);
  const columns = hasPhoneColumn
    ? `name, email, ${passwordColumn}, phone, role`
    : `name, email, ${passwordColumn}, role`;
  const values = hasPhoneColumn
    ? ['Admin User', 'admin@church.com', hash, '', 'admin']
    : ['Admin User', 'admin@church.com', hash, 'admin'];

  await dbRun(
    `INSERT INTO users (${columns})
     VALUES (${values.map(() => '?').join(', ')})
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       ${passwordColumn} = EXCLUDED.${passwordColumn},
       role = EXCLUDED.role`,
    ...values
  );

  console.log('Admin user created!');
  console.log('Email: admin@church.com');
  console.log('Password: admin1234');
}

main().catch(err => {
  console.error('Failed to create admin user:', err.message);
  process.exit(1);
});
