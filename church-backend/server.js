const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');
const { usePg, DEFAULT_MAX_SLOTS, ensurePgSchema, prepare, exec, transaction } = db;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY';
const AUTO_SEED_ADMIN = process.env.AUTO_SEED_ADMIN !== 'false';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@church.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

async function initDatabase() {
  if (usePg) {
    await ensurePgSchema();
  } else {
    exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'member'
    );
    
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT,
      email TEXT,
      date TEXT,
      slot TEXT,
      service TEXT,
      details TEXT
    );
    
    CREATE TABLE IF NOT EXISTS booking_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT,
      email TEXT,
      date TEXT,
      slot TEXT,
      service TEXT,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      reviewed_by INTEGER,
      reviewed_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS booking_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER,
      booking_id INTEGER,
      userId INTEGER,
      name TEXT,
      email TEXT,
      service TEXT,
      date TEXT,
      slot TEXT,
      details TEXT,
      action TEXT,
      note TEXT,
      action_by INTEGER,
      action_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      description TEXT
    );
    
    CREATE TABLE IF NOT EXISTS calendar (
      date TEXT PRIMARY KEY,
      max_slots INTEGER DEFAULT 5,
      booked INTEGER DEFAULT 0
    );
    `);
  }
}

const dbGet = async (sql, ...params) => {
  const stmt = prepare(sql);
  return await stmt.get(...params);
};

const dbAll = async (sql, ...params) => {
  const stmt = prepare(sql);
  return await stmt.all(...params);
};

const dbRun = async (sql, ...params) => {
  const stmt = prepare(sql);
  return await stmt.run(...params);
};

const passwordColumn = 'password';
const hasPhoneColumn = false;
const eventTitleCol = 'title';
const eventDateCol = 'date';
const eventTimeCol = 'time';
const eventDescCol = 'description';

const normalizeEvent = (e) => ({
  id: e.id,
  title: e.title,
  date: e.date,
  time: e.time ?? '',
  description: e.description || ''
});

async function ensureAdminUser() {
  if (!AUTO_SEED_ADMIN) return;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const existing = await dbGet('SELECT id FROM users WHERE email=?', ADMIN_EMAIL);
  if (existing) return;

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const columns = hasPhoneColumn
    ? `name, email, ${passwordColumn}, phone, role`
    : `name, email, ${passwordColumn}, role`;
  const values = hasPhoneColumn
    ? [ADMIN_NAME, ADMIN_EMAIL, hash, '', 'admin']
    : [ADMIN_NAME, ADMIN_EMAIL, hash, 'admin'];

  await dbRun(
    `INSERT INTO users (${columns}) VALUES (${values.map(() => '?').join(', ')})`,
    ...values
  );
  console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
}

const bookingUserIdCol = 'userId';
const bookingNameCol = 'name';
const bookingEmailCol = 'email';
const bookingServiceCol = 'service';
const bookingSlotCol = 'slot';
const bookingDetailsCol = 'details';

const requestUserIdCol = 'userId';
const requestNameCol = 'name';
const requestEmailCol = 'email';
const requestServiceCol = 'service';
const requestSlotCol = 'slot';
const requestStatusCol = 'status';
const requestDetailsCol = 'details';

const normalizeBooking = (b) => ({
  id: b.id,
  userId: b.userId ?? b.user_id ?? null,
  name: b.name ?? b.user_name ?? null,
  email: b.email ?? b.user_email ?? null,
  service: b.service ?? b.service_type ?? null,
  date: b.date,
  slot: b.slot ?? b.time_slot ?? null,
  details: safeJsonParse(b.details)
});

const normalizeBookingRequest = (r) => ({
  id: r.id,
  userId: r.userId ?? r.user_id ?? null,
  name: r.name ?? r.user_name ?? null,
  email: r.email ?? r.user_email ?? null,
  service: r.service ?? r.service_type ?? null,
  date: r.date,
  slot: r.slot ?? r.time_slot ?? null,
  details: safeJsonParse(r.details),
  status: r.status || 'pending',
  createdAt: r.created_at || null
});

const LEGACY_SLOT_OPTIONS = ['AM', 'PM'];
const CUSTOM_SLOT_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;
const EXCLUSIVE_SERVICES = new Set(['funeral', 'wedding']);
const SERVICE_REQUIRED_FIELDS = {
  counseling: ['fullName', 'phone', 'concern'],
  baptism: ['childName', 'birthDate', 'parentNames'],
  wedding: ['groomName', 'brideName', 'contactNumber'],
  blessing: ['personName', 'blessingType'],
  funeral: ['deceasedName', 'deceasedBirthDate', 'dateOfDeath', 'familyContact'],
  christening: ['childName', 'guardianName', 'contactNumber']
};
const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeSlot(value) {
  const raw = String(value || '').trim();
  const upper = raw.toUpperCase();
  if (upper === 'AM' || upper === 'PM') return upper;
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }
  return raw;
}

function isExclusiveService(service) {
  return EXCLUSIVE_SERVICES.has(String(service || '').trim().toLowerCase());
}

function isValidSlot(slot) {
  return LEGACY_SLOT_OPTIONS.includes(slot) || CUSTOM_SLOT_PATTERN.test(slot);
}

function validateServiceDetails(service, details) {
  const key = String(service || '').trim().toLowerCase();
  const requiredFields = SERVICE_REQUIRED_FIELDS[key] || [];
  if (!requiredFields.length) return { ok: true };
  if (!details || typeof details !== 'object') {
    return { ok: false, reason: 'Missing service details form' };
  }
  for (const field of requiredFields) {
    const val = details[field];
    if (typeof val !== 'string' || !val.trim()) {
      return { ok: false, reason: `Missing required field: ${field}` };
    }
    if (NUMERIC_ONLY_FIELDS.has(field) && !/^\d+$/.test(val.trim())) {
      return { ok: false, reason: `${field} must contain numbers only` };
    }
  }
  return { ok: true };
}

function normalizeDetailsPayload(details) {
  if (details === undefined || details === null) return {};
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    const parsed = safeJsonParse(details);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  return {};
}

async function addBookingRecord({
  requestId = null,
  bookingId = null,
  userId = null,
  name = null,
  email = null,
  service = null,
  date = null,
  slot = null,
  details = null,
  action,
  note = null,
  actionBy = null
}, conn = null) {
  const runner = conn ? conn.prepare.bind(conn) : prepare;
  await runner(`
    INSERT INTO booking_records (
      request_id, booking_id, userId, name, email, service, date, slot, details, action, note, action_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
  requestId,
  bookingId,
  userId,
  name,
  email,
  service,
  date,
  slot,
  details ? JSON.stringify(details) : null,
  action,
  note,
  actionBy
  );
}

