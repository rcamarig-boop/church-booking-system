# Church Booking — Local Dev Startup

This README explains how to start the backend and frontend locally on Windows (cmd.exe / PowerShell).

Prerequisites
- Node.js (16+ recommended)
- npm available on PATH

Quick manual steps (recommended)
1. Open a cmd.exe terminal (Terminal A) and start the backend:

```cmd
cd \church_project\church-backend
npm install   :: only if not installed already
set JWT_SECRET=your_jwt_secret_here
node server.js
```

2. Open another cmd.exe terminal (Terminal B) and start the frontend:

```cmd
cd \church_project\church-frontend
npm install   :: only if not installed already
npm start
```

The frontend dev server will run at `http://localhost:3000` and the backend API at `http://localhost:4000`.

Helper scripts
- `start-all.cmd` — opens two cmd windows and starts backend and frontend (Windows cmd). Double-click to run.
- `start-all.ps1` — PowerShell version which opens two PowerShell windows.

Using the helper scripts
- From File Explorer: double-click `start-all.cmd` (recommended for cmd users).
- Or in PowerShell: `.\start-all.ps1` (you might need to set execution policy or right-click -> Run with PowerShell).

Troubleshooting
- If a port is already in use (e.g. 3000 or 4000), run:

```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

- If `login-bg.jpg` is not showing, confirm the file exists at `church-frontend\\public\\login-bg.jpg` and visit `http://localhost:3000/login-bg.jpg`.

- Admin test account: `admin@church.com` / `admin1234`.

Want a single npm command to start both (cross-platform)? I can add `concurrently` and update the package.json if you prefer.