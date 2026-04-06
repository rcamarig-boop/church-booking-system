# Example .env Files for Each Stage

Copy and paste these into your `.env` files depending on which stage you're at.

---

## STAGE 1: Local Development (Current)

### File: `church-backend/.env.local`

```env
# Local SQLite Setup (current)
# No DATABASE_URL needed - uses local file: church.db

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-in-production

# Admin Seeding
AUTO_SEED_ADMIN=true
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@church.com
ADMIN_PASSWORD=admin1234

# Server
PORT=4000
NODE_ENV=development
```

**How to use:**
```bash
cp church-backend/.env.local church-backend/.env
npm start
```

---

## STAGE 2: Ready to Deploy with Supabase

### File: `church-backend/.env.production`

```env
# ⚠️ IMPORTANT: Replace the values below with YOUR values from Supabase!

# Supabase PostgreSQL Connection
# Get this from: Supabase → Settings → Database → Connection String
# It looks like: postgresql://postgres:PASSWORD@HOST:6543/postgres?sslmode=require
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:6543/postgres?sslmode=require

# JWT Configuration - Generate a new random secret:
# Node command: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=generate-a-random-string-of-64-characters-here

# Admin Seeding
AUTO_SEED_ADMIN=true
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@church.com
ADMIN_PASSWORD=ChangeThisToASecurePassword123!

# Server
PORT=4000
NODE_ENV=production
```

**How to use:**
1. Open Supabase dashboard
2. Go to Settings → Database
3. Copy the "Connection String" (URI option)
4. Replace `YOUR_PASSWORD` and `YOUR_HOST` in DATABASE_URL above
5. Generate a JWT_SECRET using the command in comment
6. Paste this entire thing into your Render environment variables (phase 4)

---

## STAGE 3: For Render Deployment

When setting up Render (Phase 4), add these environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string with password/host replaced |
| `JWT_SECRET` | Random 64-char string (use `node -e "..."` command) |
| `AUTO_SEED_ADMIN` | `true` |
| `ADMIN_NAME` | `Admin User` (or custom name) |
| `ADMIN_EMAIL` | `admin@church.com` (or custom email) |
| `ADMIN_PASSWORD` | `ChangeThis1234!` (MUST change!) |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |

**DO NOT PUT THESE IN A FILE** - Enter them directly in Render dashboard

---

## STAGE 4: For Frontend (Vercel)

When setting up Vercel (Phase 5), add this environment variable:

| Key | Value |
|-----|-------|
| `REACT_APP_API_BASE_URL` | `https://church-backend-xxxx.onrender.com` (Replace with YOUR Render URL) |

**Example:**
- If your Render URL is: `https://my-church-backend-12345.onrender.com`
- Then set: `REACT_APP_API_BASE_URL=https://my-church-backend-12345.onrender.com`

---

## Generate a Secure JWT Secret

Run this command in your terminal:

### Mac/Linux:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Windows (PowerShell):
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output example:**
```
a7f3d8c9e1b4a2f5c8d1e4a7f3d8c9e1b4a2f5c8d1e4a7f3d8c9e1b4a2f5c
```

Copy this entire string and use it for `JWT_SECRET`.

---

## Getting Supabase Connection String

### Step 1: Go to Supabase Dashboard
- https://supabase.com/dashboard

### Step 2: Select Your Project
- Click on "church-db" or whatever you named it

### Step 3: Go to Settings
- Bottom left corner → ⚙️ Settings

### Step 4: Click Database in Left Menu  
- Should expand to show options

### Step 5: Find Connection Pooling Section
- Scroll down until you see "Connection pooling"
- Or "Connection string"

### Step 6: Copy the URI
- Look for one that starts with `postgresql://`
- It should have `?sslmode=require` at the end
- Click copy icon

### Step 7: Replace Placeholders
- The string looks like:
  ```
  postgresql://postgres:PASSWORD123@aws-0-us-east-1.pooling.supabase.co:6543/postgres?sslmode=require
  ```
- `PASSWORD123` is your database password (the one you created with the project)
- `aws-0-us-east-1.pooling.supabase.co` is your host

**You don't need to replace anything!** The password and host are already in the string. Just copy it exactly as-is.

---

## Example Complete DATABASE_URL

