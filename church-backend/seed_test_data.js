require('dotenv').config();
const { dbGet, dbRun } = require('./db');

async function seedTestData() {
  try {
    const admin = await dbGet('SELECT id FROM users WHERE email=? LIMIT 1', 'admin@church.com');
    const userId = admin?.id || 1;

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await dbRun(
      `INSERT INTO bookings ("userId", name, email, date, slot, service, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      'John Doe',
      'john@example.com',
      futureDate,
      '09:00',
      'Baptism',
      { chapel: 'Main Chapel', notes: 'Adult baptism' }
    );

    await dbRun(
      `INSERT INTO bookings ("userId", name, email, date, slot, service, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      'Jane Smith',
      'jane@example.com',
      futureDate,
      '10:00',
      'Wedding',
      { chapel: 'Side Chapel #1', notes: 'Church wedding ceremony' }
    );

    await dbRun(
      `INSERT INTO bookings ("userId", name, email, date, slot, service, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      'Bob Johnson',
      'bob@example.com',
      pastDate,
      '11:00',
      'Funeral',
      { chapel: 'Main Chapel', notes: 'Funeral service' }
    );

    await dbRun(
      `INSERT INTO events (title, date, description)
       VALUES (?, ?, ?)`,
      'Sunday Mass',
      futureDate,
      'Weekly Sunday service'
    );

    await dbRun(
      `INSERT INTO events (title, date, description)
       VALUES (?, ?, ?)`,
      'Bible Study',
      futureDate,
      'Thursday evening bible study group'
    );

    await dbRun(
      `INSERT INTO events (title, date, description)
       VALUES (?, ?, ?)`,
      'Easter Celebration',
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      'Easter Sunday special service'
    );

    await dbRun(
      `INSERT INTO calendar (date, max_slots, booked)
       VALUES (?, ?, ?)
       ON CONFLICT (date) DO UPDATE SET max_slots = EXCLUDED.max_slots, booked = EXCLUDED.booked`,
      futureDate,
      5,
      2
    );

    await dbRun(
      `INSERT INTO calendar (date, max_slots, booked)
       VALUES (?, ?, ?)
       ON CONFLICT (date) DO UPDATE SET max_slots = EXCLUDED.max_slots, booked = EXCLUDED.booked`,
      new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      5,
      0
    );

    console.log('Test data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding test data:', err.message);
    process.exit(1);
  }
}

seedTestData();
