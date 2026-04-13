const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const db = require('./db');
const { DEFAULT_MAX_SLOTS, prepare, exec, transaction, warmPool } = db;

// Wrap async route handlers to catch unhandled rejections and forward to Express error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ========== SECURITY HARDENING - Phase 1 ========== */
// Rate limiting implementation
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Import validation
const validation = require('./validation');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'] },
  pingTimeout: 30000,
  pingInterval: 25000,
  connectTimeout: 15000,
});

const serverStartTime = Date.now();

/* ========== SECURITY MIDDLEWARE ========== */

// Helmet: Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:', 'wss:']
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS with restricted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || 
  ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5000',
   'https://church-booking-system.onrender.com',
   'https://church-booking-system.vercel.app'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Data sanitization - prevent NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Potential injection detected in ${key}. Sanitized.`);
  }
}));

// JSON payload limiting
app.use(express.json({ limit: '10kb' }));

// Rate limiting tiers
const createRateLimiter = (windowMs, max, message) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.user?.role === 'admin' || req.user?.role === 'superadmin', // Admins bypass rate limits
    keyGenerator: (req) => req.user?.id || req.ip
  });

// Global rate limiter: 200 requests per 15 minutes
const globalLimiter = createRateLimiter(15 * 60 * 1000, 200, 'Too many requests, please try again later');

// API rate limiter: 60 requests per minute per user
const apiLimiter = createRateLimiter(60 * 1000, 60, 'Rate limit exceeded. Please slow down');

app.use('/api/', globalLimiter);
app.use('/api/', apiLimiter);

/* ========== SECURITY LOGGING ========== */
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log suspicious activities
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 400) {
      console.log(`[SECURITY] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms) - IP: ${req.ip}`);
    }
  });
  
  next();
});

/* ============================================ */

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY';
const AUTO_SEED_ADMIN = process.env.AUTO_SEED_ADMIN !== 'false';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@church.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/* ========== EMAIL TRANSPORTER ========== */
let emailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  emailTransporter.verify().then(() => {
    console.log('Email transporter ready');
  }).catch((err) => {
    console.warn('Email transporter verification failed:', err.message);
  });
} else {
  console.warn('SMTP not configured — email verification will be skipped');
}

async function sendVerificationEmail(email, token) {
  if (!emailTransporter) return false;
  const verifyUrl = `${FRONTEND_URL}?verify=${token}`;
  await emailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify your email — Parish Booking System',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 1px solid #e7dfcf; border-radius: 12px;">
        <h2 style="color: #1f2a44; text-align: center;">✦ Parish Booking System</h2>
        <p style="color: #374151;">Thank you for registering! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: #3b5b8a; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;">Verify Email</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      </div>
    `
  });
  return true;
}

async function sendPasswordResetEmail(email, token) {
  if (!emailTransporter) return false;
  const resetUrl = `${FRONTEND_URL}?reset=${token}`;
  await emailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Reset your password — Parish Booking System',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 1px solid #e7dfcf; border-radius: 12px;">
        <h2 style="color: #1f2a44; text-align: center;">✦ Parish Booking System</h2>
        <p style="color: #374151;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: #3b5b8a; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `
  });
  return true;
}

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

// Indexes for the four slowest endpoints — safe to re-run (IF NOT EXISTS)
async function ensurePerformanceIndexes() {
  // Strip surrounding double-quotes so the name is usable in index identifiers
  const stripQuotes = (col) => col.replace(/^"|"$/g, '');

  const bookingUserCol = stripQuotes(bookingUserIdCol);
  const requestUserCol = stripQuotes(requestUserIdCol);

  const indexes = [
    `CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (date)`,
    `CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings ("${bookingUserCol}")`,
    `CREATE INDEX IF NOT EXISTS booking_requests_user_status_idx ON booking_requests ("${requestUserCol}", status)`,
    `CREATE INDEX IF NOT EXISTS events_date_idx ON events (date)`,
  ];

  const failed = [];
  for (const sql of indexes) {
    try {
      await exec(sql);
    } catch (err) {
      failed.push(err.message);
    }
  }
  if (failed.length) {
    console.warn('Some performance indexes could not be created:', failed.join('; '));
  }
}

async function initDatabase() {
  // ✅ Tables already created in Supabase via schema SQL
  // This function is kept for reference but does nothing
  // All tables exist in PostgreSQL/Supabase
  await detectUserTableShape();
  await ensureEmailVerificationColumns();
  await ensureBookingEditProposalsTable();
  await ensureBookingRequestEditProposalsTable();
  await ensureMassServicesTable();
  await ensureMassServiceApplicationsTable();
  await ensurePerformanceIndexes();
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

let passwordColumn = 'password';
let hasPhoneColumn = false;
const eventTitleCol = 'title';
const eventDateCol = 'date';
const eventTimeCol = 'time';
const eventDescCol = 'description';
let bookingUserIdCol = '"userId"';
let bookingRecordUserIdCol = '"userId"';
let requestUserIdCol = '"userId"';
let concernUserIdCol = '"userId"';
let notificationUserIdCol = '"userId"';

const normalizeEvent = (e) => ({
  id: e.id,
  title: e.title,
  date: e.date,
  time: e.time ?? '',
  description: e.description || ''
});

const normalizeMassService = (m) => ({
  id: m.id,
  service_type: m.service_type,
  date: m.date,
  time: m.time,
  description: m.description || '',
  chapel: m.chapel,
  capacity: m.capacity || null,
  created_by: m.created_by,
  created_at: m.created_at
});

const normalizeMassServiceApplication = (a) => ({
  id: a.id,
  mass_service_id: a.mass_service_id,
  user_id: a.user_id,
  service_type: a.service_type,
  form_data: safeJsonParse(a.form_data),
  status: a.status,
  applied_at: a.applied_at,
  reviewed_at: a.reviewed_at,
  reviewed_by: a.reviewed_by,
  rejection_reason: a.rejection_reason,
  cancellation_reason: a.cancellation_reason,
  cancelled_at: a.cancelled_at,
  cancelled_by: a.cancelled_by
});

async function ensureAdminUser() {
  if (!AUTO_SEED_ADMIN) return;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const existing = await dbGet('SELECT id, role FROM users WHERE email=?', ADMIN_EMAIL);
  if (existing) {
    // Upgrade existing seeded admin to superadmin if not already
    if (existing.role === 'admin') {
      await dbRun('UPDATE users SET role=? WHERE id=?', 'superadmin', existing.id);
      console.log(`Upgraded seeded admin to superadmin: ${ADMIN_EMAIL}`);
    }
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const columns = hasPhoneColumn
    ? `name, email, ${passwordColumn}, phone, role, email_verified`
    : `name, email, ${passwordColumn}, role, email_verified`;
  const values = hasPhoneColumn
    ? [ADMIN_NAME, ADMIN_EMAIL, hash, '', 'superadmin', true]
    : [ADMIN_NAME, ADMIN_EMAIL, hash, 'superadmin', true];

  await dbRun(
    `INSERT INTO users (${columns}) VALUES (${values.map(() => '?').join(', ')})`,
    ...values
  );
  console.log(`Seeded superadmin user: ${ADMIN_EMAIL}`);
}

const bookingNameCol = 'name';
const bookingEmailCol = 'email';
const bookingServiceCol = 'service';
const bookingSlotCol = 'slot';
const bookingDetailsCol = 'details';

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
  details: safeJsonParse(b.details),
  chapel: b.chapel ?? b.place ?? safeJsonParse(b.details)?.chapel ?? null
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
  chapel: r.chapel ?? r.place ?? safeJsonParse(r.details)?.chapel ?? null,
  status: r.status || 'pending',
  createdAt: r.created_at || null
});

const normalizeBookingEditProposal = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  userId: row.user_id,
  adminId: row.admin_id,
  currentDate: row.current_booking_date ?? row.current_date,
  currentSlot: row.current_booking_slot ?? row.current_slot,
  currentDetails: safeJsonParse(row.current_booking_details ?? row.current_details),
  proposedDate: row.proposed_booking_date ?? row.proposed_date,
  proposedSlot: row.proposed_booking_slot ?? row.proposed_slot,
  proposedDetails: safeJsonParse(row.proposed_booking_details ?? row.proposed_details),
  adminNote: row.admin_note || '',
  userReply: row.user_reply || '',
  status: row.status || 'pending',
  reviewedAt: row.reviewed_at || null,
  respondedAt: row.responded_at || null,
  createdAt: row.created_at || null
});

const normalizeBookingRequestEditProposal = (row) => ({
  id: row.id,
  bookingRequestId: row.booking_request_id,
  userId: row.user_id,
  adminId: row.admin_id,
  currentDate: row.current_request_date ?? row.current_date,
  currentSlot: row.current_request_slot ?? row.current_slot,
  currentDetails: safeJsonParse(row.current_request_details ?? row.current_details),
  proposedDate: row.proposed_request_date ?? row.proposed_date,
  proposedSlot: row.proposed_request_slot ?? row.proposed_slot,
  proposedDetails: safeJsonParse(row.proposed_request_details ?? row.proposed_details),
  adminNote: row.admin_note || '',
  userReply: row.user_reply || '',
  status: row.status || 'pending',
  reviewedAt: row.reviewed_at || null,
  respondedAt: row.responded_at || null,
  createdAt: row.created_at || null
});

