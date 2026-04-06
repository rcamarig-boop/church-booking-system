# Complete Deployment Guide: Church Project

This guide covers the recommended setup:
- **Database**: Supabase (PostgreSQL) - FREE ✅
- **Backend**: Render - FREE ✅  
- **Frontend**: Vercel - FREE ✅

**Total Cost: $0/month** (for your project size)

---

## PHASE 1: SUPABASE DATABASE SETUP

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project" → Sign up with GitHub or email (recommended: GitHub for easier integration)
3. Confirm email if using email signup
4. Create new organization (name: "Church Project")

### Step 2: Create Supabase Project
1. Click "New Project"
2. **Project name**: `church-db`
3. **Database password**: Create a STRONG password (save this!)
4. **Region**: Choose closest to your users (e.g., US-East if in USA)
5. Click "Create new project" and wait 2-3 minutes for setup

### Step 3: Get Database Connection String
1. Once project loads, go to **Settings** (bottom left gear icon)
2. Click **Database** in left menu
3. Scroll down to "Connection pooling" section
4. Copy the "Connection string" (URI format)
   - It looks like: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
5. **IMPORTANT**: Save this securely - you'll need it later!

### Step 4: Create Database Schema
Now run the SQL to create tables. In Supabase:

1. Go to **SQL Editor** (left sidebar, under Database)
2. Click **New Query**
3. Paste this entire SQL:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
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

-- Booking requests table
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

-- Booking records table
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

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calendar table
CREATE TABLE IF NOT EXISTS calendar (
  id SERIAL PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  max_slots INTEGER DEFAULT 5,
  booked INTEGER DEFAULT 0
);

-- Concerns table
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

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  type TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read INTEGER DEFAULT 0
);

-- Create indexes for faster queries
CREATE INDEX idx_bookings_userId ON bookings("userId");
CREATE INDEX idx_booking_requests_userId ON booking_requests("userId");
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_booking_records_request_id ON booking_records(request_id);
CREATE INDEX idx_concerns_userId ON concerns("userId");
CREATE INDEX idx_concerns_status ON concerns(status);
CREATE INDEX idx_notifications_userId ON notifications("userId");
CREATE INDEX idx_events_date ON events(date);
```

4. Click **Run** (blue button, top right)
5. You should see "Success" message

### Step 5: Verify Schema
1. Go to **Table Editor** (left sidebar)
2. You should see all 8 tables listed:
   - users
   - bookings
   - booking_requests
   - booking_records
   - events
   - calendar
   - concerns
   - notifications

**✅ Supabase database is ready!**

---

## PHASE 2: UPDATE YOUR BACKEND CODE

### Step 1: Update package.json
Replace your `church-backend/package.json` with:

```json
{
  "name": "church-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "dotenv": "^17.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "node-cron": "^3.0.2",
    "nodemailer": "^8.0.1",
    "pg": "^8.11.3",
    "socket.io": "^4.7.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

Key change: The backend now uses `pg`

### Step 2: Replace db.js
Keep your `church-backend/db.js` in place. The current version already uses PostgreSQL.

### Step 3: Update server.js SQL Queries
Replace your `church-backend/server.js` with the PostgreSQL-compatible version.

**Key SQL changes needed:**
- Replace `date('now')` with `CAST(now() AS date)`
- Replace `datetime('now')` with `NOW()`
- Keep `CURRENT_TIMESTAMP` as-is (works in both)
- Change `lastInsertRowid` to work with RETURNING clause

See the updated server.js provided in this guide.

### Step 4: Update .env file
Modify `church-backend/.env`:

```env
# Database - from Supabase
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production

# Admin seeding
AUTO_SEED_ADMIN=true
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@church.com
ADMIN_PASSWORD=admin1234

# Server
PORT=4000
NODE_ENV=production
```

**Replace the placeholders in DATABASE_URL with values from Supabase!**

---

## PHASE 3: DEPLOY BACKEND TO RENDER

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended) or email
3. Verify email if needed

### Step 2: Connect GitHub Repository
1. In Render dashboard, click **"New"** → **"Web Service"**
2. Click **"Connect a Repository"** 
3. Connect your GitHub account (if not already)
4. Select your church-project repository
5. If not in list, click "Refresh repositories"

### Step 3: Configure Web Service
1. **Name**: `church-backend`
2. **Root Directory**: `church-backend`
3. **Runtime**: `Node`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Plan**: Free
7. Click **Create Web Service**

### Step 4: Add Environment Variables
Wait for initial deploy to fail (it will, missing DATABASE_URL).

