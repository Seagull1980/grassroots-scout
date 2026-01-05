# Complete Guide: Fix Ngrok Configuration for External Testing

## Quick Setup (3 Steps)

### Step 1: Start Ngrok Tunnels
Open 2 separate PowerShell/Command Prompt windows:

**Window 1 - Backend Tunnel:**
```bash
ngrok http 3001 --region=us
```

**Window 2 - Frontend Tunnel:**
```bash
ngrok http 5173 --region=us
```

### Step 2: Get Tunnel URLs
Visit: http://localhost:4040
Copy both tunnel URLs (you'll see something like):
- Frontend: https://abc123.ngrok-free.app
- Backend: https://def456.ngrok-free.app

### Step 3: Update Frontend Configuration
Run this PowerShell script:
```powershell
.\scripts\setup-external-access.ps1
```

OR manually update `src/services/api.ts`:
```typescript
const API_URL = 'https://YOUR-BACKEND-TUNNEL.ngrok-free.app/api';
```

## What Was Fixed

### 1. Authentication Issues ✅
- Fixed test user email encryption and verification
- All test users now properly verified
- Credentials working: coach@test.com / test123

### 2. API Configuration ✅  
- Updated frontend to use dynamic API URLs
- Fixed Vite proxy from port 5000 → 3001
- Added proper CORS headers for ngrok

### 3. Ngrok Headers ✅
- Added 'ngrok-skip-browser-warning' header
- Enhanced CORS to allow all ngrok domains

## Test Credentials (All Verified)

**Coaches:**
- coach@test.com / test123
- coach1@test.com / test123
- coach2@test.com / test123

**Players:**  
- player@test.com / test123
- player1@test.com / test123

**Parents:**
- parent@test.com / test123
- parent1@test.com / test123

## Troubleshooting

### If External Login Still Fails:
1. Check ngrok dashboard: http://localhost:4040
2. Ensure both tunnels are running
3. Update frontend API URL to match backend tunnel
4. Restart frontend after URL change

### If CORS Errors:
- Backend CORS is configured to accept all ngrok domains
- Make sure you're using HTTPS ngrok URLs (not HTTP)

### If Database Errors:
- All test users are now properly encrypted and verified
- Local authentication confirmed working

## Scripts Created

1. `scripts/setup-external-access.ps1` - Auto-configures frontend for ngrok
2. `scripts/start-ngrok.bat` - Starts both tunnels automatically  
3. `backend/fix-test-users.js` - Fixed user encryption
4. `backend/verify-test-users.js` - Verified all test users

## Next Steps

1. Start both ngrok tunnels
2. Run the setup script
3. Share the frontend ngrok URL for external testing
4. Login works with: coach@test.com / test123

The configuration is now properly set up for external testing away from your network!
