const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const EMAIL_FROM = process.env.EMAIL_FROM || 'church@example.com';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database(path.join(__dirname, 'church.db'), (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    phone TEXT,
    role TEXT DEFAULT 'member'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    service_type TEXT,
    date TEXT,
    time_slot TEXT,
    status TEXT DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS calendar_config (
    date TEXT PRIMARY KEY,
    max_slots INTEGER DEFAULT 5
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS booking_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    service_type TEXT,
    date TEXT,
    time_slot TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    admin_name TEXT,
    title TEXT,
    date TEXT,
    time_slot TEXT,
    description TEXT,
    color TEXT DEFAULT 'purple',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Nodemailer transporter (may be blank if env not set)
let transporter = null;
if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

// Helpers
const getBookingCountForDate = (date, callback) => {
  db.get('SELECT COUNT(*) AS c FROM bookings WHERE date = ?', [date], (err, row) => {
    callback(err, row ? row.c : 0);
  });
};

const getMaxSlotsForDate = (date, callback) => {
  db.get('SELECT max_slots FROM calendar_config WHERE date = ?', [date], (err, row) => {
    callback(err, row ? row.max_slots : 5);
  });
};

function sendEmail(to, subject, text) {
  if (!transporter) {
    console.log('Email transporter not configured. Skipping email to', to);
    return;
  }
  transporter.sendMail({ from: EMAIL_FROM, to, subject, text }, (err, info) => {
    if (err) console.error('Error sending email', err);
    else console.log('Email sent', info.response || info);
  });
}

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin only' });
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    let { name, email, password, phone, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    email = String(email).trim().toLowerCase();

    const hash = await bcrypt.hash(password, 10);
    const stmt = 'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)';

    db.run(stmt, [name, email, hash, phone || '', role || 'member'], function(err) {
      if (err) {
        console.error('Register error:', err && err.message ? err.message : err);
        return res.status(400).json({ error: 'User exists or error' });
      }

      db.get('SELECT id, name, email, role, phone FROM users WHERE id = ?', [this.lastID], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error retrieving user' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user, token });
      });
    });
  } catch (ex) {
    console.error('Register exception:', ex && ex.stack ? ex.stack : ex);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  db.get('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()], async (err, user) => {
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  });
});

// Public: Get all bookings
app.get('/api/bookings', authMiddleware, (req, res) => {
  let query;
  if (req.user.role === 'admin') {
    query = 'SELECT * FROM bookings ORDER BY date, time_slot';
    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  } else {
    query = 'SELECT * FROM bookings WHERE user_id = ? ORDER BY date, time_slot';
    db.all(query, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }
});

// Calendar availability
app.get('/api/calendar', authMiddleware, (req, res) => {
  const query = `SELECT date, COUNT(b.id) AS booked, coalesce(c.max_slots, 5) AS max_slots
    FROM (
        SELECT DISTINCT date FROM bookings
        UNION
        SELECT DISTINCT date FROM calendar_config
    ) d
    LEFT JOIN bookings b ON b.date = d.date
    LEFT JOIN calendar_config c ON c.date = d.date
    GROUP BY d.date`;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const outMap = {};
    (rows || []).forEach(r => {
      outMap[r.date] = { booked: r.booked, max_slots: r.max_slots };
    });
    res.json(outMap);
  });
});

// Create booking
app.post('/api/bookings', authMiddleware, (req, res) => {
  const { service_type, date, time_slot } = req.body || {};
  if (!service_type || !date || !time_slot) return res.status(400).json({ error: 'Missing required fields' });

  // Check for existing booking on same date/time to prevent double-booking
  db.get('SELECT id FROM bookings WHERE date = ? AND time_slot = ? LIMIT 1', [date, time_slot], (err, existing) => {
    if (existing) return res.status(400).json({ error: 'Time slot already booked' });
    
    getMaxSlotsForDate(date, (err, maxSlots) => {
      getBookingCountForDate(date, (err, booked) => {
        if (booked >= maxSlots) {
          return res.status(400).json({ error: 'Date fully booked' });
        }

        db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
          const stmt = 'INSERT INTO bookings (user_id, user_name, user_email, service_type, date, time_slot) VALUES (?, ?, ?, ?, ?, ?)';
          db.run(stmt, [user.id, user.name, user.email, service_type, date, time_slot], function(err) {
            if (err) return res.status(400).json({ error: err.message });

            db.get('SELECT * FROM bookings WHERE id = ?', [this.lastID], (err, booking) => {
              if (err) return res.status(400).json({ error: err.message });
              io.emit('new_booking', booking);
              sendEmail(user.email, 'Booking Confirmation', `Your booking for ${service_type} on ${date} ${time_slot} is confirmed.`);
              res.json(booking);
            });
          });
        });
      });
    });
  });
});