1. Go to **Settings** (top menu of your service)
2. Scroll to **Environment**
3. Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your full Supabase connection string (from Phase 1, Step 3) |
| `JWT_SECRET` | Generate a random string (→ `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `AUTO_SEED_ADMIN` | `true` |
| `ADMIN_EMAIL` | `admin@church.com` |
| `ADMIN_PASSWORD` | Change this to something secure! |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |

4. Scroll up and click **"Deploy latest commit"**
5. Wait 2-3 minutes for deployment

### Step 5: Verify Deployment
1. Go to the **Logs** tab
2. Look for message: `PostgreSQL server running on port 4000`
3. Click your service URL (top of page) to test
4. Should see error `Cannot GET /` (that's OK - no frontend route yet)

**Get your backend URL**: It looks like `https://church-backend-xxxx.onrender.com`

**✅ Backend is deployed!**

---

## PHASE 4: DEPLOY FRONTEND TO VERCEL

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your GitHub repos

### Step 2: Import Project
1. Click **"Add New"** → **"Project"**
2. Select your `church-project` repository
3. Click **Import**

### Step 3: Configure Project
1. **Framework Preset**: React
2. **Root Directory**: `church-frontend`
3. **Build Command**: `npm run build` (should be auto-detected)
4. **Install Command**: `npm install` (should be auto-detected)
5. **Output Directory**: `build` (should be auto-detected)

### Step 4: Add Environment Variables
Before deploying, add environment variables:

1. Under "**Environment Variables**", add:
   - **Name**: `REACT_APP_API_BASE_URL`
   - **Value**: Your Render backend URL (e.g., `https://church-backend-xxxx.onrender.com`)
3. Click **"Add"**
4. Make sure it shows in the list

### Step 5: Deploy
1. Click **"Deploy"** button (bottom right)
2. Wait 3-5 minutes for build and deployment
3. You should see "Congratulations! Your project has been successfully deployed"

### Step 6: Update Frontend API Configuration
Your frontend needs to know the API URL. 

In `church-frontend/src/api.js`, ensure it uses:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
```

If not already there, update the file.

**Get your frontend URL**: It appears at top of Vercel dashboard (looks like `https://church-project-xxxx.vercel.app`)

### Step 7: Connect Backend to Frontend
The frontend is now deployed but needs to call the backend. The environment variable you added should handle this.

If API calls still point to `localhost:4000`, rebuild in Vercel:
1. Go to your Vercel project
2. Click **"Deployments"** tab
3. Find latest deployment, click **"..."** 
4. Click **"Redeploy"**

**✅ Frontend is deployed!**

---

## PHASE 5: FINAL TESTING

### Test Backend API
1. Open browser: `https://church-backend-xxxx.onrender.com/api/booking-requests/count`
2. Should return: `{"count":0}`

### Test Frontend
1. Open your Vercel URL in browser
2. You should see the login page
3. Try to:
   - **Register** a new account
   - **Login** with those credentials
   - Create a booking request
   - Check admin dashboard (login as admin@church.com / admin1234)

### Troubleshooting

**"Cannot POST /api/auth/register"**
- Backend URL in frontend is wrong
- Re-check REACT_APP_API_BASE_URL in Vercel environment

**Login fails**
- Database not initialized properly
- Check Render logs for errors
- Verify DATABASE_URL is correct

**Slow page loads**
- Render free tier has 15-minute auto-sleep
- First request takes 30-60 seconds
- This is normal for free tier

---

## PHASE 6: CUSTOM DOMAIN (OPTIONAL)

### Add Domain to Vercel Frontend
1. In Vercel project → **Settings** → **Domains**
2. Enter your domain (e.g., churchweb.com)
3. Follow DNS instructions
4. Takes 5-10 minutes to propagate

### Add Domain to Render Backend (Optional)
1. In Render service → **Settings** → **Custom Domains**
2. Add your backend domain (e.g., api.churchweb.com)
3. Follow DNS instructions

---

## BACKUP & MONITORING

### Database Backups
Supabase automatically backs up daily. No action needed.
- To manually backup: Supabase Dashboard → Database → Backups

### Monitoring
Check regularly:
- **Render Logs**: Errors in backend
- **Vercel Logs**: Frontend build/runtime errors  
- **Supabase Metrics**: Database activity

---

## COST SUMMARY

| Service | Cost | Limit |
|---------|------|-------|
| Supabase | $0 | 500MB database, unlimited API |
| Render | $0 | Free tier web service |
| Vercel | $0 | Unlimited deployments |
| **TOTAL** | **$0** | Generous for small projects |

When you grow beyond limits:
- Supabase: $25/month Pro
- Render: $7/month for 0.5GB RAM
- Vercel: $20/month Pro

---

## COMMON ISSUES & FIXES

**Issue**: "FATAL: password authentication failed"
- **Fix**: Check DATABASE_URL is copied correctly from Supabase
- Database passwords are case-sensitive!

**Issue**: Database times out
- **Fix**: Supabase might be sleeping, wait 30 seconds and try again

**Issue**: Frontend can't reach backend
- **Fix**: Check CORS is enabled in server.js: `app.use(cors());`
- Verify backend is actually running (check Render logs)

**Issue**: "socket.io connection failed"  
- **Fix**: This is normal in some browsers
- App will still work via HTTP requests

---

## NEXT STEPS

Once deployed:

1. **Change Admin Password** (in admin dashboard or DB)
2. **Configure Email** (for notifications) - update ADMIN_EMAIL
3. **Set Up Custom Domain** (Phase 6)
4. **Train Users** on the platform
5. **Monitor Performance** via Vercel/Render dashboards

---

## SUPPORT

If issues arise:
- Check Render logs: Service dashboard → Logs
- Check Vercel logs: Deployments → Logs
- Check Supabase dashboard for database status
- Test API directly: `https://backend-url/api/users` (should get 401 Unauthorized - expected if not authenticated)