async function detectUserTableShape() {
  try {
    const tableColumns = async (tableName) => {
      const rows = await dbAll(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ?
      `, tableName);
      return new Set(rows.map(c => c.column_name));
    };

    const quoteIdent = (name) => (/[A-Z]/.test(name) ? `"${name}"` : name);
    const pickColumn = (names, candidates, fallback) => {
      for (const candidate of candidates) {
        if (names.has(candidate)) return quoteIdent(candidate);
      }
      return fallback;
    };

    const users = await tableColumns('users');
    passwordColumn = pickColumn(users, ['password', 'password_hash'], 'password');
    hasPhoneColumn = users.has('phone');

    const bookingRequests = await tableColumns('booking_requests');
    requestUserIdCol = pickColumn(bookingRequests, ['userId', 'userid', 'user_id'], '"userId"');

    const bookings = await tableColumns('bookings');
    bookingUserIdCol = pickColumn(bookings, ['userId', 'userid', 'user_id'], '"userId"');

    const bookingRecords = await tableColumns('booking_records');
    bookingRecordUserIdCol = pickColumn(bookingRecords, ['userId', 'userid', 'user_id'], '"userId"');

    const concerns = await tableColumns('concerns');
    concernUserIdCol = pickColumn(concerns, ['userId', 'userid', 'user_id'], '"userId"');

    const notifications = await tableColumns('notifications');
    notificationUserIdCol = pickColumn(notifications, ['userId', 'userid', 'user_id'], '"userId"');
  } catch (err) {
    console.warn('Could not detect users table columns, using defaults:', err.message);
  }
}

async function ensureEmailVerificationColumns() {
  try {
    await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`);
    await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64)`);
    await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)`);
    // Password reset columns
    await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)`);
    await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)`);
    // Auto-verify all existing accounts (they were trusted before this feature)
    await exec(`UPDATE users SET email_verified = true WHERE email_verified = false AND verification_token IS NULL`);
    console.log('Email verification columns ensured');
  } catch (err) {
    console.warn('Could not add email verification columns:', err.message);
  }
}

async function ensureBookingEditProposalsTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS booking_edit_proposals (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL,
      user_id INTEGER,
      admin_id INTEGER,
      current_booking_date TEXT NOT NULL,
      current_booking_slot TEXT NOT NULL,
      current_booking_details JSONB,
      proposed_booking_date TEXT NOT NULL,
      proposed_booking_slot TEXT NOT NULL,
      proposed_booking_details JSONB,
      admin_note TEXT,
      user_reply TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at TIMESTAMP NULL,
      responded_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const proposalColumns = await dbAll(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_edit_proposals'
  `);
  const proposalColumnNames = new Set(proposalColumns.map(row => row.column_name));
  if (proposalColumnNames.has('current_date') && !proposalColumnNames.has('current_booking_date')) {
    await exec('ALTER TABLE booking_edit_proposals RENAME COLUMN "current_date" TO current_booking_date;');
  }
  if (proposalColumnNames.has('current_slot') && !proposalColumnNames.has('current_booking_slot')) {
    await exec('ALTER TABLE booking_edit_proposals RENAME COLUMN current_slot TO current_booking_slot;');
  }
  if (proposalColumnNames.has('current_details') && !proposalColumnNames.has('current_booking_details')) {
    await exec('ALTER TABLE booking_edit_proposals RENAME COLUMN current_details TO current_booking_details;');
  }
  if (proposalColumnNames.has('proposed_date') && !proposalColumnNames.has('proposed_booking_date')) {
    await exec('ALTER TABLE booking_edit_proposals RENAME COLUMN proposed_date TO proposed_booking_date;');
  }
  if (proposalColumnNames.has('proposed_slot') && !proposalColumnNames.has('proposed_booking_slot')) {
    await exec('ALTER TABLE booking_edit_proposals RENAME COLUMN proposed_slot TO proposed_booking_slot;');
  }
  if (proposalColumnNames.has('proposed_details') && !proposalColumnNames.has('proposed_booking_details')) {
    await exec('ALTER TABLE booking_edit_proposals RENAME COLUMN proposed_details TO proposed_booking_details;');
  }
  await exec(`
    CREATE INDEX IF NOT EXISTS booking_edit_proposals_booking_idx
    ON booking_edit_proposals (booking_id, status, created_at DESC);
  `);
  await exec(`
    CREATE INDEX IF NOT EXISTS booking_edit_proposals_user_idx
    ON booking_edit_proposals (user_id, status, created_at DESC);
  `);
}

async function ensureBookingRequestEditProposalsTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS booking_request_edit_proposals (
      id SERIAL PRIMARY KEY,
      booking_request_id INTEGER NOT NULL,
      user_id INTEGER,
      admin_id INTEGER,
      current_request_date TEXT NOT NULL,
      current_request_slot TEXT NOT NULL,
      current_request_details JSONB,
      proposed_request_date TEXT NOT NULL,
      proposed_request_slot TEXT NOT NULL,
      proposed_request_details JSONB,
      admin_note TEXT,
      user_reply TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_at TIMESTAMP NULL,
      responded_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const proposalColumns = await dbAll(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'booking_request_edit_proposals'
  `);
  const proposalColumnNames = new Set(proposalColumns.map(row => row.column_name));
  if (proposalColumnNames.has('current_date') && !proposalColumnNames.has('current_request_date')) {
    await exec('ALTER TABLE booking_request_edit_proposals RENAME COLUMN "current_date" TO current_request_date;');
  }
  if (proposalColumnNames.has('current_slot') && !proposalColumnNames.has('current_request_slot')) {
    await exec('ALTER TABLE booking_request_edit_proposals RENAME COLUMN current_slot TO current_request_slot;');
  }
  if (proposalColumnNames.has('current_details') && !proposalColumnNames.has('current_request_details')) {
    await exec('ALTER TABLE booking_request_edit_proposals RENAME COLUMN current_details TO current_request_details;');
  }
  if (proposalColumnNames.has('proposed_date') && !proposalColumnNames.has('proposed_request_date')) {
    await exec('ALTER TABLE booking_request_edit_proposals RENAME COLUMN proposed_date TO proposed_request_date;');
  }
  if (proposalColumnNames.has('proposed_slot') && !proposalColumnNames.has('proposed_request_slot')) {
    await exec('ALTER TABLE booking_request_edit_proposals RENAME COLUMN proposed_slot TO proposed_request_slot;');
  }
  if (proposalColumnNames.has('proposed_details') && !proposalColumnNames.has('proposed_request_details')) {
    await exec('ALTER TABLE booking_request_edit_proposals RENAME COLUMN proposed_details TO proposed_request_details;');
  }
  await exec(`
    CREATE INDEX IF NOT EXISTS booking_request_edit_proposals_request_idx
    ON booking_request_edit_proposals (booking_request_id, status, created_at DESC);
  `);
  await exec(`
    CREATE INDEX IF NOT EXISTS booking_request_edit_proposals_user_idx
    ON booking_request_edit_proposals (user_id, status, created_at DESC);
  `);
}

async function ensureMassServicesTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS mass_services (
      id SERIAL PRIMARY KEY,
      service_type TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "time" TEXT NOT NULL,
      description TEXT,
      chapel TEXT NOT NULL,
      capacity INTEGER,
      created_by INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await exec(`
    CREATE INDEX IF NOT EXISTS mass_services_date_idx
    ON mass_services ("date", "time");
  `);
}

async function ensureMassServiceApplicationsTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS mass_service_applications (
      id SERIAL PRIMARY KEY,
      mass_service_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      form_data JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP,
      reviewed_by INTEGER,
      rejection_reason TEXT,
      cancellation_reason TEXT,
      cancelled_at TIMESTAMP,
      cancelled_by INTEGER
    );
  `);
  await exec(`
    CREATE INDEX IF NOT EXISTS mass_service_applications_mass_service_idx
    ON mass_service_applications (mass_service_id, status);
  `);
  await exec(`
    CREATE INDEX IF NOT EXISTS mass_service_applications_user_idx
    ON mass_service_applications (user_id, status);
  `);
}

const LEGACY_SLOT_OPTIONS = ['AM', 'PM'];
const CUSTOM_SLOT_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;
const EXCLUSIVE_SERVICES = new Set(['funeral', 'wedding']);
const SERVICE_REQUIRED_FIELDS = {
  counseling: ['chapel', 'fullName', 'phone', 'concern'],
  baptism: ['chapel', 'childName', 'birthDate', 'motherName', 'fatherName'],
  wedding: ['chapel', 'groomName', 'brideName', 'contactNumber'],
  blessing: ['chapel', 'personName', 'blessingType'],
  funeral: ['chapel', 'deceasedName', 'deceasedBirthDate', 'dateOfDeath', 'familyContact'],
  christening: ['chapel', 'childName', 'guardianName', 'contactNumber']
};
const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);
const NAME_INPUT_FIELDS = new Set([
  'name',
  'fullName',
  'childName',
  'motherName',
  'fatherName',
  'groomName',
  'brideName',
  'personName',
  'deceasedName',
  'guardianName'
]);
const NAME_MAX_LENGTH = 40;
const PHONE_MAX_LENGTH = 11;
const BOOKING_LIMIT = 9;
const CONCERN_LIMIT = 10;
const NAME_VALID_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,39}$/u;
const DATE_FIELD_KEYS = new Set(['birthDate', 'deceasedBirthDate', 'dateOfDeath']);
const BOOKING_TIME_MINUTES = 8 * 60;
const BOOKING_TIME_MAX_MINUTES = 18 * 60;

function getTodayIsoDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
}

function getTomorrowIsoDate() {
  const base = new Date(`${getTodayIsoDate()}T00:00:00+08:00`);
  base.setDate(base.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(base);
}

function getSixMonthsAheadIsoDate() {
  const base = new Date(`${getTodayIsoDate()}T00:00:00+08:00`);
  base.setMonth(base.getMonth() + 6);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(base);
}

function isBookingDateAtLeastTomorrow(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && text >= getTomorrowIsoDate();
}

function isBookingDateWithinSixMonths(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && text >= getTomorrowIsoDate() && text <= getSixMonthsAheadIsoDate();
}

function isAllowedBookingTime(value) {
  const text = String(value || '').trim();
  const m = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return false;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes >= BOOKING_TIME_MINUTES && minutes <= BOOKING_TIME_MAX_MINUTES;
}

async function getUserBookingUsage(userId) {
  // Single round-trip: fetch both counts in one query
  if (bookingUserIdCol && requestUserIdCol) {
    const row = await dbGet(
      `SELECT
         (SELECT COUNT(*) FROM bookings WHERE ${bookingUserIdCol}=?) AS booking_count,
         (SELECT COUNT(*) FROM booking_requests WHERE ${requestUserIdCol}=? AND status='pending') AS pending_count`,
      userId, userId
    );
    const bookingCount = Number(row?.booking_count ?? 0);
    const pendingRequestCount = Number(row?.pending_count ?? 0);
    return {
      limit: BOOKING_LIMIT,
      bookingCount,
      pendingRequestCount,
      activeCount: bookingCount + pendingRequestCount,
      remaining: Math.max(0, BOOKING_LIMIT - (bookingCount + pendingRequestCount))
    };
  }
  const bookingCountRow = bookingUserIdCol
    ? await dbGet(`SELECT COUNT(*) AS count FROM bookings WHERE ${bookingUserIdCol}=?`, userId)
    : { count: 0 };
  const pendingRequestCountRow = requestUserIdCol
    ? await dbGet(`SELECT COUNT(*) AS count FROM booking_requests WHERE ${requestUserIdCol}=? AND status='pending'`, userId)
    : { count: 0 };
  const bookingCount = Number(bookingCountRow?.count ?? 0);
  const pendingRequestCount = Number(pendingRequestCountRow?.count ?? 0);
  return {
    limit: BOOKING_LIMIT,
    bookingCount,
    pendingRequestCount,
    activeCount: bookingCount + pendingRequestCount,
    remaining: Math.max(0, BOOKING_LIMIT - (bookingCount + pendingRequestCount))
  };
}

function safeJsonParse(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value;
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
    const trimmed = val.trim();
    if (NAME_INPUT_FIELDS.has(field)) {
      if (trimmed.length > NAME_MAX_LENGTH || !NAME_VALID_PATTERN.test(trimmed)) {
        return { ok: false, reason: `${field} must be ${NAME_MAX_LENGTH} characters or fewer and use letters, spaces, apostrophes, or hyphens only` };
      }
    }
    if (NUMERIC_ONLY_FIELDS.has(field) && !/^\d{11}$/.test(trimmed)) {
      return { ok: false, reason: `${field} must contain exactly 11 digits` };
    }
    if (DATE_FIELD_KEYS.has(field)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return { ok: false, reason: `${field} must be a valid date` };
      }
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
      if (trimmed > today) {
        return { ok: false, reason: `${field} cannot be in the future` };
      }
    }
  }
  if (key === 'funeral') {
    const birthDate = String(details.deceasedBirthDate || '').trim();
    const deathDate = String(details.dateOfDeath || '').trim();
    if (birthDate && deathDate && birthDate > deathDate) {
      return { ok: false, reason: 'dateOfDeath cannot be earlier than deceasedBirthDate' };
    }
  }
  return { ok: true };
}

function sanitizeNameInput(value) {
  return String(value || '')
    .replace(/[^\p{L}\p{M}\s.'-]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, NAME_MAX_LENGTH);
}

function sanitizePhoneInput(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, PHONE_MAX_LENGTH);
}

function normalizeServiceDetailsForStorage(details) {
  if (!details || typeof details !== 'object') return {};
  const normalized = { ...details };
  for (const key of Object.keys(normalized)) {
    if (NAME_INPUT_FIELDS.has(key)) {
      normalized[key] = sanitizeNameInput(normalized[key]);
    }
    if (NUMERIC_ONLY_FIELDS.has(key)) {
      normalized[key] = sanitizePhoneInput(normalized[key]);
    }
  }
  return normalized;
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
  const userIdCol = bookingRecordUserIdCol || '"userId"';
  await runner(`
    INSERT INTO booking_records (
      request_id, booking_id, ${userIdCol}, name, email, service, date, slot, details, action, note, action_by
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
  details || null,
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
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Admin only' });
  next();
}

function superadmin(req, res, next) {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Super Admin only' });
  next();
}

