const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');
const { DEFAULT_MAX_SLOTS, prepare, exec, transaction } = db;

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

function getPagination(req) {
  const limit = Number.parseInt(req.query.limit, 10);
  const offset = Number.parseInt(req.query.offset, 10);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
  };
}

function buildSearchClause(q, fields) {
  const term = String(q || '').trim().toLowerCase();
  if (!term) return { clause: '', params: [] };
  const like = `%${term}%`;
  const parts = fields.map(f => `LOWER(COALESCE(${f}, '')) LIKE ?`);
  return {
    clause: `(${parts.join(' OR ')})`,
    params: fields.map(() => like)
  };
}

async function initDatabase() {
  // ✅ Tables already created in Supabase via schema SQL
  // This function is kept for reference but does nothing
  // All tables exist in PostgreSQL/Supabase
  console.log('Database: Using existing PostgreSQL/Supabase tables');
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
  userId: b.userId ?? b.userid ?? b.user_id ?? null,
  name: b.name ?? b.user_name ?? null,
  email: b.email ?? b.user_email ?? null,
  service: b.service ?? b.service_type ?? null,
  date: b.date,
  slot: b.slot ?? b.time_slot ?? null,
  details: safeJsonParse(b.details)
});

const normalizeBookingRequest = (r) => ({
  id: r.id,
  userId: r.userId ?? r.userid ?? r.user_id ?? null,
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
  const { limit, offset } = getPagination(req);
  const { clause, params } = buildSearchClause(req.query.q, [
    'id', 'name', 'email', 'service', 'date', 'slot'
  ]);
  const filter = String(req.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < CAST(now() AS date)`
    : filter === 'upcoming'
      ? `date >= CAST(now() AS date)`
      : '';

  if (req.user.role === 'admin') {
    const whereParts = [clause, filterClause].filter(Boolean);
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const rows = await dbAll(
      `SELECT * FROM bookings ${where} ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
      ...params
    );
    return res.json(rows.map(normalizeBooking));
  }

  if (!bookingUserIdCol) return res.json([]);
  const userWhere = `${bookingUserIdCol}=?`;
  const whereParts = [userWhere, clause, filterClause].filter(Boolean);
  const where = `WHERE ${whereParts.join(' AND ')}`;
  const rows = await dbAll(
    `SELECT * FROM bookings ${where} ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    req.user.id,
    ...params
  );
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
  const admins = await dbAll(`SELECT id FROM users WHERE role='admin'`);
  for (const adminUser of admins) {
    await createNotification(
      adminUser.id,
      'request',
      `New booking request: ${service} on ${date} (${slot})`
    );
  }
  res.json({ success: true, message: 'Booking request submitted for admin verification' });
});

app.get('/api/booking-requests', auth, admin, async (_, res) => {
  const { limit, offset } = getPagination(_);
  const { clause, params } = buildSearchClause(_.query.q, [
    'id', 'name', 'email', 'service', 'date', 'slot', 'status'
  ]);
  const whereParts = [`status = ?`, clause].filter(Boolean);
  const where = `WHERE ${whereParts.join(' AND ')}`;
  const rows = await dbAll(
    `SELECT * FROM booking_requests ${where} ORDER BY created_at ASC, id ASC ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    'pending',
    ...params
  );
  res.json(rows.map(normalizeBookingRequest));
});

app.get('/api/booking-requests/count', auth, admin, async (req, res) => {
  const status = String(req.query.status || '').trim();
  if (status) {
    const row = await dbGet('SELECT COUNT(*) as count FROM booking_requests WHERE status=?', status);
    return res.json({ count: row?.count ?? 0 });
  }
  const row = await dbGet('SELECT COUNT(*) as count FROM booking_requests');
  res.json({ count: row?.count ?? 0 });
});

