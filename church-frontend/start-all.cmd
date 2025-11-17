@echo off
REM Open backend and frontend in new cmd windows (Windows).
SETLOCAL
SET ROOT=%~dp0
REM Start backend
start "Backend" cmd /k "cd /d %ROOT%..\church-backend && echo Starting backend... && node server.js"
REM Start frontend
start "Frontend" cmd /k "cd /d %ROOT% && echo Starting frontend... && npm start"
ENDLOCAL
