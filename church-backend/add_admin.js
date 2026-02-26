const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('church.db');

const userColumns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
const passwordColumn =
  userColumns.includes('password') ? 'password' :
  userColumns.includes('password_hash') ? 'password_hash' : null;
const hasPhoneColumn = userColumns.includes('phone');

if (!passwordColumn) {
  console.error('Users table missing password/password_hash column.');
  process.exit(1);
}

bcrypt.hash('admin1234', 10, (err, hash) => {
  if (err) {
    console.error('Hash error:', err);
    process.exit(1);
  }

  const columns = hasPhoneColumn
    ? `name, email, ${passwordColumn}, phone, role`
    : `name, email, ${passwordColumn}, role`;
  const values = hasPhoneColumn
    ? ['Admin User', 'admin@church.com', hash, '', 'admin']
    : ['Admin User', 'admin@church.com', hash, 'admin'];

  db.prepare(
    `INSERT INTO users (${columns})
     VALUES (${values.map(() => '?').join(', ')})
     ON CONFLICT(email) DO UPDATE SET
       name=excluded.name,
       ${passwordColumn}=excluded.${passwordColumn},
       role=excluded.role`
  ).run(...values);

  console.log('âœ… Admin user created!');
  console.log('ðŸ“§ Email: admin@church.com');
  console.log('ðŸ”‘ Password: admin1234');
});