app.get('/api/booking-requests/my', auth, async (req, res) => {
  if (!requestUserIdCol) return res.json([]);
  const { limit, offset } = getPagination(req);
  const { clause, params } = buildSearchClause(req.query.q, [
    'id', 'name', 'email', 'service', 'date', 'slot', 'status'
  ]);
  const rows = await dbAll(
    `SELECT * FROM booking_requests WHERE ${requestUserIdCol} = ? ${clause ? `AND ${clause}` : ''} ORDER BY id DESC ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    req.user.id,
    ...params
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
  if (request.userId) {
    await createNotification(
      request.userId,
      'new_booking',
      `Booking confirmed: ${request.service} on ${request.date} (${slot})`
    );
  }

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
  if (request.userId) {
    await createNotification(
      request.userId,
      'request',
      `Your booking request was rejected: ${request.service} on ${request.date} (${normalizeSlot(request.slot)})`
    );
  }
  res.json({ success: true });
});

app.get('/api/booking-records', auth, admin, async (_, res) => {
  const { limit, offset } = getPagination(_);
  const { clause, params } = buildSearchClause(_.query.q, [
    'id', 'name', 'email', 'service', 'date', 'slot', 'action', 'details'
  ]);
  const rows = await dbAll(`
    SELECT id, request_id, booking_id, userId, name, email, service, date, slot, details, action, note, action_by, action_at
    FROM booking_records
    ${clause ? `WHERE ${clause}` : ''}
    ORDER BY id DESC
    ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
  `, ...params);
  res.json(rows.map(r => ({
    id: r.id,
    requestId: r.request_id,
    bookingId: r.booking_id,
    userId: r.userId ?? r.userid ?? r.user_id,
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
  const { limit, offset } = getPagination(_);
  const { clause, params } = buildSearchClause(_.query.q, [
    'id', 'title', 'date', 'time', 'description'
  ]);
  const filter = String(_.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < CAST(now() AS date)`
    : filter === 'upcoming'
      ? `date >= CAST(now() AS date)`
      : '';
  const whereParts = [clause, filterClause].filter(Boolean);
  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const rows = await dbAll(
    `SELECT * FROM events ${where} ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    ...params
  );
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
  await createNotification(
    req.user.id,
    'info',
    `Event created: ${req.body.title} (${req.body.date})`
  );
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
  await createNotification(
    req.user.id,
    'info',
    `Event updated: ${title} (${date})`
  );
  res.json({ success: true });
});

app.delete('/api/events/:id', auth, admin, async (req, res) => {
  await dbRun('DELETE FROM events WHERE id=?', req.params.id);
  io.emit('event_deleted');
  await createNotification(
    req.user.id,
    'info',
    `Event deleted (#${req.params.id})`
  );
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
  await createNotification(
    req.user.id,
    'config',
    `Calendar updated for ${date}`
  );
  res.json({ success: true });
});

/* ===================== CONCERNS ===================== */
app.post('/api/concerns', auth, async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }
  await dbRun(
    `INSERT INTO concerns (userId, name, email, subject, message, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    req.user.id,
    req.user.name || null,
    req.user.email || null,
    subject,
    message
  );
  await createNotification(
    req.user.id,
    'concern',
    `Concern submitted: ${subject}`
  );
  const adminUsers = await dbAll(`SELECT id FROM users WHERE role='admin'`);
  for (const adminUser of adminUsers) {
    await createNotification(
      adminUser.id,
      'concern',
      `New concern from ${req.user.name || 'member'}: ${subject}`
    );
  }
  io.emit('concern_created');
  res.json({ success: true });
});

app.get('/api/concerns', auth, admin, async (_, res) => {
  const { limit, offset } = getPagination(_);
  const { clause, params } = buildSearchClause(_.query.q, [
    'id', 'name', 'email', 'subject', 'message', 'status'
  ]);
  const rows = await dbAll(`
    SELECT id, userId, name, email, subject, message, status, created_at, resolved_at, resolved_by, resolution_note,
           reply_message, replied_at, replied_by
    FROM concerns
    ${clause ? `WHERE ${clause}` : ''}
    ORDER BY created_at DESC, id DESC
    ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
  `, ...params);
  res.json(rows);
});

app.get('/api/concerns/count', auth, admin, async (req, res) => {
  const status = String(req.query.status || '').trim();
  if (status) {
    const row = await dbGet('SELECT COUNT(*) as count FROM concerns WHERE status=?', status);
    return res.json({ count: row?.count ?? 0 });
  }
  const row = await dbGet('SELECT COUNT(*) as count FROM concerns');
  res.json({ count: row?.count ?? 0 });
});

app.get('/api/concerns/my', auth, async (req, res) => {
  const { limit, offset } = getPagination(req);
  const { clause, params } = buildSearchClause(req.query.q, [
    'id', 'subject', 'message', 'status'
  ]);
  const rows = await dbAll(`
    SELECT id, userId, name, email, subject, message, status, created_at, resolved_at, resolved_by, resolution_note,
           reply_message, replied_at, replied_by
    FROM concerns
    WHERE userId=?
    ${clause ? `AND ${clause}` : ''}
    ORDER BY created_at DESC, id DESC
    ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
  `, req.user.id, ...params);
  res.json(rows);
});

app.put('/api/concerns/:id', auth, admin, async (req, res) => {
  const concernId = Number(req.params.id);
  const status = String(req.body.status || '').trim() || 'open';
  const resolutionNote = String(req.body.resolution_note || '').trim();
  const replyMessage = String(req.body.reply_message || '').trim();
  const row = await dbGet('SELECT id,status,userId FROM concerns WHERE id=?', concernId);
  if (!row) return res.status(404).json({ error: 'Concern not found' });

  const isResolved = status.toLowerCase() === 'resolved';
  await dbRun(
    `UPDATE concerns
     SET status=?, resolved_at=?, resolved_by=?, resolution_note=?,
         reply_message=?, replied_at=?, replied_by=?
     WHERE id=?`,
    status,
    isResolved ? new Date().toISOString() : null,
    isResolved ? req.user.id : null,
    resolutionNote || null,
    replyMessage || null,
    replyMessage ? new Date().toISOString() : null,
    replyMessage ? req.user.id : null,
    concernId
  );
  io.emit('concern_updated', {
    id: concernId,
    status,
    userId: row.userId,
    reply_message: replyMessage || null
  });
  if (replyMessage) {
    await createNotification(
      row.userId,
      'concern_update',
      'Admin replied to your concern'
    );
  } else {
    await createNotification(
      row.userId,
      'concern_update',
      `Your concern status: ${status}`
    );
  }
  await createNotification(
    req.user.id,
    'concern_update',
    `Concern #${concernId} updated`
  );
  res.json({ success: true });
});

