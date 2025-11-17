const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('church.db', (err) => {
  if (err) {
    console.error('Database error:', err);
    process.exit(1);
  }
});

bcrypt.hash('admin1234', 10, (err, hash) => {
  if (err) {
    console.error('Hash error:', err);
    db.close();
    process.exit(1);
  }

  db.run(
    'INSERT OR REPLACE INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
    ['Admin User', 'admin@church.com', hash, '', 'admin'],
    function(e) {
      if (e) {
        console.error('❌ Error:', e.message);
      } else {
        console.log('✅ Admin user created!');
        console.log('📧 Email: admin@church.com');
        console.log('🔑 Password: admin1234');
      }
      db.close();
    }
  );
});