// Admin: set max slots
app.post('/api/calendar/config', authMiddleware, adminOnly, (req, res) => {
  const { date, max_slots } = req.body || {};
  if (!date || !max_slots) return res.status(400).json({ error: 'Missing date or max_slots' });

  const stmt = 'INSERT OR REPLACE INTO calendar_config (date, max_slots) VALUES (?, ?)';
  db.run(stmt, [date, max_slots], (err) => {
    if (err) return res.status(400).json({ error: err.message });
    io.emit('calendar_config_updated', { date, max_slots });
    res.json({ date, max_slots });
  });
});

// Admin: delete booking
app.delete('/api/bookings/:id', authMiddleware, adminOnly, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found' });

    db.run('DELETE FROM bookings WHERE id = ?', [id], (err) => {
      if (err) return res.status(400).json({ error: err.message });
      io.emit('booking_deleted', { id, date: row.date });
      sendEmail(row.user_email, 'Booking Cancelled', `Your booking on ${row.date} ${row.time_slot} has been cancelled by admin.`);
      res.json({ success: true });
    });
  });
});

// Admin: list users
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  const query = 'SELECT id, name, email, role, phone FROM users ORDER BY id';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Admin: delete user (prevent deleting self or last admin)
app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });
  if (req.user && req.user.id === id) return res.status(400).json({ error: 'Cannot delete yourself' });

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const proceedToDelete = () => {
      db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
        if (err) return res.status(400).json({ error: err.message });
        // Also cleanup related data (optional): bookings, requests, etc. Not removing here to keep simple.
        io.emit('user_deleted', { id });
        res.json({ success: true });
      });
    };

    if (user.role === 'admin') {
      db.get('SELECT COUNT(*) AS c FROM users WHERE role = ?', ['admin'], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.c <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
        proceedToDelete();
      });
    } else {
      proceedToDelete();
    }
  });
});

// Allow authenticated user to delete their own account
app.delete('/api/users/me', authMiddleware, (req, res) => {
  const id = req.user && req.user.id;
  if (!id) return res.status(400).json({ error: 'Invalid user' });

  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const proceedToDelete = () => {
      // cleanup bookings and booking_requests for this user
      db.run('DELETE FROM bookings WHERE user_id = ?', [id], (err) => {
        if (err) console.error('Error deleting bookings for user', err);
        db.run('DELETE FROM booking_requests WHERE user_id = ?', [id], (err) => {
          if (err) console.error('Error deleting booking requests for user', err);
          db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
            if (err) return res.status(400).json({ error: err.message });
            io.emit('user_deleted', { id });
            res.json({ success: true });
          });
        });
      });
    };

    if (user.role === 'admin') {
      db.get('SELECT COUNT(*) AS c FROM users WHERE role = ?', ['admin'], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.c <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
        proceedToDelete();
      });
    } else {
      proceedToDelete();
    }
  });
});

// Booking Requests - Member submits a request
app.post('/api/booking-requests', authMiddleware, (req, res) => {
  const { service_type, date, time_slot, notes } = req.body || {};
  if (!service_type || !date || !time_slot) return res.status(400).json({ error: 'Missing required fields' });

  db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const stmt = 'INSERT INTO booking_requests (user_id, user_name, user_email, service_type, date, time_slot, notes) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(stmt, [user.id, user.name, user.email, service_type, date, time_slot, notes || ''], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.get('SELECT * FROM booking_requests WHERE id = ?', [this.lastID], (err, request) => {
        if (err) return res.status(400).json({ error: err.message });
        io.emit('new_booking_request', request);
        sendEmail(user.email, 'Booking Request Submitted', `Your booking request for ${service_type} on ${date} ${time_slot} has been received. Awaiting admin approval.`);
        res.json(request);
      });
    });
  });
});

