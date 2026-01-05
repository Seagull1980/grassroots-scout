@echo off
echo ========================================
echo   The Grassroots Hub - Dev Environment
echo ========================================
echo.

echo Closing any existing server windows...
taskkill /FI "WINDOWTITLE eq Main Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Team Roster*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Playing History*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Forum*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Vite Dev Server*" /F >nul 2>&1

echo Killing any existing node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo Starting servers in separate windows...
echo.

echo [1/5] Starting Main Backend (port 3000)...
start "Main Backend - Port 3000" cmd /k "cd backend && node server.js"
timeout /t 3 >nul

echo [2/5] Starting Team Roster (port 3001)...
start "Team Roster - Port 3001" cmd /k "cd backend && node team-roster-server.js"
timeout /t 2 >nul

echo [3/5] Starting Playing History (port 3002)...
start "Playing History - Port 3002" cmd /k "cd backend && node playing-history-server.js"
timeout /t 2 >nul

echo [4/5] Starting Forum (port 3004)...
start "Forum - Port 3004" cmd /k "cd backend && node forum-server.js"
timeout /t 2 >nul

echo [5/5] Starting Vite Dev Server (port 5173)...
start "Vite Dev Server - Port 5173" cmd /k "npm run dev"

echo.
echo ========================================
echo   All servers started!
echo ========================================
echo.
echo Check the separate windows for each server.
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
echo Close the individual windows to stop servers.
echo.
pause
