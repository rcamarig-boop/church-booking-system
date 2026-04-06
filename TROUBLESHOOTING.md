# TROUBLESHOOTING GUIDE

Common issues and solutions when deploying to Supabase + Render + Vercel.

---

## DATABASE ISSUES

### "FATAL: password authentication failed"

**Problem**: Cannot connect to Supabase database

**Solutions**:
1. Check your DATABASE_URL is correct:
   - Go to Supabase → Settings → Database
   - Copy the "Connection String" exactly as shown
   - Paste into Render environment variable

2. Most common issue: **Password has special characters**
   - When you created Supabase project, did you use special chars in password?
   - URL-encode them: `@` → `%40`, `#` → `%23`, `$` → `%24`
   - Example: password `p@ss#word` becomes `p%40ss%23word`

3. Check connection string has `?sslmode=require` at the end

**Test locally first**:
```bash
# In church-backend folder
npm install pg
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error(err);
  else console.log('✅ Connected!', res.rows[0]);
  process.exit();
});
"
```

---

### "Cannot find relation \"users\""

**Problem**: Tables don't exist in database

**Solutions**:
1. Did you run the CREATE TABLE SQL in Supabase?
   - Go to SQL Editor
   - Paste the schema SQL
   - Click Run
   - Verify all 8 tables appear in Table Editor

2. Tables might be in wrong database/schema
   - Default should be `public` schema
   - In Table Editor, you should see tables listed

3. Recreate tables if corrupted:
   - Supabase Dashboard → SQL Editor
   - Run: `DROP TABLE IF EXISTS [table_name] CASCADE;`
   - Then re-run the CREATE TABLE SQL

---

### "SERIALIZATION ERROR" or "locked database"

**Problem**: Database transaction conflicts

**This shouldn't happen with PostgreSQL** - might indicate:
1. Multiple requests hitting same record simultaneously
2. Indexes not created

**Fix**:
```sql
-- Recreate missing indexes
CREATE INDEX idx_bookings_userId ON bookings("userId");
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_calendar_date ON calendar(date);
```

---

## BACKEND DEPLOYMENT ISSUES

### Render shows "Slug could not be detected"

**Problem**: Render doesn't know how to start your app

**Solutions**:
1. Verify `package.json` exists in root of `church-backend`
2. Check `Start Command` is exactly: `npm start`
3. Check `Build Command` is exactly: `npm install`
4. Check `Main` field in package.json points to `server.js`
5. Force redeploy: Settings → Manual Deploy → Deploy latest commit

---

### Backend starts but dies after 30 seconds

**Problem**: Likely DATABASE_URL missing

**Check**:
1. Go to Render service → Settings → Environment
2. Look for DATABASE_URL - is it there?
3. Click the variable - is the VALUE showing? (Sometimes it hides)
4. If not, add it:
   - Name: `DATABASE_URL`
   - Value: Your full Supabase connection string
5. Scroll up and click "Deploy latest commit"

**Or check logs**:
1. Go to Logs tab
2. Look for error messages like "ECONNREFUSED" or "DATABASE_URL"

---

### "Cannot POST /api/auth/register" (404 error)

**Problem**: Routes don't exist or req/res headers wrong

**Check**:
1. Did deployment actually succeed?
   - Go to Render → Logs
   - Look for "server running on port 4000"
2. Are you going to the right URL?
   - Should be: `https://church-backend-xxxx.onrender.com/api/auth/register`
   - NOT `http://localhost:4000/...`
3. Is Content-Type correct?
   - Must be `application/json`
   - Test: `curl -X POST https://church-backend-xxxx.onrender.com/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com","password":"test123"}'`

---

### "socket hang up" or connection timeout

**Problem**: Render app going to sleep (free tier feature)

**This is NORMAL**:
- Free tier Renders spin down after 15 minutes of inactivity
- First request takes 30-60 seconds
- Subsequent requests are instant
- No data loss, just a startup delay

**Solutions**:
1. Keep it awake with a cron job
2. Upgrade to paid tier ($7/month)
3. Or accept the 30-sec startup

---

## FRONTEND DEPLOYMENT ISSUES

### "Cannot find module 'react-scripts'"

**Problem**: Build dependencies not installed

**Solutions**:
1. Vercel should auto-install, but check:
   - Go to Deployments tab
   - Click latest deployment
   - Look for `npm install` output
   - Should show dozens of packages installed

2. If not installing, check `package.json` in `church-frontend`:
   - Verify it has `"react-scripts"` in dependencies
   - If missing, you need to add it:
   ```json
   "dependencies": {
     "react": "^18.2.0",
     "react-dom": "^18.2.0",
     "react-scripts": "5.0.1"
   }
   ```

---

### "Cannot GET /", blank page, or logo missing

**Problem**: Frontend built successfully but assets missing or wrong base URL

**Solutions**:

1. Check the build output:
   - Vercel Logs should show `✓ Build successful`
   - Look for error messages

2. Verify `public/index.html` exists:
   ```bash
   ls church-frontend/public/index.html
   ```
   - Should exist and have `<div id="root"></div>`

3. Check `.env` for API URL:
   - Add to `church-frontend/.env`:
   ```
   REACT_APP_API_BASE_URL=https://church-backend-xxxx.onrender.com
   ```
   - Then redeploy in Vercel