/* ===================== AUTH MIDDLEWARE ===================== */
function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function admin(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  next();
}

/* ===================== AUTH ===================== */
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    const columns = hasPhoneColumn
      ? `name, email, ${passwordColumn}, phone, role`
      : `name, email, ${passwordColumn}, role`;
    const values = hasPhoneColumn
      ? [name, email, hashed, '', role || 'member']
      : [name, email, hashed, role || 'member'];
    const result = await dbRun(
      `INSERT INTO users (${columns}) VALUES (${values.map(() => '?').join(', ')}) RETURNING id`,
      ...values
    );

    const userId = result.lastInsertRowid || result?.id || result?.rows?.[0]?.id;
    const user = { id: userId, name, email, role: role || 'member' };
    const token = jwt.sign(user, JWT_SECRET);

    res.json({ token, user });
  } catch {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await dbGet(
    'SELECT * FROM users WHERE email=?',
    req.body.email
  );

  if (!user)
    return res.status(401).json({ error: 'Invalid credentials' });

  const storedPassword = user.password ?? user.password_hash;
  const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');
  let passwordOk = false;

  if (looksHashed) {
    passwordOk = await bcrypt.compare(req.body.password, storedPassword);
  } else {
    // Support legacy/plaintext admin rows and upgrade on successful login.
    passwordOk = req.body.password === storedPassword;
    if (passwordOk) {
      const hashed = await bcrypt.hash(req.body.password, 10);
      await dbRun(`UPDATE users SET ${passwordColumn}=? WHERE id=?`, hashed, user.id);
    }
  }

  if (!passwordOk)
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

/* ===================== BOOKINGS ===================== */
app.get('/api/bookings', auth, async (req, res) => {
  const rows = req.user.role === 'admin'
    ? await dbAll('SELECT * FROM bookings')
    : bookingUserIdCol
      ? await dbAll(`SELECT * FROM bookings WHERE ${bookingUserIdCol}=?`, req.user.id)
      : [];

  res.json(rows.map(normalizeBooking));
});

// Public booking slots (date + slot only) for calendar availability
app.get('/api/bookings/slots', auth, async (_, res) => {
  if (!bookingSlotCol) return res.json([]);
  const rows = await dbAll(
    `SELECT date, ${bookingSlotCol} AS slot FROM bookings`
  );
  res.json(rows);
});

app.post('/api/bookings', auth, async (req, res) => {
  const { date, service } = req.body;
  const slot = normalizeSlot(req.body.slot);
  const details = req.body.details;

  try {
    if (!date || !slot || !service) {
      return res.status(400).json({ error: 'Missing date/slot/service' });
    }
    if (!isValidSlot(slot)) {
      return res.status(400).json({ error: 'Booking slot must be AM/PM or HH:MM in 30-minute intervals' });
    }
    const cal = await dbGet('SELECT max_slots FROM calendar WHERE date=?', date);
    if ((cal?.max_slots ?? DEFAULT_MAX_SLOTS) <= 0) {
      return res.status(409).json({ error: 'This date is closed for bookings' });
    }
    const detailsValidation = validateServiceDetails(service, details);
    if (!detailsValidation.ok) {
      return res.status(400).json({ error: detailsValidation.reason });
    }

    const cols = [];
    const vals = [];
    if (requestUserIdCol) { cols.push(requestUserIdCol); vals.push(req.user.id); }
    if (requestNameCol) { cols.push(requestNameCol); vals.push(req.user.name); }
    if (requestEmailCol) { cols.push(requestEmailCol); vals.push(req.user.email || null); }
    if (requestServiceCol) { cols.push(requestServiceCol); vals.push(service); }
    if (requestSlotCol) { cols.push(requestSlotCol); vals.push(slot); }
    if (requestDetailsCol) { cols.push(requestDetailsCol); vals.push(JSON.stringify(details || {})); }
    cols.push('date'); vals.push(date);
    if (requestStatusCol) { cols.push(requestStatusCol); vals.push('pending'); }

    const insertResult = await dbRun(`
      INSERT INTO booking_requests (${cols.join(', ')})
      VALUES (${cols.map(() => '?').join(', ')})
      RETURNING id
    `, ...vals);

    const requestId = insertResult.lastInsertRowid || insertResult?.id || insertResult?.rows?.[0]?.id;

    await addBookingRecord({
      requestId,
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email || null,
      service,
      date,
      slot,
      details: details || null,
      action: 'submitted'
    });
  } catch (err) {
    console.error('Booking request insert failed', err);
    return res.status(500).json({ error: 'Booking request insert failed' });
  }

  io.emit('booking_request_created', { date, slot, service, userId: req.user.id });
  res.json({ success: true, message: 'Booking request submitted for admin verification' });
});

app.get('/api/booking-requests', auth, admin, async (_, res) => {
  const rows = await dbAll(
    'SELECT * FROM booking_requests WHERE status = ? ORDER BY created_at ASC, id ASC',
    'pending'
  );
  res.json(rows.map(normalizeBookingRequest));
});

app.get('/api/booking-requests/my', auth, async (req, res) => {
  if (!requestUserIdCol) return res.json([]);
  const rows = await dbAll(
    `SELECT * FROM booking_requests WHERE ${requestUserIdCol} = ? ORDER BY id DESC`,
    req.user.id
  );
  res.json(rows.map(normalizeBookingRequest));
});

app.put('/api/booking-requests/:id', auth, admin, async (req, res) => {
  const requestId = Number(req.params.id);
  const row = await dbGet('SELECT * FROM booking_requests WHERE id=?', requestId);
  if (!row) return res.status(404).json({ error: 'Request not found' });
  if ((row.status || 'pending') !== 'pending') {
    return res.status(409).json({ error: 'Only pending requests can be edited' });
  }

  const current = normalizeBookingRequest(row);
  const date = req.body.date || current.date;
  const service = req.body.service || current.service;
  const slot = normalizeSlot(req.body.slot || current.slot);
  const details = normalizeDetailsPayload(
    req.body.details !== undefined ? req.body.details : current.details
  );

  if (!date || !service || !slot) {
    return res.status(400).json({ error: 'Missing date/slot/service' });
  }
  if (!isValidSlot(slot)) {
    return res.status(400).json({ error: 'Request has invalid slot' });
  }
  const detailsValidation = validateServiceDetails(service, details);
  if (!detailsValidation.ok) {
    return res.status(400).json({ error: detailsValidation.reason });
  }

  await dbRun(`
    UPDATE booking_requests
    SET date=?, service=?, slot=?, details=?
    WHERE id=?
  `, date, service, slot, JSON.stringify(details), requestId);

  await addBookingRecord({
    requestId,
    userId: current.userId,
    name: current.name,
    email: current.email,
    service,
    date,
    slot,
    details,
    action: 'request_edited',
    actionBy: req.user.id
  });

  io.emit('booking_request_updated', { id: requestId, status: 'pending', updated: true });
  res.json({ success: true });
});

app.post('/api/booking-requests/:id/approve', auth, admin, async (req, res) => {
  const requestId = Number(req.params.id);
  const row = await dbGet('SELECT * FROM booking_requests WHERE id=?', requestId);

  if (!row) return res.status(404).json({ error: 'Request not found' });
  if ((row.status || 'pending') !== 'pending') {
    return res.status(409).json({ error: 'Request already processed' });
  }

  const request = normalizeBookingRequest(row);
  const slot = normalizeSlot(request.slot);
  if (!isValidSlot(slot)) {
    return res.status(400).json({ error: 'Request has invalid slot' });
  }

  const approveTxn = await transaction(async (conn) => {
    const cal = await conn.prepare('SELECT max_slots, booked FROM calendar WHERE date=?').get(request.date);
    const maxSlots = cal?.max_slots ?? DEFAULT_MAX_SLOTS;
    const booked = cal?.booked ?? 0;

    if (booked >= maxSlots) {
      return { ok: false, reason: 'This day is fully booked' };
    }

    if (isExclusiveService(request.service) && bookingSlotCol) {
      const existing = await conn.prepare(
        `SELECT 1 FROM bookings WHERE date=? AND ${bookingSlotCol}=? LIMIT 1`
      ).get(request.date, slot);
      if (existing) {
        return { ok: false, reason: 'Funeral/Wedding slot is already occupied' };
      }
    }

    const cols = [];
    const vals = [];
    if (bookingUserIdCol) { cols.push(bookingUserIdCol); vals.push(request.userId); }
    if (bookingNameCol) { cols.push(bookingNameCol); vals.push(request.name); }
    if (bookingEmailCol) { cols.push(bookingEmailCol); vals.push(request.email || null); }
    if (bookingServiceCol) { cols.push(bookingServiceCol); vals.push(request.service); }
    if (bookingSlotCol) { cols.push(bookingSlotCol); vals.push(slot); }
    if (bookingDetailsCol) { cols.push(bookingDetailsCol); vals.push(request.details ? JSON.stringify(request.details) : null); }
    cols.push('date'); vals.push(request.date);

    const insertResult = await conn.prepare(`
      INSERT INTO bookings (${cols.join(', ')})
      VALUES (${cols.map(() => '?').join(', ')})
      RETURNING id
    `).run(...vals);

    const bookingId = insertResult.lastInsertRowid || insertResult?.id || insertResult?.rows?.[0]?.id;

    await conn.prepare(`
      INSERT INTO calendar (date, max_slots, booked)
      VALUES (?, ?, 1)
      ON CONFLICT(date) DO UPDATE SET booked = calendar.booked + 1
    `).run(request.date, maxSlots);

    await conn.prepare(`
      UPDATE booking_requests
      SET status='approved', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(req.user.id, requestId);

      await addBookingRecord({
        requestId: request.id,
        bookingId,
        userId: request.userId,
      name: request.name,
      email: request.email,
      service: request.service,
      date: request.date,
      slot,
      details: request.details || null,
      action: 'approved',
        actionBy: req.user.id
      }, conn);

    return { ok: true, bookingId };
  });

  const result = approveTxn;
  if (!result.ok) {
    return res.status(409).json({ error: result.reason });
  }

  io.emit('booking_request_updated', { id: requestId, status: 'approved' });
  io.emit('new_booking', {
    date: request.date,
    slot,
    service: request.service,
    userId: request.userId
  });

  res.json({ success: true });
});

app.post('/api/booking-requests/:id/reject', auth, admin, async (req, res) => {
  const requestId = Number(req.params.id);
  const row = await dbGet('SELECT * FROM booking_requests WHERE id=?', requestId);
  if (!row) return res.status(404).json({ error: 'Request not found' });
  if ((row.status || 'pending') !== 'pending') {
    return res.status(409).json({ error: 'Request already processed' });
  }

  await dbRun(`
    UPDATE booking_requests
    SET status='rejected', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP
    WHERE id=?
  `, req.user.id, requestId);

  const request = normalizeBookingRequest(row);
  await addBookingRecord({
    requestId: request.id,
    userId: request.userId,
    name: request.name,
    email: request.email,
    service: request.service,
    date: request.date,
    slot: normalizeSlot(request.slot),
    details: request.details || null,
    action: 'rejected',
    actionBy: req.user.id
  });

  io.emit('booking_request_updated', { id: requestId, status: 'rejected' });
  res.json({ success: true });
});

app.get('/api/booking-records', auth, admin, async (_, res) => {
  const rows = await dbAll(`
    SELECT id, request_id, booking_id, userId, name, email, service, date, slot, details, action, note, action_by, action_at
    FROM booking_records
    ORDER BY id DESC
  `);
  res.json(rows.map(r => ({
    id: r.id,
    requestId: r.request_id,
    bookingId: r.booking_id,
    userId: r.userId,
    name: r.name,
    email: r.email,
    service: r.service,
    date: r.date,
    slot: r.slot,
    details: safeJsonParse(r.details),
    action: r.action,
    note: r.note,
    actionBy: r.action_by,
    actionAt: r.action_at
  })));
});

app.put('/api/bookings/:id', auth, admin, async (req, res) => {
  const bookingId = Number(req.params.id);
  const row = await dbGet('SELECT * FROM bookings WHERE id=?', bookingId);
  if (!row) return res.status(404).json({ error: 'Booking not found' });

  const current = normalizeBooking(row);
  const date = req.body.date || current.date;
  const service = req.body.service || current.service;
  const slot = normalizeSlot(req.body.slot || current.slot);
  const details = normalizeDetailsPayload(
    req.body.details !== undefined ? req.body.details : current.details
  );

  if (!date || !service || !slot) {
    return res.status(400).json({ error: 'Missing date/slot/service' });
  }
  if (!isValidSlot(slot)) {
    return res.status(400).json({ error: 'Booking has invalid slot' });
  }
  const detailsValidation = validateServiceDetails(service, details);
  if (!detailsValidation.ok) {
    return res.status(400).json({ error: detailsValidation.reason });
  }

  const result = await transaction(async (conn) => {
    if (isExclusiveService(service) && bookingSlotCol) {
      const conflict = await conn.prepare(
        `SELECT 1 FROM bookings WHERE id<>? AND date=? AND ${bookingSlotCol}=? LIMIT 1`
      ).get(bookingId, date, slot);
      if (conflict) {
        return { ok: false, reason: 'Funeral/Wedding slot is already occupied' };
      }
    }

    if (date !== current.date) {
      const cal = await conn.prepare('SELECT max_slots, booked FROM calendar WHERE date=?').get(date);
      const maxSlots = cal?.max_slots ?? DEFAULT_MAX_SLOTS;
      const booked = cal?.booked ?? 0;
      if (booked >= maxSlots) {
        return { ok: false, reason: 'Target date is fully booked' };
      }

      await conn.prepare(
        'UPDATE calendar SET booked = CASE WHEN booked > 0 THEN booked - 1 ELSE 0 END WHERE date=?'
      ).run(current.date);
      await conn.prepare(`
        INSERT INTO calendar (date, max_slots, booked)
        VALUES (?, ?, 1)
        ON CONFLICT(date) DO UPDATE SET booked = booked + 1
      `).run(date, maxSlots);
    }

    const serviceCol = bookingServiceCol || 'service';
    const slotCol = bookingSlotCol || 'slot';
    const detailsCol = bookingDetailsCol || 'details';

    await conn.prepare(`
      UPDATE bookings
      SET date=?, ${serviceCol}=?, ${slotCol}=?, ${detailsCol}=?
      WHERE id=?
    `).run(date, service, slot, JSON.stringify(details), bookingId);

    await addBookingRecord({
      bookingId,
      userId: current.userId,
      name: current.name,
      email: current.email,
      service,
      date,
      slot,
      details,
      action: 'booking_edited',
      actionBy: req.user.id
    }, conn);

    return { ok: true };
  });
  if (!result.ok) return res.status(409).json({ error: result.reason });

  io.emit('booking_updated', { id: bookingId, date, slot, service });
  res.json({ success: true });
});

app.delete('/api/bookings/:id', auth, async (req, res) => {
  const booking = await dbGet(
    'SELECT * FROM bookings WHERE id=?',
    req.params.id
  );

  if (!booking) return res.status(404).json({ error: 'Not found' });

  const normalized = normalizeBooking(booking);
  const isOwner = normalized.userId === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && !isOwner)
    return res.status(403).json({ error: 'Forbidden' });

  await dbRun('DELETE FROM bookings WHERE id=?', req.params.id);
  await dbRun(
    'UPDATE calendar SET booked = CASE WHEN booked > 0 THEN booked - 1 ELSE 0 END WHERE date=?',
    booking.date
  );

  await addBookingRecord({
    bookingId: normalized.id,
    userId: normalized.userId,
    name: normalized.name,
    email: normalized.email,
    service: normalized.service,
    date: normalized.date,
    slot: normalizeSlot(normalized.slot),
    details: normalized.details || null,
    action: 'cancelled',
    actionBy: req.user.id
  });

  io.emit('booking_deleted', normalized);
  res.json({ success: true });
});

/* ===================== EVENTS ===================== */
app.get('/api/events', auth, async (_, res) => {
  const rows = await dbAll('SELECT * FROM events');
  res.json(rows.map(normalizeEvent));
});

app.post('/api/events', auth, admin, async (req, res) => {
  await dbRun(
    `INSERT INTO events (${[
      eventTitleCol || 'title',
      eventDateCol || 'date',
      eventTimeCol || 'time',
      eventDescCol || 'description'
    ].join(', ')}) VALUES (?, ?, ?, ?)`
  ,
    req.body.title,
    req.body.date,
    req.body.time || '',
    req.body.description || ''
  );

  io.emit('event_created');
  res.json({ success: true });
});

app.put('/api/events/:id', auth, admin, async (req, res) => {
  const event = await dbGet('SELECT * FROM events WHERE id=?', req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const title = String(req.body.title ?? '').trim();
  const date = String(req.body.date ?? '').trim();
  const time = String(req.body.time ?? '').trim();
  const description = String(req.body.description ?? '').trim();

  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required' });
  }

  await dbRun(
    `UPDATE events
     SET ${eventTitleCol || 'title'}=?,
         ${eventDateCol || 'date'}=?,
         ${eventTimeCol || 'time'}=?,
         ${eventDescCol || 'description'}=?
     WHERE id=?`
  , title, date, time, description, req.params.id);

  io.emit('event_updated', { id: Number(req.params.id) });
  res.json({ success: true });
});

app.delete('/api/events/:id', auth, admin, async (req, res) => {
  await dbRun('DELETE FROM events WHERE id=?', req.params.id);
  io.emit('event_deleted');
  res.json({ success: true });
});

/* ===================== CALENDAR ===================== */
app.get('/api/calendar', auth, async (_, res) => {
  const rows = await dbAll('SELECT * FROM calendar');
  const map = {};
  rows.forEach(r => map[r.date] = r);
  res.json(map);
});

app.post('/api/calendar', auth, admin, async (req, res) => {
  const { date, max_slots } = req.body;

  await dbRun(`
    INSERT INTO calendar (date, max_slots)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET max_slots=excluded.max_slots
  `, date, max_slots);

  io.emit('calendar_config_updated', { date });
  res.json({ success: true });
});

/* ===================== USERS ===================== */
app.get('/api/users', auth, admin, async (_, res) => {
  const rows = await dbAll('SELECT id,name,email,role FROM users');
  res.json(rows);
});

/* ===================== SOCKET ===================== */
io.on('connection', () => {
  console.log('Socket connected');
});

/* ===================== START SERVER ===================== */
const PORT = Number(process.env.PORT) || 4000;

(async () => {
  await initDatabase();
  await ensureAdminUser();
  server.listen(PORT, () => {
    console.log(`${usePg ? 'PostgreSQL' : 'SQLite'} server running on port ${PORT}`);
  });
})().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});

