# DEPLOYMENT QUICK START CHECKLIST

**Fastest way to go from SQLite to production in 30 minutes**

---

## 🎯 PHASE 1: DATABASE (5 minutes)

- [ ] Go to https://supabase.com
- [ ] Sign up with GitHub
- [ ] Create new project called "church-db"
- [ ] Wait for project to initialize (2-3 min)
- [ ] Go to **Settings → Database** and copy Connection String
- [ ] Paste this in notepad (you'll need it later)

---

## 📝 PHASE 2: CREATE TABLES (3 minutes)

- [ ] In Supabase, go to **SQL Editor → New Query**
- [ ] Paste the SQL from `church-backend/schema.sql` (provided below)
- [ ] Click **Run**
- [ ] Verify all 8 tables appear in **Table Editor**

### Schema SQL (Copy this exact text):

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id),
  name TEXT,
  email TEXT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL,
  service TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_requests (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id),
  name TEXT,
  email TEXT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL,
  service TEXT NOT NULL,
  details JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_records (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES booking_requests(id),
  booking_id INTEGER REFERENCES bookings(id),
  "userId" INTEGER REFERENCES users(id),
  name TEXT,
  email TEXT,
  service TEXT,
  date TEXT,
  slot TEXT,
  details JSONB,
  action TEXT,
  note TEXT,
  action_by INTEGER REFERENCES users(id),
  action_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar (
  id SERIAL PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  max_slots INTEGER DEFAULT 5,
  booked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS concerns (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id),
  name TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  resolution_note TEXT,
  reply_message TEXT,
  replied_at TIMESTAMP,
  replied_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  type TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read INTEGER DEFAULT 0
);

CREATE INDEX idx_bookings_userId ON bookings("userId");
CREATE INDEX idx_booking_requests_userId ON booking_requests("userId");
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_booking_records_request_id ON booking_records(request_id);
CREATE INDEX idx_concerns_userId ON concerns("userId");
CREATE INDEX idx_concerns_status ON concerns(status);
CREATE INDEX idx_notifications_userId ON notifications("userId");
CREATE INDEX idx_events_date ON events(date);
```

---

## 💻 PHASE 3: UPDATE BACKEND CODE (5 minutes)

### Step 1: Update Dependencies
- [ ] Replace `church-backend/package.json` with the version from this guide
- [ ] Delete `church-backend/package-lock.json`
- [ ] Run: `npm install` in church-backend folder

### Step 2: Update Database Connection
- [ ] Replace `church-backend/db.js` with the new Supabase version

### Step 3: Update SQL Queries
- [ ] Open `church-backend/server.js`
- [ ] Find & Replace (Ctrl+H):
  - [ ] `date('now')` → `CAST(now() AS date)` (2 replacements)
  - [ ] `date >= ` part needs the same change

### Step 4: Update Environment
- [ ] Add to `church-backend/.env`:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?sslmode=require
JWT_SECRET=your-secret-key-here
AUTO_SEED_ADMIN=true
ADMIN_EMAIL=admin@church.com
```

Replace `[PASSWORD]` and `[HOST]` from your Supabase connection string!

---

## 🚀 PHASE 4: DEPLOY BACKEND (10 minutes)

- [ ] Go to https://render.com
- [ ] Sign up with GitHub
- [ ] Click **New → Web Service**
- [ ] Connect your GitHub repo → select church-project
- [ ] Set **Root Directory** to `church-backend`
- [ ] Set **Build Command** to `npm install`
- [ ] Set **Start Command** to `npm start`
- [ ] Click **Create Web Service**
- [ ] Wait for deploy to FAIL (missing DATABASE_URL)
- [ ] Go to **Settings → Environment**
- [ ] Add these variables:
  - `DATABASE_URL` = Your Supabase connection string
  - `JWT_SECRET` = Random string (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
  - `AUTO_SEED_ADMIN` = `true`
  - `ADMIN_EMAIL` = `admin@church.com`
  - `ADMIN_PASSWORD` = Your secure password
  - `NODE_ENV` = `production`

- [ ] Click **Deploy latest commit**
- [ ] Wait 2-3 minutes
- [ ] Check **Logs** for "server running" message
- [ ] Copy your Render URL (looks like `https://church-backend-xxxx.onrender.com`)

---

## 🎨 PHASE 5: DEPLOY FRONTEND (10 minutes)

- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Click **Add New → Project**
- [ ] Select your church-project repo
- [ ] Set **Root Directory** to `church-frontend`
- [ ] Click **Import**
- [ ] Go to **Environment Variables**
- [ ] Add:
  - Name: `REACT_APP_API_BASE_URL`
  - Value: Your Render backend URL (from Phase 4)
- [ ] Click **Deploy**
- [ ] Wait 5 minutes for build
- [ ] Copy your Vercel URL (looks like `https://church-project-xxxx.vercel.app`)

---

## ✅ PHASE 6: VERIFY (2 minutes)

### Test Backend
- [ ] Open: `https://church-backend-xxxx.onrender.com/api/booking-requests/count`
- [ ] Should return: `{"count":0}`

### Test Frontend
- [ ] Open: `https://church-project-xxxx.vercel.app`
- [ ] Should see login page
- [ ] Try to register with test email
- [ ] Try to login

---

## 🎉 YOU'RE LIVE!

Your app is now live at:
- **Frontend**: `https://church-project-xxxx.vercel.app`
- **Backend**: `https://church-backend-xxxx.onrender.com`
- **Database**: Supabase (fully managed)

**Total Cost: $0/month** ✅

---

## ⚠️ IF SOMETHING BREAKS

**Backend won't start?**
- Check Render Logs tab
- Look for DATABASE_URL error
- Verify connection string is correct

**Frontend shows blank page?**
- Check browser Console (F12)
- Check Vercel Logs tab  
- Verify REACT_APP_API_BASE_URL is set

**Can't login?**
- Check Supabase Database is online
- Verify admin user was created (should happen automatically)
- Check backend logs

**Still stuck?**
- Run backend locally: `npm install && npm start` in church-backend
- Test at `http://localhost:4000/api/users`
- Check database connection string in `.env`

---

## File Checklist

Before deploying, ensure you have:
- [ ] `db.supabase.js` - New Supabase connection
- [ ] `package.supabase.json` - Updated dependencies  
- [ ] Updated `server.js` - SQL changes applied
- [ ] Updated `.env` - DATABASE_URL set

