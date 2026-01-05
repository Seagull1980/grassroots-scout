# Development Server Startup Guide

## The Problem
The dev servers can get stuck during startup, making it unclear if everything is running correctly.

## The Solution
Use the robust startup script: `start-dev-robust.ps1`

## Quick Start

```powershell
.\start-dev-robust.ps1
```

This script will:
1. ✅ Clean up any existing node processes
2. ✅ Start all backend servers in order
3. ✅ Start the Vite dev server
4. ✅ Check that all servers are responding
5. ✅ Monitor servers and alert if any stop
6. ✅ Provide clear status updates

## What Gets Started

| Service | Port | Purpose |
|---------|------|---------|
| Main Backend | 3000 | Core API & database |
| Team Roster | 3001 | Team management |
| Playing History | 3002 | Player records |
| Forum | 3003 | Community features |
| Vite Dev Server | 5173 | Frontend with HMR |

## Troubleshooting

### Script Execution Policy Error
If you get an error about script execution:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Servers Not Starting
1. Check for port conflicts:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000,3001,3002,3003,5173 -ErrorAction SilentlyContinue
   ```

2. Kill any processes using those ports:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```

3. Try starting individual servers to see specific errors:
   ```powershell
   cd backend
   node server.js
   ```

### Alternative: Manual Start
If the script doesn't work:

**Terminal 1 - Backend:**
```powershell
cd backend
node server.js
```

**Terminal 2 - Team Roster:**
```powershell
cd backend
node team-roster-server.js
```

**Terminal 3 - Playing History:**
```powershell
cd backend
node playing-history-server.js
```

**Terminal 4 - Forum:**
```powershell
cd backend
node forum-server.js
```

**Terminal 5 - Frontend:**
```powershell
npm run dev
```

## Success Indicators

When everything is working, you should see:
```
✓ Main Backend (port 3000): RUNNING
✓ Team Roster (port 3001): RUNNING
✓ Playing History (port 3002): RUNNING
✓ Forum (port 3003): RUNNING
✓ Vite (port 5173): RUNNING

Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Stop All Servers

Press `Ctrl+C` in the terminal running the script, or:
```powershell
Get-Process node | Stop-Process -Force
```