4. Verify `api.js` uses the env variable:
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
   ```

---

### Frontend loads but shows "Cannot reach backend"

**Problem**: CORS error or API URL wrong

**Check**:
1. Browser Console (F12 → Console tab)
   - Look for red errors about "origin" or CORS
   - Look for "Cannot reach" messages

2. Verify REACT_APP_API_BASE_URL in Vercel:
   - Go to Settings → Environment Variables
   - Is `REACT_APP_API_BASE_URL` set?
   - Is the value correct? (exact Render URL)

3. Check backend CORS is enabled:
   - In server.js, should have:
   ```javascript
   app.use(cors());
   ```

4. Verify backend actually running:
   - Go to `https://church-backend-xxxx.onrender.com/api/booking-requests/count`
   - Should return JSON (not error page)

5. Redeploy frontend:
   - Vercel → Build Settings → Redeploy

---

### "API_BASE_URL still points to localhost"

**Problem**: Environment variables not being used at build time

**Solutions**:
1. Vercel only sees env vars named `REACT_APP_*` in React apps
2. Add variable in Vercel:
   - Settings → Environment Variables
   - Add: `REACT_APP_API_BASE_URL=https://YOUR-RENDER-URL.onrender.com`
3. Redeploy by clicking **Deployments** → **...** → **Redeploy**
   - (Just redeploy, don't need to rebuild locally)

---

## DATABASE TO VERCEL/RENDER CONNECTION ISSUES

### "ECONNREFUSED" or "Connection refused"

**Problem**: App can't reach database

**Check**:
1. Is it definitely a connection string issue?
   ```
   Error: connect ECONNREFUSED 127.0.0.1:5432
   ```
   This means it's trying to use localhost (local Postgres)

2. Solutions:
   - Verify `DATABASE_URL` env var is set
   - Verify it's spelled exactly `DATABASE_URL`
   - Restart the service: Render → Settings → Manual Deploy
   - Check the value doesn't have trailing spaces

3. Test from your local machine:
   ```bash
   brew install postgresql@15  # or apt-get psql
   psql "YOUR_CONNECTION_STRING"
   # Should connect
   ```

---

### "Relations not found" after schema changes

**Problem**: Added new columns to schema, but app crashes

**Solutions**:
1. Verify migrations were applied:
   - Go to Supabase SQL Editor
   - Run: `\d booking_requests;` (backslash d shows table structure)
   - Verify new columns appear

2. For new columns, update your SQL queries in server.js:
   - Make sure you reference the new column names correctly
   
3. Reset tables for testing (WARNING: deletes all data):
   ```sql
   DROP TABLE notifications CASCADE;
   DROP TABLE booking_records CASCADE;
   DROP TABLE booking_requests CASCADE;
   DROP TABLE bookings CASCADE;
   DROP TABLE concerns CASCADE;
   DROP TABLE events CASCADE;
   DROP TABLE calendar CASCADE;
   DROP TABLE users CASCADE;
   -- Then re-run CREATE TABLE statements
   ```

---

## PERFORMANCE & MONITORING

### Backend is very slow (10+ second response)

**Causes**:
1. Render app spinning up from sleep (normal, every 15 min)
2. Database connection pooling issues
3. N+1 query problems

**Check**:
1. Is it only the FIRST request that's slow?
   - Yes = Free tier sleep (normal)
   - No = Might be queries

2. Look at db.js - are we creating too many connections?
   - Pool size might be too small
   - Increase pooling: `max: 20` in pool config

3. Add logging to see slow queries:
   ```javascript
   console.time('db-query');
   const result = await dbAll(...);
   console.timeEnd('db-query');
   ```

### Database getting near 500MB limit

**Check**:
1. Supabase Dashboard → Database → Storage
2. See disk usage
3. Most likely: old notification records

**Clean up**:
```sql
-- Delete old notifications (older than 30 days)
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';

-- Check notification count
SELECT COUNT(*) FROM notifications;
```

---

## AUTHENTICATION ISSUES

### "Invalid token" or login always fails

**Check**:
1. Is JWT_SECRET set?
   - Render Settings → Environment → JWT_SECRET exists?

2. Did you change JWT_SECRET after deploying?
   - All existing tokens become invalid
   - Users need to re-login

3. Token might be expired:
   - Default expiry is session-based
   - Clear browser localStorage and retry login

4. Check token is being sent:
   - Browser Console → Application → Local Storage
   - Look for `token` or `authToken` key
   - Should be a long string starting with `eyJ`

---

## IF ALL ELSE FAILS

### Nuclear Reset (Delete everything and start over)

1. **Delete Supabase project**:
   - Supabase → Settings → Danger Zone → Delete Project
   - Create new one from scratch

2. **Delete Render service**:
   - Render → Services → [Your service] → Settings → Delete Service
   - Deploy new one

3. **Delete Vercel project**:
   - Vercel → Settings → Advanced → Delete Project
   - Re-import

4. **Start fresh with QUICK_START.md**

---

### Getting Help

If stuck:
1. **Check these files exist**:
   - `church-backend/db.supabase.js`
   - `church-backend/package.json` (with `pg` dependency)
   - `church-backend/.env` (with DATABASE_URL)

2. **Test locally first**:
   - Remove DATABASE_URL from .env
   - Switch db.js back to `better-sqlite3`
   - Test with local SQLite
   - Ensure it works locally before deploying

3. **Check service status**:
   - Supabase Status: status.supabase.com
   - Render Status: status.render.com
   - Vercel Status: status.vercel.com

4. **Review logs**:
   - Render Logs: Shows backend errors
   - Vercel Logs: Shows frontend build errors
   - Supabase Logs: Shows database queries