app.put('/api/concerns/:id/close', auth, async (req, res) => {
  const concernId = Number(req.params.id);
  const row = await dbGet('SELECT id,userId,status FROM concerns WHERE id=?', concernId);
  if (!row) return res.status(404).json({ error: 'Concern not found' });
  if (row.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  await dbRun(
    `UPDATE concerns
     SET status='resolved', resolved_at=?, resolved_by=NULL, resolution_note=?
     WHERE id=?`,
    new Date().toISOString(),
    'Closed by user',
    concernId
  );
  io.emit('concern_updated', { id: concernId, status: 'resolved', userId: row.userId });
  await createNotification(
    row.userId,
    'concern_update',
    'You closed your concern'
  );
  res.json({ success: true });
});

/* ===================== USERS ===================== */
app.get('/api/users', auth, admin, async (_, res) => {
  const { limit, offset } = getPagination(_);
  const { clause, params } = buildSearchClause(_.query.q, [
    'id', 'name', 'email', 'role'
  ]);
  const rows = await dbAll(
    `SELECT id,name,email,role FROM users ${clause ? `WHERE ${clause}` : ''} ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    ...params
  );
  res.json(rows);
});

app.put('/api/users/me', auth, async (req, res) => {
  const userId = req.user.id;
  const { name, email, password } = req.body || {};

  if (!name && !email && !password) {
    return res.status(400).json({ error: 'No profile updates provided' });
  }

  const existing = await dbGet('SELECT id,name,email,role FROM users WHERE id=?', userId);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const updates = [];
  const values = [];

  if (email && email !== existing.email) {
    const duplicate = await dbGet('SELECT id FROM users WHERE email=? AND id<>?', email, userId);
    if (duplicate) return res.status(409).json({ error: 'Email already in use' });
    updates.push('email=?');
    values.push(email);
  }

  if (name && name !== existing.name) {
    updates.push('name=?');
    values.push(name);
  }

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    updates.push(`${passwordColumn}=?`);
    values.push(hashed);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No changes detected' });
  }

  values.push(userId);
  await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, ...values);

  const updated = await dbGet('SELECT id,name,email,role FROM users WHERE id=?', userId);
  const token = jwt.sign(
    { id: updated.id, name: updated.name, email: updated.email, role: updated.role },
    JWT_SECRET
  );
  res.json({ token, user: updated });
});

/* ===================== NOTIFICATIONS ===================== */
const MAX_NOTIFICATIONS_PER_USER = 30;

async function createNotification(userId, type, text) {
  if (!userId || !text) return;
  const result = await dbRun(
    `INSERT INTO notifications (userId, type, text, read)
     VALUES (?, ?, ?, 0)
     RETURNING id, type, text, created_at, read`,
    userId,
    type || 'info',
    text
  );
  const insertedId = result?.row?.id || result?.lastInsertRowid;
  // Keep only latest N notifications per user
  await dbRun(`
    DELETE FROM notifications
    WHERE userId=?
      AND id NOT IN (
        SELECT id FROM notifications
        WHERE userId=?
        ORDER BY id DESC
        LIMIT ${MAX_NOTIFICATIONS_PER_USER}
      )
  `, userId, userId);
  if (!insertedId) return null;
  return result.row || await dbGet(
    `SELECT id, type, text, created_at, read FROM notifications WHERE id=?`,
    insertedId
  );
}

app.get('/api/notifications', auth, async (req, res) => {
  const { limit, offset } = getPagination(req);
  const rows = await dbAll(
    `SELECT id, type, text, created_at, read
     FROM notifications
     WHERE userId=?
     ORDER BY id DESC
     ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}`,
    req.user.id
  );
  res.json(rows);
});

app.post('/api/notifications', auth, async (req, res) => {
  const type = String(req.body.type || 'info').trim() || 'info';
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Text is required' });
  const row = await createNotification(req.user.id, type, text);
  res.json(row || { success: true });
});

app.post('/api/notifications/read', auth, async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return res.json({ success: true });
  await dbRun(`UPDATE notifications SET read=1 WHERE userId=? AND id IN (${ids.map(() => '?').join(',')})`, req.user.id, ...ids);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  await dbRun('DELETE FROM notifications WHERE id=? AND userId=?', id, req.user.id);
  res.json({ success: true });
});

app.delete('/api/notifications', auth, async (req, res) => {
  await dbRun('DELETE FROM notifications WHERE userId=?', req.user.id);
  res.json({ success: true });
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
  console.log(`PostgreSQL server running on port ${PORT}`);
});
})().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