/* ===================== AUTH ===================== */
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const normalizedName = sanitizeNameInput(name).trim();
    if (!normalizedName || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!NAME_VALID_PATTERN.test(normalizedName)) {
      return res.status(400).json({ error: `Name must be ${NAME_MAX_LENGTH} characters or fewer and use letters, spaces, apostrophes, or hyphens only` });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const columns = hasPhoneColumn
      ? `name, email, ${passwordColumn}, phone, role, email_verified, verification_token, verification_token_expires`
      : `name, email, ${passwordColumn}, role, email_verified, verification_token, verification_token_expires`;
    const values = hasPhoneColumn
      ? [normalizedName, email, hashed, '', 'member', false, verificationToken, tokenExpires]
      : [normalizedName, email, hashed, 'member', false, verificationToken, tokenExpires];
    const result = await dbRun(
      `INSERT INTO users (${columns}) VALUES (${values.map(() => '?').join(', ')}) RETURNING id`,
      ...values
    );

    const userId = result.lastInsertRowid || result?.id || result?.rows?.[0]?.id;

    // Send verification email (non-blocking — don't fail registration if email fails)
    let emailSent = false;
    try {
      emailSent = await sendVerificationEmail(email, verificationToken);
    } catch (emailErr) {
      console.warn('Failed to send verification email:', emailErr.message);
    }

    if (!emailTransporter) {
      console.warn('SMTP not configured — verification email could not be sent for', email);
    }

    res.json({ message: 'Registration successful! Please check your email to verify your account.', emailSent, requiresVerification: true });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Register failed', err);
    res.status(500).json({ error: 'Registration failed' });
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

  // Check email verification (always enforce for non-admin users)
  if (user.email_verified === false && user.role !== 'admin' && user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox for a verification link.', requiresVerification: true, email: user.email });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

/* ========== EMAIL VERIFICATION ROUTES ========== */
app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Verification token is required' });

  try {
    const user = await dbGet('SELECT id, email, email_verified, verification_token_expires FROM users WHERE verification_token = ?', token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' });
    if (user.email_verified) return res.json({ message: 'Email already verified. You can log in.' });

    // Check token expiry
    if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }

    await dbRun('UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = ?', user.id);
    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Email verification failed:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await dbGet('SELECT id, email_verified FROM users WHERE email = ?', email);
    if (!user) return res.json({ message: 'If that email is registered, a verification link has been sent.' });
    if (user.email_verified) return res.json({ message: 'Email is already verified. You can log in.' });

    if (!emailTransporter) return res.status(503).json({ error: 'Email service is not configured' });

    const newToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await dbRun('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?', newToken, tokenExpires, user.id);

    await sendVerificationEmail(email, newToken);
    res.json({ message: 'If that email is registered, a verification link has been sent.' });
  } catch (err) {
    console.error('Resend verification failed:', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Forgot password - request reset link
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    // Always return same message to prevent email enumeration
    const user = await dbGet('SELECT id FROM users WHERE email = ?', email);
    if (!user) return res.json({ message: 'If that email is registered, a password reset link has been sent.' });

    if (!emailTransporter) return res.status(503).json({ error: 'Email service is not configured' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await dbRun(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      resetToken, tokenExpires, user.id
    );

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password failed:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });

  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const user = await dbGet(
      'SELECT id, reset_token_expires FROM users WHERE reset_token = ?',
      token
    );
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await dbRun(
      `UPDATE users SET ${passwordColumn} = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      hashed, user.id
    );

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password failed:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/* ===================== BOOKINGS ===================== */
app.get('/api/bookings', auth, async (req, res) => {
  const { limit, offset } = getPagination(req);
  const { clause, params } = buildSearchClause(req.query.q, [
    'id', 'name', 'email', 'service', 'date', 'slot'
  ]);
  const filter = String(req.query.filter || '').toLowerCase();
  const filterClause = filter === 'past'
    ? `date < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`
    : filter === 'upcoming'
      ? `date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`
      : '';

  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
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

// Public booking slots (date + slot + service) for calendar availability
app.get('/api/bookings/slots', auth, async (_, res) => {
  if (!bookingSlotCol) return res.json([]);
  const rows = await dbAll(
    `SELECT date, ${bookingSlotCol} AS slot, ${bookingServiceCol} AS service FROM bookings WHERE date::DATE >= CURRENT_DATE`
  );
  res.json(rows);
});

app.get('/api/bookings/usage', auth, async (req, res) => {
  const usage = await getUserBookingUsage(req.user.id);
  res.json(usage);
});

app.post('/api/bookings', auth, async (req, res) => {
  const { date, service } = req.body;
  const slot = normalizeSlot(req.body.slot);
  const details = normalizeServiceDetailsForStorage(normalizeDetailsPayload(req.body.details));

  try {
    if (!date || !slot || !service) {
      return res.status(400).json({ error: 'Missing date/slot/service' });
    }
    if (!isBookingDateWithinSixMonths(date)) {
      return res.status(400).json({ error: 'Bookings must be scheduled between tomorrow and 6 months ahead' });
    }
    if (!isAllowedBookingTime(slot)) {
      return res.status(400).json({ error: 'Booking time must be between 8:00 AM and 6:00 PM' });
    }
    const usage = await getUserBookingUsage(req.user.id);
    if (usage.activeCount >= BOOKING_LIMIT) {
      return res.status(409).json({
        error: `You have reached the booking limit of ${BOOKING_LIMIT} active bookings or pending requests. Please cancel one first.`
      });
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
    if (requestDetailsCol) { cols.push(requestDetailsCol); vals.push(details || {}); }
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
  const admins = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
  await Promise.all(admins.map(adminUser =>
    createNotification(
      adminUser.id,
      'request',
      `New booking request: ${service} on ${date} (${slot})`
    )
  ));
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

app.get('/api/booking-requests/:id', auth, admin, async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isFinite(requestId)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }
  const row = await dbGet('SELECT * FROM booking_requests WHERE id=?', requestId);
  if (!row) return res.status(404).json({ error: 'Request not found' });
  res.json(normalizeBookingRequest(row));
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
  const currentDetails = normalizeServiceDetailsForStorage(normalizeDetailsPayload(current.details));
  const incomingDetails = normalizeServiceDetailsForStorage(normalizeDetailsPayload(
    req.body.details !== undefined ? req.body.details : current.details
  ));
  const proposedDetails = {
    ...currentDetails,
    chapel: String(incomingDetails.chapel || currentDetails.chapel || '').trim()
  };

  if (!date || !service || !slot) {
    return res.status(400).json({ error: 'Missing date/slot/service' });
  }
  if (!isBookingDateWithinSixMonths(date)) {
    return res.status(400).json({ error: 'Requests must be scheduled between tomorrow and 6 months ahead' });
  }
  if (!isAllowedBookingTime(slot)) {
    return res.status(400).json({ error: 'Request time must be between 8:00 AM and 6:00 PM' });
  }
  const detailsValidation = validateServiceDetails(service, proposedDetails);
  if (!detailsValidation.ok) {
    return res.status(400).json({ error: detailsValidation.reason });
  }

  if (date === current.date && slot === current.slot && proposedDetails.chapel === (currentDetails.chapel || '')) {
    return res.status(400).json({ error: 'No request changes were detected' });
  }

  const existingPending = await dbGet(
    `SELECT id FROM booking_request_edit_proposals WHERE booking_request_id=? AND status='pending' ORDER BY id DESC LIMIT 1`,
    requestId
  );
  if (existingPending) {
    return res.status(409).json({ error: 'A booking request edit proposal is already pending approval' });
  }

  const proposalRow = await dbGet(`
    INSERT INTO booking_request_edit_proposals (
      booking_request_id, user_id, admin_id,
      current_request_date, current_request_slot, current_request_details,
      proposed_request_date, proposed_request_slot, proposed_request_details,
      admin_note, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    RETURNING id, booking_request_id, user_id, admin_id, current_request_date, current_request_slot, current_request_details, proposed_request_date, proposed_request_slot, proposed_request_details, admin_note, user_reply, status, reviewed_at, responded_at, created_at
  `,
    requestId,
    current.userId,
    req.user.id,
    current.date,
    current.slot,
    currentDetails,
    date,
    slot,
    proposedDetails,
    String(req.body.note || '').trim() || null
  );

  await addBookingRecord({
    requestId,
    userId: current.userId,
    name: current.name,
    email: current.email,
    service,
    date,
    slot,
    details: proposedDetails,
    action: 'request_edit_proposed',
    note: String(req.body.note || '').trim() || null,
    actionBy: req.user.id
  });

  io.emit('booking_request_edit_proposal_created', { id: proposalRow.id, requestId, status: 'pending' });

  if (current.userId) {
    await createNotification(
      current.userId,
      'request',
      `The admin has suggested changes to your booking request: ${service} on ${date} (${slot}).${String(req.body.note || '').trim() ? ` Note: ${String(req.body.note || '').trim()}` : ''}`
    );
  }

  res.json({ success: true, proposalId: proposalRow.id });
});

// Check for booking conflicts
app.get('/api/booking-requests/:id/conflicts', auth, admin, async (req, res) => {
  const requestId = Number(req.params.id);
  const row = await dbGet('SELECT * FROM booking_requests WHERE id=?', requestId);

  if (!row) return res.status(404).json({ error: 'Request not found' });

  const request = normalizeBookingRequest(row);
  
  // Get all existing bookings with the same date and time slot
  const conflicts = await dbAll(
    `SELECT * FROM bookings WHERE date = ? AND slot = ?`,
    request.date,
    normalizeSlot(request.slot)
  );

  const conflictingBookings = conflicts.map(normalizeBooking);
  
  res.json({
    hasConflicts: conflictingBookings.length > 0,
    requestData: request,
    conflictingBookings: conflictingBookings
  });
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
  if (!isBookingDateWithinSixMonths(request.date)) {
    return res.status(400).json({ error: 'Requests must be scheduled between tomorrow and 6 months ahead' });
  }
  if (!isAllowedBookingTime(slot) && !isValidSlot(slot)) {
    return res.status(400).json({ error: 'Request has invalid slot' });
  }

  const approveTxn = await transaction(async (conn) => {
    // Re-check status inside transaction to prevent race conditions
    const fresh = await conn.prepare('SELECT status FROM booking_requests WHERE id=?').get(requestId);
    if (!fresh || (fresh.status || 'pending') !== 'pending') {
      return { ok: false, reason: 'Request already processed' };
    }

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
    if (bookingDetailsCol) { cols.push(bookingDetailsCol); vals.push(request.details || null); }
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

app.get('/api/booking-request-edit-proposals/my', auth, async (req, res) => {
  const rows = await dbAll(
    `SELECT *
     FROM booking_request_edit_proposals
     WHERE user_id=?
     ORDER BY id DESC`,
    req.user.id
  );
  res.json(rows.map(normalizeBookingRequestEditProposal));
});

app.post('/api/booking-request-edit-proposals/:id/respond', auth, async (req, res) => {
  const proposalId = Number(req.params.id);
  const decision = String(req.body.decision || '').trim().toLowerCase();
  const replyMessage = String(req.body.reply_message || '').trim();

  const row = await dbGet('SELECT * FROM booking_request_edit_proposals WHERE id=?', proposalId);
  if (!row) return res.status(404).json({ error: 'Proposal not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if ((row.status || 'pending') !== 'pending') {
    return res.status(409).json({ error: 'This booking request change has already been handled' });
  }
  if (!['accept', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be accept or reject' });
  }

  const proposal = normalizeBookingRequestEditProposal(row);
  const requestRow = await dbGet('SELECT * FROM booking_requests WHERE id=?', proposal.bookingRequestId);
  if (!requestRow) return res.status(404).json({ error: 'Booking request not found' });
  const current = normalizeBookingRequest(requestRow);
  const proposedDetails = proposal.proposedDetails || {};
  const proposedDate = proposal.proposedDate;
  const proposedSlot = normalizeSlot(proposal.proposedSlot);
  const currentDate = current.date;
  const currentDetails = normalizeServiceDetailsForStorage(normalizeDetailsPayload(current.details));

  if (decision === 'accept') {
    if (!isBookingDateWithinSixMonths(proposedDate)) {
      return res.status(400).json({ error: 'Bookings must be scheduled between tomorrow and 6 months ahead' });
    }
    if (!isAllowedBookingTime(proposedSlot)) {
      return res.status(400).json({ error: 'Booking time must be between 8:00 AM and 6:00 PM' });
    }
    const detailsValidation = validateServiceDetails(current.service, proposedDetails);
    if (!detailsValidation.ok) {
      return res.status(400).json({ error: detailsValidation.reason });
    }

    // Create booking directly when proposal is accepted
    const createBookingTxn = await transaction(async (conn) => {
      const cal = await conn.prepare('SELECT max_slots, booked FROM calendar WHERE date=?').get(proposedDate);
      const maxSlots = cal?.max_slots ?? DEFAULT_MAX_SLOTS;
      const booked = cal?.booked ?? 0;

      if (booked >= maxSlots) {
        return { ok: false, reason: 'This day is fully booked' };
      }

      if (isExclusiveService(current.service) && bookingSlotCol) {
        const existing = await conn.prepare(
          `SELECT 1 FROM bookings WHERE date=? AND ${bookingSlotCol}=? LIMIT 1`
        ).get(proposedDate, proposedSlot);
        if (existing) {
          return { ok: false, reason: 'Funeral/Wedding slot is already occupied' };
        }
      }

      const cols = [];
      const vals = [];
      if (bookingUserIdCol) { cols.push(bookingUserIdCol); vals.push(current.userId); }
      if (bookingNameCol) { cols.push(bookingNameCol); vals.push(current.name); }
      if (bookingEmailCol) { cols.push(bookingEmailCol); vals.push(current.email || null); }
      if (bookingServiceCol) { cols.push(bookingServiceCol); vals.push(current.service); }
      if (bookingSlotCol) { cols.push(bookingSlotCol); vals.push(proposedSlot); }
      if (bookingDetailsCol) { cols.push(bookingDetailsCol); vals.push(proposedDetails || null); }
      cols.push('date'); vals.push(proposedDate);

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
      `).run(proposedDate, maxSlots);

      await conn.prepare(`
        UPDATE booking_requests
        SET status='approved', date=?, slot=?, details=?, reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(proposedDate, proposedSlot, proposedDetails || {}, req.user.id, proposal.bookingRequestId);

      await conn.prepare(`
        UPDATE booking_request_edit_proposals
        SET status='accepted', user_reply=?, reviewed_at=CURRENT_TIMESTAMP, responded_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(replyMessage || null, proposalId);

      return { ok: true, bookingId };
    });

    if (!createBookingTxn.ok) {
      return res.status(409).json({ error: createBookingTxn.reason });
    }

    await addBookingRecord({
      requestId: proposal.bookingRequestId,
      userId: current.userId,
      name: current.name,
      email: current.email,
      service: current.service,
      date: proposedDate,
      slot: proposedSlot,
      details: proposedDetails,
      action: 'request_edit_accepted',
      note: replyMessage || null,
      actionBy: req.user.id
    });

    if (current.userId) {
      await createNotification(
        current.userId,
        'request',
        `Your booking has been confirmed for ${current.service} on ${proposedDate} (${proposedSlot}). Accepted booking request change.`
      );
    }

    const admins = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
    await Promise.all(admins.map(adminUser =>
      createNotification(
        adminUser.id,
        'request',
        `Member accepted booking request change and booking confirmed for ${current.service} on ${proposedDate} (${proposedSlot}).${replyMessage ? ` Reply: ${replyMessage}` : ''}`
      )
    ));

    io.emit('booking_request_updated', { id: proposal.bookingRequestId, status: 'approved' });
    io.emit('booking_request_edit_proposal_updated', { id: proposalId, status: 'accepted' });
    io.emit('booking_created', { requestId: proposal.bookingRequestId, bookingId: createBookingTxn.bookingId });
    return res.json({ success: true, status: 'accepted' });
  }

  await dbRun(`
    UPDATE booking_request_edit_proposals
    SET status='rejected', user_reply=?, reviewed_at=CURRENT_TIMESTAMP, responded_at=CURRENT_TIMESTAMP
    WHERE id=?
  `, replyMessage || null, proposalId);

  await addBookingRecord({
    requestId: proposal.bookingRequestId,
    userId: current.userId,
    name: current.name,
    email: current.email,
    service: current.service,
    date: currentDate,
    slot: current.slot,
    details: currentDetails,
    action: 'request_edit_rejected',
    note: replyMessage || null,
    actionBy: req.user.id
  });

  if (current.userId) {
    await createNotification(
      current.userId,
      'request',
      `You rejected the booking request change for ${current.service} on ${currentDate}.`
    );
  }

  const admins = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
  await Promise.all(admins.map(adminUser =>
    createNotification(
      adminUser.id,
      'request',
      `Member rejected the booking request change for ${current.service} on ${currentDate}.${replyMessage ? ` Reply: ${replyMessage}` : ''}`
    )
  ));

  io.emit('booking_request_edit_proposal_updated', { id: proposalId, status: 'rejected' });
  res.json({ success: true, status: 'rejected' });
});

app.get('/api/booking-records', auth, admin, async (_, res) => {
  const { limit, offset } = getPagination(_);
  const { clause, params } = buildSearchClause(_.query.q, [
    'id', 'name', 'email', 'service', 'date', 'slot', 'action', 'details'
  ]);
  const rows = await dbAll(`
    SELECT id, request_id, booking_id, ${bookingRecordUserIdCol || '"userId"'} AS "userId", name, email, service, date, slot, details, action, note, action_by, action_at
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
    chapel: r.chapel ?? safeJsonParse(r.details)?.chapel ?? null,
    action: r.action,
    note: r.note,
    actionBy: r.action_by,
    actionAt: r.action_at
  })));
});

app.get('/api/booking-edit-proposals/my', auth, async (req, res) => {
  const rows = await dbAll(
    `SELECT *
     FROM booking_edit_proposals
     WHERE user_id=?
     ORDER BY id DESC`,
    req.user.id
  );
  res.json(rows.map(normalizeBookingEditProposal));
});

app.post('/api/booking-edit-proposals/:id/respond', auth, async (req, res) => {
  const proposalId = Number(req.params.id);
  const decision = String(req.body.decision || '').trim().toLowerCase();
  const replyMessage = String(req.body.reply_message || '').trim();

  const row = await dbGet('SELECT * FROM booking_edit_proposals WHERE id=?', proposalId);
  if (!row) return res.status(404).json({ error: 'Proposal not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if ((row.status || 'pending') !== 'pending') {
    return res.status(409).json({ error: 'This booking change has already been handled' });
  }
  if (!['accept', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be accept or reject' });
  }

  const proposal = normalizeBookingEditProposal(row);
  const booking = await dbGet('SELECT * FROM bookings WHERE id=?', proposal.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const current = normalizeBooking(booking);
  const proposedDetails = proposal.proposedDetails || {};
  const proposedDate = proposal.proposedDate;
  const proposedSlot = normalizeSlot(proposal.proposedSlot);
  const currentDate = current.date;
  const currentDetails = normalizeServiceDetailsForStorage(normalizeDetailsPayload(current.details));

  if (decision === 'accept') {
    if (!isBookingDateWithinSixMonths(proposedDate)) {
      return res.status(400).json({ error: 'Bookings must be scheduled between tomorrow and 6 months ahead' });
    }
    if (!isAllowedBookingTime(proposedSlot)) {
      return res.status(400).json({ error: 'Booking time must be between 8:00 AM and 6:00 PM' });
    }
    const detailsValidation = validateServiceDetails(current.service, proposedDetails);
    if (!detailsValidation.ok) {
      return res.status(400).json({ error: detailsValidation.reason });
    }

    const applied = await transaction(async (conn) => {
      if (isExclusiveService(current.service) && bookingSlotCol) {
        const conflict = await conn.prepare(
          `SELECT 1 FROM bookings WHERE id<>? AND date=? AND ${bookingSlotCol}=? LIMIT 1`
        ).get(booking.id, proposedDate, proposedSlot);
        if (conflict) {
          return { ok: false, reason: 'Funeral/Wedding slot is already occupied' };
        }
      }

      if (proposedDate !== currentDate) {
        const cal = await conn.prepare('SELECT max_slots, booked FROM calendar WHERE date=?').get(proposedDate);
        const maxSlots = cal?.max_slots ?? DEFAULT_MAX_SLOTS;
        const booked = cal?.booked ?? 0;
        if (booked >= maxSlots) {
          return { ok: false, reason: 'Target date is fully booked' };
        }

        await conn.prepare(
          'UPDATE calendar SET booked = CASE WHEN booked > 0 THEN booked - 1 ELSE 0 END WHERE date=?'
        ).run(currentDate);
        await conn.prepare(`
          INSERT INTO calendar (date, max_slots, booked)
          VALUES (?, ?, 1)
          ON CONFLICT(date) DO UPDATE SET booked = booked + 1
        `).run(proposedDate, maxSlots);
      }

      const serviceCol = bookingServiceCol || 'service';
      const slotCol = bookingSlotCol || 'slot';
      const detailsCol = bookingDetailsCol || 'details';

      await conn.prepare(`
        UPDATE bookings
        SET date=?, ${serviceCol}=?, ${slotCol}=?, ${detailsCol}=?
        WHERE id=?
      `).run(proposedDate, current.service, proposedSlot, proposedDetails || {}, booking.id);

      await conn.prepare(`
        UPDATE booking_edit_proposals
        SET status='accepted', user_reply=?, reviewed_at=CURRENT_TIMESTAMP, responded_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(replyMessage || null, proposalId);

      await addBookingRecord({
        bookingId: booking.id,
        userId: current.userId,
        name: current.name,
        email: current.email,
        service: current.service,
        date: proposedDate,
        slot: proposedSlot,
        details: proposedDetails,
        action: 'booking_edit_accepted',
        note: replyMessage || null,
        actionBy: req.user.id
      }, conn);

      return { ok: true };
    });

    if (!applied.ok) {
      return res.status(409).json({ error: applied.reason });
    }

    if (current.userId) {
      await createNotification(
        current.userId,
        'booking_edit',
        `You accepted the booking change for ${current.service} on ${proposedDate} (${proposedSlot}).`
      );
    }

    const admins = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
    await Promise.all(admins.map(adminUser =>
      createNotification(
        adminUser.id,
        'booking_edit',
        `Member accepted the booking change for ${current.service} on ${proposedDate} (${proposedSlot}).${replyMessage ? ` Reply: ${replyMessage}` : ''}`
      )
    ));

    io.emit('booking_updated', { id: booking.id, date: proposedDate, slot: proposedSlot, service: current.service });
    io.emit('booking_edit_proposal_updated', { id: proposalId, status: 'accepted' });
    return res.json({ success: true, status: 'accepted' });
  }

  await dbRun(`
    UPDATE booking_edit_proposals
    SET status='rejected', user_reply=?, reviewed_at=CURRENT_TIMESTAMP, responded_at=CURRENT_TIMESTAMP
    WHERE id=?
  `, replyMessage || null, proposalId);

  await addBookingRecord({
    bookingId: booking.id,
    userId: current.userId,
    name: current.name,
    email: current.email,
    service: current.service,
    date: current.date,
    slot: current.slot,
    details: currentDetails,
    action: 'booking_edit_rejected',
    note: replyMessage || null,
    actionBy: req.user.id
  });

  if (current.userId) {
    await createNotification(
      current.userId,
      'booking_edit',
      `You rejected the booking change for ${current.service} on ${currentDate}.`
    );
  }

  const admins = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
  await Promise.all(admins.map(adminUser =>
    createNotification(
      adminUser.id,
      'booking_edit',
      `Member rejected the booking change for ${current.service} on ${currentDate}.${replyMessage ? ` Reply: ${replyMessage}` : ''}`
    )
  ));

  io.emit('booking_edit_proposal_updated', { id: proposalId, status: 'rejected' });
  res.json({ success: true, status: 'rejected' });
});

