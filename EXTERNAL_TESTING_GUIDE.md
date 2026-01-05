# 🚀 Complete External Testing Setup Guide

## ✅ Current Server Status (All Running!)
- Frontend: http://localhost:5173/
- Backend API: http://localhost:3001/
- Team Roster: http://localhost:5000/
- Playing History: http://localhost:3002/

## 🌐 ngrok Setup Instructions

### Step 1: Get ngrok Auth Token
1. Go to: https://ngrok.com/
2. Sign up (free account - can use GitHub/Google)
3. Go to Dashboard → "Your Authtoken"
4. Copy the token (format: 2abc123def456...)

### Step 2: Configure ngrok
Run this command with your token:
```
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### Step 3: Start Tunnels

#### Option A: Single Frontend Tunnel (Recommended for testing)
```
ngrok http 5173
```

#### Option B: Both Frontend + Backend (Full functionality)
Open TWO terminals and run:

Terminal 1:
```
ngrok http 5173 --region us --subdomain your-app-name
```

Terminal 2:
```
ngrok http 3001 --region us --subdomain your-api-name
```

## 📱 Test Credentials
- Email: cgill1980@hotmail.com
- Password: admin123
- Role: Admin

## 🎯 What Testers Will Get
After running ngrok, you'll get URLs like:
- Frontend: https://abc123.ngrok-free.app
- Backend: https://def456.ngrok-free.app

## ⚡ Quick Start Commands

1. Get token from ngrok.com
2. Run: `ngrok config add-authtoken YOUR_TOKEN`
3. Run: `ngrok http 5173`
4. Share the https://xxx.ngrok-free.app URL!

## 🔧 Features Ready for Testing
- ✅ Mobile-friendly map search
- ✅ Multi-select functionality  
- ✅ Touch-friendly controls
- ✅ Bulk contact system
- ✅ Responsive design
- ✅ Drawing tools and saved regions
