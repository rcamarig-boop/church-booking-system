# Free Deployment Guide for Church Booking System

Deploy your entire app for **FREE** with no credit cards required.

## Option 1: EASIEST (Vercel + Railway + Neon) ⭐ RECOMMENDED

### 1. Deploy Frontend to Vercel (FREE)
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign up" → use your GitHub account to sign in
3. Click "Import Project" → select your `church-booking-system` repository
4. Click "Deploy" (takes 1-2 minutes)
5. Your frontend is LIVE with a free URL like: `https://church-booking-app.vercel.app`

### 2. Deploy Backend to Railway (FREE)
1. Go to [railway.app](https://railway.app)
2. Click "Start New Project" → select "Deploy from GitHub repo"
3. Select your `church-booking-system` repository
4. Click on `church-backend` service and add these environment variables:
   ```
   USE_PG=true
   PGHOST=<from Neon step below>
   PGPORT=5432
   PGDATABASE=church
   PGUSER=postgres
   PGPASSWORD=<from Neon step below>
   DATABASE_URL=postgresql://postgres:<password>@<host>:5432/church
   JWT_SECRET=your-secret-key-here-make-it-random
   ```
5. Set port to `5000` in Railway settings
6. Your backend gets a FREE URL like: `https://church-booking-api.railway.app`
7. Stay on Railway's free tier (~$5/month credit, plus free usage tier)

### 3. Setup PostgreSQL Database on Neon (FREE)
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project → select PostgreSQL
4. Copy your connection string, extract:
   - `PGHOST`: the hostname
   - `PGPASSWORD`: your password
5. In Railway, paste these values into the env variables above

### 4. Update Your Frontend to Use Live API
Edit `church-frontend/src/api.js`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://church-booking-api.railway.app';
```

In Vercel deployment settings, add:
```
REACT_APP_API_URL=https://church-booking-api.railway.app
```

### 5. Push Code
```bash
git push origin main
```
Both apps auto-deploy when you push!

---

## Option 2: ALTERNATIVE (Render + Supabase) 

### 1. Frontend: Vercel (same as above)

### 2. Backend: Render.com (FREE)
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Create New → Web Service
4. Select your GitHub repo
5. Runtime: Node
6. Build: `npm install` in church-backend
7. Start: `npm start`
8. Add same env variables as Railway option
9. Free tier gets 750 hours/month (enough for continuous running)

### 3. Database: Supabase (FREE)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database → Connection String
4. Use the PostgreSQL connection details in your env variables

---

## Option 3: SIMPLEST BUT LIMITED (Replit Stack)

1. Go to [replit.com](https://replit.com)
2. Create new Repl from GitHub → select your repo
3. Add `.replit` file:
   ```
   run = "cd church-backend && npm start"
   ```
4. Add PostgreSQL using Replit neon plugin
5. One-click deploy as public repl
6. Downside: Sleeps after 1 hour of inactivity (won't work for production)

---

## Cost Breakdown (FREE TIER)

| Service | Cost | Limit |
|---------|------|-------|
| **Vercel (Frontend)** | FREE | 100GB bandwidth/month |
| **Railway (Backend)** | FREE | ~150 hours/month running |
| **Neon (Database)** | FREE | 3GB storage, 3M API calls/month |
| **Supabase (Database)** | FREE | 500MB storage, 2M API calls/month |
| **Render (Backend)** | FREE | 750 hours/month running |
| **Total Cost** | **$0** | Sufficient for small church usage |

---

## Quick Start Checklist ✅

- [ ] Create `.env.production` in church-backend with live credentials
- [ ] Update `church-frontend/src/api.js` with live API URL
- [ ] Deploy frontend to Vercel (1-2 minutes)
- [ ] Deploy backend to Railway (2-3 minutes)
- [ ] Create PostgreSQL database on Neon or Supabase
- [ ] Test by visiting your live Vercel URL
- [ ] Verify login works with admin@church.com / admin1234

---

## Troubleshooting

**Backend won't start on Railway:**
- Check build logs in Railway dashboard
- Verify all env variables are set correctly
- Ensure `npm start` works locally first

**Frontend can't reach backend:**
- Update `REACT_APP_API_URL` in Vercel env vars
- Verify backend URL is accessible (test in browser)
- Check CORS settings in `server.js`

**Database connection failed:**
- Test connection string locally first with `npm run test-pg`
- Verify IP whitelist (Neon/Supabase) allows all IPs
- Check password special characters are URL-encoded

---

## Next Steps

1. Follow **Option 1** above (Vercel + Railway + Neon)
2. It takes ~15 minutes total
3. All three platforms are genuinely free, no trials expiring
4. Your app will be live at a shareable URL

Need help with any step? Let me know!