app.put('/api/bookings/:id', auth, admin, async (req, res) => {
  const bookingId = Number(req.params.id);
  const row = await dbGet('SELECT * FROM bookings WHERE id=?', bookingId);
  if (!row) return res.status(404).json({ error: 'Booking not found' });

  const current = normalizeBooking(row);
  const date = req.body.date || current.date;
  const service = req.body.service || current.service;
  const slot = normalizeSlot(req.body.slot || current.slot);
  const currentDetails = normalizeServiceDetailsForStorage(normalizeDetailsPayload(current.details));
  const incomingDetails = normalizeServiceDetailsForStorage(normalizeDetailsPayload(
    req.body.details !== undefined ? req.body.details : current.details
  ));
  const proposedDetails = {
    ...currentDetails,
    chapel: String(incomingDetails.chapel || currentDetails.chapel || '').trim()
  };

  if (!date || !service || !slot) {
    return res.status(400).json({ error: 'Missing date/slot/service' });
  }
  if (!isBookingDateWithinSixMonths(date)) {
    return res.status(400).json({ error: 'Bookings must be scheduled between tomorrow and 6 months ahead' });
  }
  if (!isAllowedBookingTime(slot)) {
    return res.status(400).json({ error: 'Booking time must be between 8:00 AM and 6:00 PM' });
  }
  if (!proposedDetails.chapel) {
    return res.status(400).json({ error: 'Place / chapel is required' });
  }
  const detailsValidation = validateServiceDetails(service, proposedDetails);
  if (!detailsValidation.ok) {
    return res.status(400).json({ error: detailsValidation.reason });
  }

  if (date === current.date && slot === current.slot && proposedDetails.chapel === (currentDetails.chapel || '')) {
    return res.status(400).json({ error: 'No booking changes were detected' });
  }

  const existingPending = await dbGet(
    `SELECT id FROM booking_edit_proposals WHERE booking_id=? AND status='pending' ORDER BY id DESC LIMIT 1`,
    bookingId
  );
  if (existingPending) {
    return res.status(409).json({ error: 'A booking edit proposal is already pending approval' });
  }

  const proposalRow = await dbGet(`
    INSERT INTO booking_edit_proposals (
      booking_id, user_id, admin_id,
      current_booking_date, current_booking_slot, current_booking_details,
      proposed_booking_date, proposed_booking_slot, proposed_booking_details,
      admin_note, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    RETURNING id, booking_id, user_id, admin_id, current_booking_date, current_booking_slot, current_booking_details, proposed_booking_date, proposed_booking_slot, proposed_booking_details, admin_note, user_reply, status, reviewed_at, responded_at, created_at
  `,
    bookingId,
    current.userId,
    req.user.id,
    current.date,
    current.slot,
    currentDetails,
    date,
    slot,
    proposedDetails,
    String(req.body.note || '').trim() || null
  );

  await addBookingRecord({
    bookingId,
    userId: current.userId,
    name: current.name,
    email: current.email,
    service,
    date,
    slot,
    details: proposedDetails,
    action: 'booking_edit_proposed',
    note: String(req.body.note || '').trim() || null,
    actionBy: req.user.id
  });

  if (current.userId) {
    await createNotification(
      current.userId,
      'booking_edit',
      `A change was proposed for your booking on ${current.date}. Please review the updated place/time.`
    );
  }

  io.emit('booking_edit_proposed', { id: proposalRow?.id || null, bookingId });
  res.json({ success: true, proposal: normalizeBookingEditProposal(proposalRow) });
});

