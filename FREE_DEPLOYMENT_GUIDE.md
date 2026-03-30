# Free Deployment Guide (SQLite Edition)

This project now runs **SQLite only**.

Important: SQLite lives on disk, so your backend host must support **persistent storage**.

## Option 1: Vercel (Frontend) + Railway (Backend with Persistent Volume)

### 1. Deploy Frontend to Vercel (FREE)
1. Go to `vercel.com`
2. Import your repo
3. Set env:
   ```
   REACT_APP_API_URL=https://<your-backend-url>
   ```
4. Deploy

### 2. Deploy Backend to Railway (FREE)
1. Go to `railway.app` → New Project → Deploy from GitHub
2. Set env:
   ```
   PORT=5000
   DB_PATH=/data/church.db
   JWT_SECRET=your-secret
   ```
3. Add a **Persistent Volume** and mount it at `/data`
4. Deploy

## Option 2: Render (Backend with Persistent Disk)
1. Create a Web Service (Node)
2. Start command: `npm start`
3. Add env:
   ```
   PORT=5000
   DB_PATH=/var/data/church.db
   JWT_SECRET=your-secret
   ```
4. Attach a **Persistent Disk** at `/var/data`

## Option 3: Local / LAN Setup
1. Backend: `cd church-backend && npm start`
2. Frontend: `cd church-frontend && npm start`
3. Set frontend env:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```

## Notes
- If you move hosts, **copy the SQLite file** (`church.db`) to the new storage path.
- Back up `church.db` regularly.
