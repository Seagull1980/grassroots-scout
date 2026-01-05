# Phase 1 External Testing - Active URLs

**Status:** ✅ ACTIVE (Generated: December 9, 2025)

## 🌐 Public Access URLs

### Main Application
**URL:** https://e691ca11601f.ngrok-free.app

Share this URL with your beta testers. They can access the full application from any device.

### API Endpoint
**URL:** https://074f87fee821.ngrok-free.app

The frontend automatically routes API calls through ngrok tunnels.

---

## 📋 Testing Instructions for Beta Testers

### First-Time Access
1. Click the main application URL
2. You'll see an ngrok warning page - **click "Visit Site"**
3. The app will load normally

### What to Test
- User registration (Coach, Player, Parent/Guardian roles)
- Login/logout functionality
- Create team vacancies (coaches)
- Post player availability (players/parents)
- Search and filter functionality
- Map-based location features
- **NEW: Feedback System**
  - Click the feedback button (bottom-left corner)
  - Report bugs or suggest improvements
  - View your submissions in "My Feedback"

### Test Accounts
See TEST-ACCOUNTS.md for pre-configured test accounts.

---

## ⚠️ Important Notes

### Laptop Requirements
- **Your laptop MUST remain on and connected to the internet**
- Both development servers must keep running:
  - Frontend (Vite): Port 5173
  - Backend (Express): Port 3002
  - Ngrok tunnels: Active in separate window

### Stability
- If ngrok crashes, URLs will change
- If you restart, use `start-external-testing.ps1` again
- Check ngrok window for connection status

### Limitations (Free Plan)
- Maximum 40 requests/minute per IP
- URLs expire when ngrok restarts
- Not suitable for long-term testing (use Phase 2/Railway for that)

---

## 🔍 Monitoring

### Check if Services are Running
```powershell
# Frontend (should show PID on port 5173)
netstat -ano | Select-String ":5173"

# Backend (should show PID on port 3002)
netstat -ano | Select-String ":3002"

# Ngrok (should show running process)
Get-Process ngrok
```

### View Ngrok Dashboard
Open in your browser: http://localhost:4040

This shows:
- Active tunnels and their URLs
- Request/response logs
- Traffic statistics

---

## 🚀 Quick Restart

If services crash:

```powershell
# Navigate to project
cd "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)"

# Run startup script
.\start-external-testing.ps1
```

---

## 📞 Support

If testers encounter issues:
1. Check if URLs are still active (visit them yourself)
2. Verify your laptop is on and connected
3. Check ngrok window for errors
4. Restart services if needed

---

## 📈 Next Steps: Phase 2

For extended testing (days/weeks), consider Railway deployment:
- Permanent URLs (no laptop needed)
- 24/7 uptime
- Professional hosting
- See: RAILWAY_DEPLOYMENT.md
