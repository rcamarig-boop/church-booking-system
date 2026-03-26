const db = require('./db');
const { prepare } = require('./db');

async function seedTestData() {
  try {
    // Add test bookings
    const bookingInsert = prepare(`
      INSERT INTO bookings (userId, name, email, date, slot, service, details) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    bookingInsert.run(1, 'John Doe', 'john@example.com', futureDate, '09:00', 'Baptism', 'Adult baptism');
    bookingInsert.run(1, 'Jane Smith', 'jane@example.com', futureDate, '10:00', 'Wedding', 'Church wedding ceremony');
    bookingInsert.run(1, 'Bob Johnson', 'bob@example.com', pastDate, '11:00', 'Funeral', 'Funeral service');

    // Add test events
    const eventInsert = prepare(`
      INSERT INTO events (title, date, description) 
      VALUES (?, ?, ?)
    `);

    eventInsert.run('Sunday Mass', futureDate, 'Weekly Sunday service');
    eventInsert.run('Bible Study', futureDate, 'Thursday evening bible study group');
    eventInsert.run('Easter Celebration', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 'Easter Sunday special service');

    // Add calendar entries
    const calendarInsert = prepare(`
      INSERT INTO calendar (date, max_slots, booked) 
      VALUES (?, ?, ?)
    `);

    calendarInsert.run(futureDate, 5, 2);
    calendarInsert.run(new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 5, 0);

    console.log('✓ Test data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Error seeding test data:', err.message);
    process.exit(1);
  }
}

seedTestData();
