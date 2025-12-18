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

// Database
const db = new sqlite3.Database(path.join(__dirname, 'church.db'), (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Initialize tables
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
});

// Nodemailer
let transporter = null;
if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

function sendEmail(to, subject, text) {
  if (!transporter) return console.log('Email transporter not configured.');
  transporter.sendMail({ from: EMAIL_FROM, to, subject, text }, (err, info) => {
    if (err) console.error('Email error:', err);
    else console.log('Email sent:', info.response || info);
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

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    let { name, email, password, phone, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    email = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, phone || '', role || 'member'],
      function(err) {
        if (err) return res.status(400).json({ error: 'User exists or error' });
        const token = jwt.sign({ id: this.lastID, email, role: role || 'member', name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: this.lastID, name, email, role: role || 'member' }, token });
      }
    );
  } catch (ex) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  db.get('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()], async (err, user) => {
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  });
});

// Get user bookings
app.get('/api/bookings', authMiddleware, (req, res) => {
  const query = req.user.role === 'admin'
    ? 'SELECT * FROM bookings ORDER BY date, time_slot'
    : 'SELECT * FROM bookings WHERE user_id = ? ORDER BY date, time_slot';
  db.all(query, req.user.role === 'admin' ? [] : [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Create booking (first come first serve)
app.post('/api/bookings', authMiddleware, (req, res) => {
  const { service_type, date, time_slot } = req.body || {};
  if (!service_type || !date || !time_slot) return res.status(400).json({ error: 'Missing required fields' });

  db.get('SELECT id FROM bookings WHERE date = ? AND time_slot = ? LIMIT 1', [date, time_slot], (err, existing) => {
    if (existing) return res.status(400).json({ error: 'Time slot already booked' });

    getMaxSlotsForDate(date, (err, maxSlots) => {
      getBookingCountForDate(date, (err, booked) => {
        if (booked >= maxSlots) return res.status(400).json({ error: 'Date fully booked' });

        db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id], (err, user) => {
          const stmt = 'INSERT INTO bookings (user_id, user_name, user_email, service_type, date, time_slot) VALUES (?, ?, ?, ?, ?, ?)';
          db.run(stmt, [user.id, user.name, user.email, service_type, date, time_slot], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            db.get('SELECT * FROM bookings WHERE id = ?', [this.lastID], (err, booking) => {
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

// Cancel booking (user or admin)
app.delete('/api/bookings/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Booking not found' });
    if (req.user.role !== 'admin' && row.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run('DELETE FROM bookings WHERE id = ?', [id], (err) => {
      if (err) return res.status(400).json({ error: err.message });
      io.emit('booking_deleted', { id, date: row.date });
      sendEmail(row.user_email, 'Booking Cancelled', `Your booking on ${row.date} ${row.time_slot} has been cancelled.`);
      res.json({ success: true });
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});