// Get booking requests (admin only - all requests, member - own requests)
app.get('/api/booking-requests', authMiddleware, (req, res) => {
  let query, params;
  if (req.user.role === 'admin') {
    query = 'SELECT * FROM booking_requests ORDER BY status DESC, created_at DESC';
    params = [];
  } else {
    query = 'SELECT * FROM booking_requests WHERE user_id = ? ORDER BY created_at DESC';
    params = [req.user.id];
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Admin: approve/reject booking request
app.patch('/api/booking-requests/:id', authMiddleware, adminOnly, (req, res) => {
  const { status } = req.body || {};
  if (!status || !['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.get('SELECT * FROM booking_requests WHERE id = ?', [req.params.id], (err, request) => {
    if (!request) return res.status(404).json({ error: 'Request not found' });

    db.run('UPDATE booking_requests SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
      if (err) return res.status(400).json({ error: err.message });

      if (status === 'approved') {
        // Create a booking from the approved request
        const stmt = 'INSERT INTO bookings (user_id, user_name, user_email, service_type, date, time_slot, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.run(stmt, [request.user_id, request.user_name, request.user_email, request.service_type, request.date, request.time_slot, 'approved'], function(err) {
          if (err) {
            sendEmail(request.user_email, 'Booking Request Status', `Your booking request for ${request.service_type} on ${request.date} could not be processed.`);
            return res.status(400).json({ error: err.message });
          }

          io.emit('booking_request_approved', { requestId: req.params.id, booking: { id: this.lastID, user_id: request.user_id } });
          sendEmail(request.user_email, '✅ Booking Approved!', `Your booking request for ${request.service_type} on ${request.date} ${request.time_slot} has been approved!`);
          res.json({ status, message: 'Request approved and booking created' });
        });
      } else {
        io.emit('booking_request_rejected', { requestId: req.params.id });
        sendEmail(request.user_email, '❌ Booking Request Rejected', `Your booking request for ${request.service_type} on ${request.date} has been rejected.`);
        res.json({ status, message: 'Request rejected' });
      }
    });
  });
});

// Admin: add event to calendar
app.post('/api/events', authMiddleware, adminOnly, (req, res) => {
  const { title, date, time_slot, description, color } = req.body || {};
  if (!title || !date || !time_slot) return res.status(400).json({ error: 'Missing required fields' });

  db.get('SELECT id, name FROM users WHERE id = ?', [req.user.id], (err, admin) => {
    if (!admin) return res.status(400).json({ error: 'Admin not found' });

    const stmt = 'INSERT INTO events (admin_id, admin_name, title, date, time_slot, description, color) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(stmt, [admin.id, admin.name, title, date, time_slot, description || '', color || 'purple'], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err, event) => {
        if (err) return res.status(400).json({ error: err.message });
        io.emit('new_event_added', event);
        res.json(event);
      });
    });
  });
});

// Get all events
app.get('/api/events', authMiddleware, (req, res) => {
  const query = 'SELECT * FROM events ORDER BY date, time_slot';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Admin: delete event
app.delete('/api/events/:id', authMiddleware, adminOnly, (req, res) => {
  db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (err, event) => {
    if (!event) return res.status(404).json({ error: 'Event not found' });

    db.run('DELETE FROM events WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(400).json({ error: err.message });
      io.emit('event_deleted', { id: req.params.id });
      res.json({ success: true });
    });
  });
});

app.get('/', (req, res) => res.send('Church Booking API with auth'));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});

// Cron job: send reminders at 08:00 server time for bookings on next day
cron.schedule('0 8 * * *', () => {
  console.log('Running daily reminder job');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  db.all('SELECT * FROM bookings WHERE date = ?', [tomorrowStr], (err, rows) => {
    if (rows) {
      rows.forEach(b => {
        sendEmail(b.user_email, 'Reminder: Upcoming booking tomorrow', `Reminder: You have ${b.service_type} scheduled on ${b.date} at ${b.time_slot}.`);
      });
    }
  });
}, { timezone: 'Asia/Manila' });

const PORT = process.env.PORT || 4000;
// Bind explicitly to 0.0.0.0 to avoid IPv4/IPv6 binding issues on some hosts
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));

// Improve visibility for runtime errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