app.delete('/api/bookings/:id', auth, async (req, res) => {
  const booking = await dbGet(
    'SELECT * FROM bookings WHERE id=?',
    req.params.id
  );

  if (!booking) return res.status(404).json({ error: 'Not found' });

  const normalized = normalizeBooking(booking);
  const isOwner = normalized.userId === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

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
    ? `date < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`
    : filter === 'upcoming'
      ? `date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`
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

  // Notify all users about the new event
  const allUsers = await dbAll('SELECT id FROM users');
  await Promise.all(allUsers.map(u =>
    createNotification(u.id, 'info', `New event: ${req.body.title} on ${req.body.date}${req.body.time ? ` at ${req.body.time}` : ''}`)
  ));

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

/* ===================== MASS SERVICES ===================== */
app.get('/api/mass-services', auth, async (req, res) => {
  const { clause, params } = buildSearchClause(req.query.q, ['id', 'service_type', 'date', 'time', 'description', 'chapel']);
  const filter = String(req.query.filter || '').trim().toLowerCase();
  
  let filterClause = '';
  if (filter === 'upcoming') {
    filterClause = `"date" >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`;
  } else if (filter === 'past') {
    filterClause = `"date" < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')`;
  }

  const rows = await dbAll(`
    SELECT * FROM mass_services
    ${clause || filterClause ? `WHERE ${[clause, filterClause].filter(Boolean).join(' AND ')}` : ''}
    ORDER BY "date" ASC, "time" ASC
  `, ...params);

  res.json(rows.map(normalizeMassService));
});

app.post('/api/mass-services', auth, admin, async (req, res) => {
  const { service_type, date, time, description, chapel, capacity } = req.body;

  if (!service_type || !date || !time || !chapel) {
    return res.status(400).json({ error: 'service_type, date, time, and chapel are required' });
  }

  if (!isBookingDateWithinSixMonths(date)) {
    return res.status(400).json({ error: 'Date must be between tomorrow and 6 months ahead' });
  }

  if (!isAllowedBookingTime(time)) {
    return res.status(400).json({ error: 'Time must be between 8:00 AM and 6:00 PM' });
  }

  const row = await dbGet(`
    INSERT INTO mass_services (service_type, "date", "time", description, chapel, capacity, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `, service_type, date, time, String(description || '').trim() || null, chapel, capacity || null, req.user.id);

  io.emit('mass_service_created', { id: row.id });

  // Notify all users about the new mass service
  const allUsers = await dbAll('SELECT id FROM users');
  await Promise.all(allUsers.map(u =>
    createNotification(u.id, 'info', `New Mass Service: ${service_type} on ${date}${time ? ` at ${time}` : ''}${chapel ? ` — ${chapel}` : ''}`)
  ));

  res.json({ success: true, service: normalizeMassService(row) });
});

app.put('/api/mass-services/:id', auth, admin, async (req, res) => {
  const serviceId = Number(req.params.id);
  const { service_type, date, time, description, chapel, capacity } = req.body;

  const existing = await dbGet('SELECT id FROM mass_services WHERE id=?', serviceId);
  if (!existing) return res.status(404).json({ error: 'Mass service not found' });

  if (!date || !time || !chapel) {
    return res.status(400).json({ error: 'date, time, and chapel are required' });
  }

  await dbRun(`
    UPDATE mass_services
    SET service_type=?, "date"=?, "time"=?, description=?, chapel=?, capacity=?
    WHERE id=?
  `, service_type, date, time, String(description || '').trim() || null, chapel, capacity || null, serviceId);

  io.emit('mass_service_updated', { id: serviceId });
  await createNotification(req.user.id, 'info', `Mass Service updated: ${service_type}`);

  res.json({ success: true });
});

app.delete('/api/mass-services/:id', auth, admin, async (req, res) => {
  const serviceId = Number(req.params.id);
  
  const existing = await dbGet('SELECT id FROM mass_services WHERE id=?', serviceId);
  if (!existing) return res.status(404).json({ error: 'Mass service not found' });

  await dbRun('DELETE FROM mass_services WHERE id=?', serviceId);
  io.emit('mass_service_deleted', { id: serviceId });
  await createNotification(req.user.id, 'info', `Mass Service deleted`);

  res.json({ success: true });
});

// Get applications for a mass service
app.get('/api/mass-services/:id/applications', auth, admin, async (req, res) => {
  const serviceId = Number(req.params.id);
  const status = String(req.query.status || '').trim().toLowerCase();

  const existing = await dbGet('SELECT id FROM mass_services WHERE id=?', serviceId);
  if (!existing) return res.status(404).json({ error: 'Mass service not found' });

  let query = 'SELECT * FROM mass_service_applications WHERE mass_service_id=?';
  const params = [serviceId];

  if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
    query += ' AND status=?';
    params.push(status);
  }

  query += ' ORDER BY applied_at DESC';

  const rows = await dbAll(query, ...params);
  const applications = rows.map(row => ({
    ...normalizeMassServiceApplication(row),
    applicant: null  // Will be fetched by frontend if needed
  }));

  res.json(applications);
});

// User applies to mass service
app.post('/api/mass-services/:id/apply', auth, async (req, res) => {
  const serviceId = Number(req.params.id);
  const formData = req.body.form_data || {};

  const service = await dbGet('SELECT * FROM mass_services WHERE id=?', serviceId);
  if (!service) return res.status(404).json({ error: 'Mass service not found' });

  // Check if user already applied
  const existing = await dbGet(`
    SELECT id FROM mass_service_applications
    WHERE mass_service_id=? AND user_id=? AND status NOT IN ('rejected', 'cancelled')
  `, serviceId, req.user.id);

  if (existing) {
    return res.status(409).json({ error: 'You have already applied for this service' });
  }

  // Check capacity if set
  if (service.capacity) {
    const approved = await dbGet(`
      SELECT COUNT(*) as count FROM mass_service_applications
      WHERE mass_service_id=? AND status='approved'
    `, serviceId);
    if (Number(approved?.count || 0) >= service.capacity) {
      return res.status(409).json({ error: 'This service is at full capacity' });
    }
  }

  const row = await dbGet(`
    INSERT INTO mass_service_applications (mass_service_id, user_id, service_type, form_data, status)
    VALUES (?, ?, ?, ?, 'pending')
    RETURNING *
  `, serviceId, req.user.id, service.service_type, JSON.stringify(formData));

  io.emit('mass_service_application_created', { service_id: serviceId, app_id: row.id });
  await createNotification(req.user.id, 'request', `Your application for ${service.service_type} is pending admin review`);

  const adminUsers = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
  for (const adminUser of adminUsers) {
    await createNotification(adminUser.id, 'info', `New application for ${service.service_type} (${service.date})`);
  }

  res.json({ success: true, application: normalizeMassServiceApplication(row) });
});

// Admin approves application
app.post('/api/mass-services/applications/:appId/approve', auth, admin, async (req, res) => {
  const appId = Number(req.params.appId);
  
  const app = await dbGet('SELECT * FROM mass_service_applications WHERE id=?', appId);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(409).json({ error: 'Application is not pending' });

  const service = await dbGet('SELECT * FROM mass_services WHERE id=?', app.mass_service_id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  // Check capacity
  if (service.capacity) {
    const approved = await dbGet(`
      SELECT COUNT(*) as count FROM mass_service_applications
      WHERE mass_service_id=? AND id<>? AND status='approved'
    `, app.mass_service_id, appId);
    if (Number(approved?.count || 0) >= service.capacity) {
      return res.status(409).json({ error: 'This service is at full capacity' });
    }
  }

  await dbRun(`
    UPDATE mass_service_applications
    SET status='approved', reviewed_at=NOW(), reviewed_by=?
    WHERE id=?
  `, req.user.id, appId);

  io.emit('mass_service_application_updated', { app_id: appId, status: 'approved' });
  await createNotification(app.user_id, 'approved', `Your application for ${service.service_type} (${service.date}) was APPROVED`);
  await createNotification(req.user.id, 'info', `Application approved for ${service.service_type}`);

  res.json({ success: true });
});

// Admin rejects application
app.post('/api/mass-services/applications/:appId/reject', auth, admin, async (req, res) => {
  const appId = Number(req.params.appId);
  const reason = String(req.body.reason || '').trim();

  const app = await dbGet('SELECT * FROM mass_service_applications WHERE id=?', appId);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(409).json({ error: 'Application is not pending' });

  const service = await dbGet('SELECT * FROM mass_services WHERE id=?', app.mass_service_id);

  await dbRun(`
    UPDATE mass_service_applications
    SET status='rejected', reviewed_at=NOW(), reviewed_by=?, rejection_reason=?
    WHERE id=?
  `, req.user.id, reason || null, appId);

  io.emit('mass_service_application_updated', { app_id: appId, status: 'rejected' });
  await createNotification(
    app.user_id,
    'rejected',
    `Your application for ${service?.service_type} was REJECTED${reason ? '. Reason: ' + reason : ''}`
  );
  await createNotification(req.user.id, 'info', `Application rejected for ${service?.service_type}`);

  res.json({ success: true });
});

// User cancels application (pending only) or requests cancellation (approved)
app.post('/api/mass-services/applications/:appId/cancel', auth, async (req, res) => {
  const appId = Number(req.params.appId);
  const reason = String(req.body.reason || '').trim();

  const app = await dbGet('SELECT * FROM mass_service_applications WHERE id=? AND user_id=?', appId, req.user.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  if (app.status !== 'pending' && app.status !== 'approved') {
    return res.status(409).json({ error: 'Cannot cancel this application' });
  }

  // Pending can be cancelled without reason, approved requires reason
  if (app.status === 'approved' && !reason) {
    return res.status(400).json({ error: 'Reason is required to cancel approved application' });
  }

  await dbRun(`
    UPDATE mass_service_applications
    SET status='cancelled', cancellation_reason=?, cancelled_at=NOW(), cancelled_by=?
    WHERE id=?
  `, app.status === 'approved' ? reason : null, req.user.id, appId);

  const service = await dbGet('SELECT * FROM mass_services WHERE id=?', app.mass_service_id);
  io.emit('mass_service_application_updated', { app_id: appId, status: 'cancelled' });
  
  await createNotification(req.user.id, 'info', `Your application for ${service?.service_type} has been cancelled`);
  const adminUsers = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
  for (const adminUser of adminUsers) {
    await createNotification(adminUser.id, 'info', `Application cancelled for ${service?.service_type}`);
  }

  res.json({ success: true });
});

// Get user's applications
app.get('/api/mass-services/my-applications', auth, async (req, res) => {
  const rows = await dbAll(`
    SELECT msa.*, ms.service_type, ms."date", ms."time", ms.description, ms.chapel
    FROM mass_service_applications msa
    JOIN mass_services ms ON msa.mass_service_id = ms.id
    WHERE msa.user_id=?
    ORDER BY msa.applied_at DESC
  `, req.user.id);

  res.json(rows.map(row => ({
    ...normalizeMassServiceApplication(row),
    service: {
      date: row.date,
      time: row.time,
      description: row.description,
      chapel: row.chapel
    }
  })));
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
  const usageRow = await dbGet(`
    SELECT COUNT(*) AS count
    FROM concerns
    WHERE ${concernUserIdCol || '"userId"'} = ?
      AND LOWER(COALESCE(status, '')) <> 'resolved'
  `, req.user.id);
  const activeCount = Number(usageRow?.count || 0);
  if (activeCount >= CONCERN_LIMIT) {
    return res.status(400).json({
      error: `You have reached the limit of ${CONCERN_LIMIT} active concerns. Please close one first.`
    });
  }
  await dbRun(
    `INSERT INTO concerns (${concernUserIdCol || '"userId"'}, name, email, subject, message, status)
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
  const adminUsers = await dbAll(`SELECT id FROM users WHERE role IN ('admin', 'superadmin')`);
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
    SELECT id, ${concernUserIdCol || '"userId"'} AS "userId", name, email, subject, message, status, created_at, resolved_at, resolved_by, resolution_note,
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
    SELECT id, ${concernUserIdCol || '"userId"'} AS "userId", name, email, subject, message, status, created_at, resolved_at, resolved_by, resolution_note,
           reply_message, replied_at, replied_by
    FROM concerns
    WHERE ${concernUserIdCol || '"userId"'}=?
    ${clause ? `AND ${clause}` : ''}
    ORDER BY created_at DESC, id DESC
    ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
  `, req.user.id, ...params);
  res.json(rows);
});

app.get('/api/concerns/usage', auth, async (req, res) => {
  const row = await dbGet(`
    SELECT COUNT(*) AS count
    FROM concerns
    WHERE ${concernUserIdCol || '"userId"'} = ?
      AND LOWER(COALESCE(status, '')) <> 'resolved'
  `, req.user.id);
  const activeCount = Number(row?.count || 0);
  res.json({
    limit: CONCERN_LIMIT,
    activeCount,
    remaining: Math.max(0, CONCERN_LIMIT - activeCount)
  });
});

app.put('/api/concerns/:id', auth, admin, async (req, res) => {
  const concernId = Number(req.params.id);
  const status = String(req.body.status || '').trim() || 'open';
  const resolutionNote = String(req.body.resolution_note || '').trim();
  const replyMessage = String(req.body.reply_message || '').trim();
  const row = await dbGet(`SELECT id,status,${concernUserIdCol || '"userId"'} AS "userId" FROM concerns WHERE id=?`, concernId);
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
    userId: row.userId ?? row.userid ?? row.user_id,
    reply_message: replyMessage || null
  });
  if (replyMessage) {
    await createNotification(
      row.userId ?? row.userid ?? row.user_id,
      'concern_update',
      'Admin replied to your concern'
    );
  } else {
    await createNotification(
      row.userId ?? row.userid ?? row.user_id,
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
  const row = await dbGet(`SELECT id,${concernUserIdCol || '"userId"'} AS "userId",status FROM concerns WHERE id=?`, concernId);
  if (!row) return res.status(404).json({ error: 'Concern not found' });
  const concernOwnerId = row.userId ?? row.userid ?? row.user_id;
  if (concernOwnerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  await dbRun(
    `UPDATE concerns
     SET status='resolved', resolved_at=?, resolved_by=NULL, resolution_note=?
     WHERE id=?`,
    new Date().toISOString(),
    'Closed by user',
    concernId
  );
  io.emit('concern_updated', { id: concernId, status: 'resolved', userId: concernOwnerId });
  await createNotification(
    concernOwnerId,
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

// Change user role (superadmin only)
app.put('/api/users/:id/role', auth, superadmin, async (req, res) => {
  const targetId = Number(req.params.id);
  const { role } = req.body;

  if (!['member', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "member" or "admin"' });
  }

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const target = await dbGet('SELECT id, role FROM users WHERE id=?', targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'superadmin') {
    return res.status(403).json({ error: 'Cannot change the role of a super admin' });
  }

  await dbRun('UPDATE users SET role=? WHERE id=?', role, targetId);
  res.json({ success: true, message: `User role updated to ${role}` });
});

// Manually verify a user's email (admin only)
app.put('/api/users/:id/verify-email', auth, admin, async (req, res) => {
  const targetId = Number(req.params.id);
  const target = await dbGet('SELECT id, name, email, email_verified FROM users WHERE id=?', targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.email_verified) return res.json({ success: true, message: `${target.name}'s email is already verified.` });

  await dbRun('UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = ?', targetId);
  res.json({ success: true, message: `Email for ${target.name} has been manually verified.` });
});

// Delete user account (superadmin only)
app.delete('/api/users/:id', auth, superadmin, async (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const target = await dbGet('SELECT id, role, name FROM users WHERE id=?', targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'superadmin') {
    return res.status(403).json({ error: 'Cannot delete a super admin account' });
  }

  // Clean up user's related data across all tables
  try {
    const bkCol = bookingUserIdCol || '"userId"';
    const brCol = bookingRecordUserIdCol || '"userId"';
    const rqCol = requestUserIdCol || '"userId"';
    const cnCol = concernUserIdCol || '"userId"';
    const ntCol = notificationUserIdCol || '"userId"';

    await dbRun(`DELETE FROM notifications WHERE ${ntCol} = ?`, targetId);
    await dbRun(`DELETE FROM concerns WHERE ${cnCol} = ?`, targetId);
    await dbRun(`DELETE FROM booking_records WHERE ${brCol} = ?`, targetId);
    await dbRun('DELETE FROM booking_edit_proposals WHERE user_id = ?', targetId);
    await dbRun('DELETE FROM booking_request_edit_proposals WHERE user_id = ?', targetId);
    await dbRun(`DELETE FROM booking_requests WHERE ${rqCol} = ?`, targetId);
    await dbRun(`DELETE FROM bookings WHERE ${bkCol} = ?`, targetId);
    await dbRun('DELETE FROM mass_service_applications WHERE user_id = ?', targetId);
    await dbRun('DELETE FROM users WHERE id=?', targetId);
    res.json({ success: true, message: `User ${target.name} has been deleted` });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user. Please try again.' });
  }
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

  const normalizedName = name === undefined ? undefined : sanitizeNameInput(name).trim();
  if (name !== undefined && (!normalizedName || !NAME_VALID_PATTERN.test(normalizedName))) {
    return res.status(400).json({ error: `Name must be ${NAME_MAX_LENGTH} characters or fewer and use letters, spaces, apostrophes, or hyphens only` });
  }

  if (email && email !== existing.email) {
    const duplicate = await dbGet('SELECT id FROM users WHERE email=? AND id<>?', email, userId);
    if (duplicate) return res.status(409).json({ error: 'Email already in use' });
    updates.push('email=?');
    values.push(email);
    // Reset email verification when email changes
    updates.push('email_verified=?');
    values.push(false);
    updates.push('verification_token=?');
    const newToken = crypto.randomBytes(32).toString('hex');
    values.push(newToken);
    updates.push('verification_token_expires=?');
    values.push(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    // Send verification email for the new address
    sendVerificationEmail(email, newToken).catch(err => console.error('Failed to send re-verification email:', err));
  }

  if (normalizedName && normalizedName !== existing.name) {
    updates.push('name=?');
    values.push(normalizedName);
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
  const userIdCol = notificationUserIdCol || '"userId"';
  const result = await dbRun(
    `INSERT INTO notifications (${userIdCol}, type, text, read)
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
    WHERE ${userIdCol}=?
      AND id NOT IN (
        SELECT id FROM notifications
        WHERE ${userIdCol}=?
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
     WHERE ${notificationUserIdCol || '"userId"'}=?
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
  await dbRun(`UPDATE notifications SET read=1 WHERE ${notificationUserIdCol || '"userId"'}=? AND id IN (${ids.map(() => '?').join(',')})`, req.user.id, ...ids);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  await dbRun(`DELETE FROM notifications WHERE id=? AND ${notificationUserIdCol || '"userId"'}=?`, id, req.user.id);
  res.json({ success: true });
});

app.delete('/api/notifications', auth, async (req, res) => {
  await dbRun(`DELETE FROM notifications WHERE ${notificationUserIdCol || '"userId"'}=?`, req.user.id);
  res.json({ success: true });
});

/* ===================== MONITORING & HEALTH CHECK ===================== */

/**
 * Health check endpoint - used by Render/uptime monitoring
 */
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - serverStartTime) / 1000),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
    }
  });
});

/**
 * System info endpoint
 */
app.get('/api/system-info', auth, async (req, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const mem = process.memoryUsage();
  res.json({
    system: 'Church Booking System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    uptime: Math.round((Date.now() - serverStartTime) / 1000),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
    },
    database: {
      type: 'PostgreSQL (Supabase)',
      status: 'connected'
    },
    features: {
      authentication: 'JWT',
      rateLimiting: 'enabled',
      security: 'hardened',
      realtime: 'socket.io'
    }
  });
});

/* ===================== SOCKET ===================== */
let connectedSockets = 0;

io.on('connection', (s) => {
  connectedSockets++;
  console.log(`Socket connected: ${s.id} (total: ${connectedSockets})`);
  s.on('disconnect', (reason) => {
    connectedSockets--;
    console.log(`Socket disconnected: ${s.id} ${reason} (total: ${connectedSockets})`);
  });
});

/* ===================== GLOBAL ERROR HANDLER ===================== */
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

/* ===================== START SERVER ===================== */
const PORT = Number(process.env.PORT) || 5000;

(async () => {
  await warmPool();
  await initDatabase();
  await ensureAdminUser();
  server.listen(PORT, () => {
  console.log(`PostgreSQL server running on port ${PORT}`);
});
})().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
