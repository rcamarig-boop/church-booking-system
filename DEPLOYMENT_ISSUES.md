# Deployment Troubleshooting Guide

## 🔴 Database Connection Issues - RESOLUTION

### Problem: "No data from database after update"

This is typically caused by **Environment Variable Misconfiguration** or **Port Mismatch**.

---

## ⚠️ Critical Issues Found

### Issue 1: Backend Port Mismatch
**File:** `church-frontend/src/api.js` (Line 2)
```javascript
const DEFAULT_API_BASE = 'http://localhost:4000/api';  // ❌ WRONG - Backend runs on 5000
```

**Should be:**
```javascript
const DEFAULT_API_BASE = 'http://localhost:5000/api';  // ✅ CORRECT
```

### Issue 2: Missing DATABASE_URL in Production
**File:** `church-backend/db.js` (Line 7)
```javascript
connectionString: process.env.DATABASE_URL  // Must be set!
```

The backend REQUIRES the `DATABASE_URL` environment variable to connect to PostgreSQL/Supabase.

---

## 📋 Deployment Checklist

### ✅ Local Development Setup

1. **Backend Environment (.env file)**
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/church_db
   JWT_SECRET=your-very-secret-key-here
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM=your-verified-sender@example.com
   NODE_ENV=development
   ```

2. **Backend Port Configuration**
   ```bash
   cd church-backend
   npm start  # Default port: 5000
   ```
   Check: http://localhost:5000/api/health (if endpoint exists)

3. **Frontend Environment (.env file)**
   ```
   REACT_APP_API_BASE_URL=http://localhost:5000/api
   REACT_APP_API_URL=http://localhost:5000/api
   NODE_ENV=development
   ```

4. **Frontend Port Configuration**
   ```bash
   cd church-frontend
   npm start  # Default port: 3000
   ```

---

### 🚀 Production Deployment (Render + Netlify)

#### Backend (Render.com)

1. **Environment Variables in Render Dashboard**
   ```
   DATABASE_URL = postgresql://user:password@host:5432/dbname
   JWT_SECRET = production-secret-key
   SENDGRID_API_KEY = SG.your-api-key-here
   SENDGRID_FROM = your-verified-sender@example.com
   NODE_ENV = production
   PORT = 5000
   ```

2. **Build Command**
   ```
   npm install
   ```

3. **Start Command**
   ```
   node server.js
   ```

4. **Verify After Deployment**
   - Check Render dashboard for build status
   - Look for errors in logs
   - Test API endpoint: `https://church-api.render.com/api/health`

#### Frontend (Netlify)

1. **Environment Variables in Netlify Dashboard**
   ```
   REACT_APP_API_BASE_URL = https://church-api.render.com/api
   REACT_APP_API_URL = https://church-api.render.com/api
   NODE_ENV = production
   ```

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: 18.x or higher

3. **Redirect Configuration (_redirects file)**
   ```
   /* /index.html 200
   ```

---

## 🔧 Step-by-Step Fix

### Step 1: Update Frontend API Configuration

**File:** `church-frontend/src/api.js`

Replace:
```javascript
const DEFAULT_API_BASE = 'http://localhost:4000/api';
```

With:
```javascript
const DEFAULT_API_BASE = 'http://localhost:5000/api';
```

### Step 2: Verify Backend Database Connection

**Test the connection locally:**
```bash
cd church-backend
# Check if DATABASE_URL is set
echo $DATABASE_URL  # Mac/Linux
echo %DATABASE_URL%  # Windows

# If not set, create .env file with:
# DATABASE_URL=your_connection_string
npm start
```

Look for message: `✅ Server running on port 5000`

### Step 3: Test API Endpoint

```bash
# Open in browser or use curl
curl -X GET http://localhost:5000/api/bookings

# Should return JSON (possibly empty array [])
# NOT "Cannot GET /api/bookings"
```

### Step 4: Verify Frontend Connection

```bash
cd church-frontend
npm start
```

Open browser console (F12) and check:
- Network tab should show requests going to `http://localhost:5000/api`
- NOT `http://localhost:4000/api` (404 errors)

---

## 🐛 Common Errors & Solutions

### Error: "Cannot GET /api/bookings"

**Cause:** Frontend is connecting to wrong port (4000 instead of 5000)

**Fix:** Update `api.js` DEFAULT_API_BASE to port 5000

### Error: "Connection refused" or "ECONNREFUSED"

**Cause:** 
- Backend not running
- Wrong HOST/PORT
- Firewall blocking connection