### With Real Values:
```
postgresql://postgres:MyStrongPassword123!@aws-0-us-east-1.pooling.supabase.co:6543/postgres?sslmode=require
```

### When Setting in Render:
1. Go to your Render service
2. Settings → Environment Variables
3. Add new: Name = `DATABASE_URL`
4. Value = Paste the exact string above
5. Click Save
6. Redeploy

---

## Security Best Practices

### DO ✅
- [ ] Change `ADMIN_PASSWORD` to something secure
- [ ] Generate unique `JWT_SECRET`
- [ ] Use strong Supabase database password
- [ ] Never commit `.env` files to GitHub
- [ ] Keep environment variables private

### DON'T ❌
- [ ] Use default passwords in production
- [ ] Share environment variable values
- [ ] Commit `.env` to git
- [ ] Use simple passwords like `admin1234`
- [ ] Reuse same JWT_SECRET across services

---

## Local Testing Before Deploying

### Test 1: Check Database Connection
```bash
cd church-backend
npm install
export DATABASE_URL=postgresql://...your-connection-string-here
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'ERROR: ' + err.message : 'SUCCESS: ' + res.rows[0].now);
  process.exit();
});
"
```

Should show: `SUCCESS: 2026-04-06T...`

### Test 2: Start Server Locally
```bash
npm install
npm start
```

Should show: `server running on port 4000`

### Test 3: Test API
```bash
curl http://localhost:4000/api/booking-requests/count
```

Should return: `{"count":0}`

---

## Environment Variables by Service

### Supabase (Automatic - No Config Needed)
- Fully managed by Supabase
- Just create account and project
- No environment variables to set

### Render (Backend Environment)
```
DATABASE_URL
JWT_SECRET
AUTO_SEED_ADMIN
ADMIN_NAME
ADMIN_EMAIL
ADMIN_PASSWORD
NODE_ENV=production
PORT=4000
```

### Vercel (Frontend Environment)
```
REACT_APP_API_BASE_URL=https://your-render-url.onrender.com
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Wrong DATABASE_URL Format
```
WRONG: postgresql://password@host database_name
RIGHT: postgresql://user:password@host:port/database?sslmode=require
```

### ❌ Mistake 2: Missing SSLMODE
```
WRONG: postgresql://user:pass@host:6543/postgres
RIGHT: postgresql://user:pass@host:6543/postgres?sslmode=require
```

### ❌ Mistake 3: Special Characters Not Escaped
```
If password is: p@ss#word
In URL it should be: p%40ss%23word
Tool: https://www.urlencoder.org/
```

### ❌ Mistake 4: Default ADMIN_PASSWORD
```
WRONG: ADMIN_PASSWORD=admin1234
RIGHT: ADMIN_PASSWORD=MySecurePassword123!Complex
```

### ❌ Mistake 5: Committing .env to GitHub
```
WRONG: git add .env && git commit
RIGHT: git add .gitignore (with *.env)
```

---

## Quick Copy-Paste Setup

Replace brackets with your actual values:

```env
DATABASE_URL=postgresql://postgres:[YOUR_DATABASE_PASSWORD]@[YOUR_HOST]:6543/postgres?sslmode=require
JWT_SECRET=[GENERATE_WITH_NODE_COMMAND]
AUTO_SEED_ADMIN=true
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@church.com
ADMIN_PASSWORD=MySecurePassword123!
NODE_ENV=production
PORT=4000
```

---

## Where to Find These Values

| Value | Where to Get | How |
|-------|---|---|
| `YOUR_DATABASE_PASSWORD` | Supabase Project Info | Settings → Database → show password |
| `YOUR_HOST` | Supabase Connection String | Copy from connection string URI |
| `JWT_SECRET` | Generate it | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `Render URL` | After deployment | Render dashboard → service URL |
| `REACT_APP_API_BASE_URL` | From Render | Copy and paste your backend URL |

---

## Testing Each Environment Variable

```bash
# After setting DATABASE_URL
echo $DATABASE_URL
# Should show your connection string

# After setting JWT_SECRET
echo $JWT_SECRET
# Should show your random string

# In Node:
console.log(process.env.DATABASE_URL)
// Should show connection string
```

---

**Still confused?** See QUICK_START.md for step-by-step with screenshots!