**Fix:**
1. Check backend is running: `npm start` in `church-backend`
2. Verify port 5000 is listening: 
   ```bash
   lsof -i :5000  # Mac/Linux
   netstat -ano | findstr :5000  # Windows
   ```
3. Check firewall/network settings

### Error: "no such table: users"

**Cause:** DATABASE_URL environment variable not set or database not initialized

**Fix:**
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# If using Supabase, run schema.sql setup
# See: church-backend/schema.sql
```

### Error: "Authentication failed" / "EAUTH"

**Cause:** SendGrid API key incorrect or sender not verified

**Fix:**
```
SENDGRID_API_KEY=SG.your-actual-api-key
SENDGRID_FROM=your-verified-sender@example.com

# Get your API key at: https://app.sendgrid.com/settings/api_keys
# Verify your sender at: https://app.sendgrid.com/settings/sender_auth
```

---

## 🌐 Production API URLs

### After Deployment:

**Frontend will use:**
- Default (local): `http://localhost:5000/api`
- Production (detect from `REACT_APP_API_BASE_URL`): `https://church-api.render.com/api`

**Backend deployed at:**
- `https://church-api.render.com`

**Frontend deployed at:**
- `https://church-app.netlify.app`

---

## ✅ Verification Checklist

After applying fixes:

- [ ] Backend runs on port 5000 locally
- [ ] Frontend API_BASE points to port 5000
- [ ] Database connection string is set (DATABASE_URL)
- [ ] Tables are created in database
- [ ] Can see data in browser console Network tab
- [ ] Dashboard loads without "Connection refused" errors
- [ ] Can create bookings (data persists)
- [ ] Renders backend deployment has DATABASE_URL set
- [ ] Netlify frontend deployment has REACT_APP_API_BASE_URL set
- [ ] Production frontend loads data correctly

---

## 🔄 Current Code Status

### Backend (`server.js`)
- ✅ Listening on port 5000
- ✅ Database connection pool using PostgreSQL
- ✅ JWT authentication active
- ✅ Socket.IO real-time enabled
- ⚠️ **Requires DATABASE_URL in environment**

### Frontend (`api.js`)
- ❌ **DEFAULT_API_BASE points to port 4000 (WRONG)**
- Should be: `http://localhost:5000/api`
- ✅ Axios client configured
- ✅ All endpoints mapped correctly

### Database (`db.js`)
- ✅ Uses pg Pool for PostgreSQL
- ✅ Converts SQLite ? to PostgreSQL $1, $2
- ✅ Transaction support
- ⚠️ **Requires DATABASE_URL environment variable**

---

## 📝 Environment Variables Required

### Local Development

Create `.env` in `church-backend/`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/church_db
JWT_SECRET=dev-secret-key-change-in-production
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM=your-verified-sender@example.com
NODE_ENV=development
ADMIN_EMAIL=admin@church.com
ADMIN_PASSWORD=admin1234
```

Create `.env` in `church-frontend/`:
```
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_API_URL=http://localhost:5000/api
NODE_ENV=development
```

### Production (Render/Netlify)

**Render Backend Environment Variables:**
- `DATABASE_URL` → Your Supabase connection string
- `JWT_SECRET` → Strong random secret
- `SENDGRID_API_KEY` → Your SendGrid API key
- `SENDGRID_FROM` → Verified sender email address
- `NODE_ENV` → production

**Netlify Frontend Environment Variables:**
- `REACT_APP_API_BASE_URL` → `https://your-render-backend.onrender.com/api`
- `REACT_APP_API_URL` → `https://your-render-backend.onrender.com/api`
- `NODE_ENV` → production

---

## 🆘 Getting Help

### If Still Not Working:

1. **Check backend logs:**
   ```bash
   npm start  # Look for error messages
   ```

2. **Check browser console (F12):**
   - Network tab → See where API requests are going
   - Console tab → Look for error messages

3. **Test database directly:**
   ```bash
   # If using Supabase, use their SQL editor
   # Run: SELECT * FROM users;
   # Should return data (or empty if no users yet)
   ```

4. **Check Render logs:**
   - Go to render.com dashboard
   - Click your service
   - View deployment logs for errors

5. **Check Netlify logs:**
   - Go to netlify.app dashboard
   - Click your site
   - View deploy logs and function logs

---

**Documentation Version:** 1.1  
**Last Updated:** April 11, 2026  
**Status:** Troubleshooting Complete
