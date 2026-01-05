# 🚀 External Testing Setup Guide
# The Grassroots Hub - Quick Start for External Testing

## 🎯 One-Click Setup

### Option 1: PowerShell Script (Recommended)
```powershell
# Navigate to project directory
cd "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4"

# Run the setup script
.\start-external-testing.ps1
```

### Option 2: Batch File (Alternative)
```cmd
# Double-click the file or run from command prompt
start-external-testing.bat
```

### Option 3: NPM Scripts (Developer)
```bash
# Quick start (keeps existing processes)
npm run test:external:quick

# Full start (cleans up first)
npm run test:external

# Just update URLs if ngrok is already running
npm run update:urls

# Setup admin user only
npm run setup:admin
```

## 🔧 Manual Setup (If Scripts Fail)

### Step 1: Start Services
```powershell
# Terminal 1: Backend
cd "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4\backend"
npm start

# Terminal 2: Frontend
cd "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4"
npm run dev

# Terminal 3: ngrok
cd "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4"
ngrok start --all --config="ngrok.yml"
```

### Step 2: Update Configuration
```powershell
# Update frontend URLs to match ngrok
node scripts/update-ngrok-urls.js
```

### Step 3: Setup Test Accounts
```powershell
# Create admin account
cd backend
node scripts/create-admin-user.js
```

## 📱 Test Accounts

### 👑 Admin Account
- **Email:** `admin@grassrootshub.com`
- **Password:** `admin123`
- **Features:** Full admin access, user management, analytics

### 🏆 Coach Account  
- **Email:** `cgill1980@hotmail.com`
- **Password:** `admin123`
- **Features:** Team vacancy posting, player search, roster management

## 🌐 After Setup

1. **Find your URLs** in the ngrok terminal output:
   - Frontend: `https://xxxxxx.ngrok-free.app` (for users)
   - Backend: `https://xxxxxx.ngrok-free.app` (for API testing)

2. **Share the Frontend URL** with testers

3. **Test Features:**
   - Mobile responsiveness
   - Touch-friendly map controls
   - Multi-select functionality
   - Admin dashboard
   - Authentication flows

## 🛑 Stop Testing

```powershell
# Stop all processes
npm run stop:testing

# Or manually
taskkill /f /im node.exe
taskkill /f /im ngrok.exe
```

## 🔧 Troubleshooting

### Common Issues:

**1. Port Already in Use**
```powershell
# Kill existing processes
taskkill /f /im node.exe
taskkill /f /im ngrok.exe
```

**2. ngrok ERR_NGROK_3200**
```powershell
# Restart ngrok tunnels
ngrok start --all --config="ngrok.yml"
# Then update URLs
node scripts/update-ngrok-urls.js
```

**3. Frontend Shows "Host Not Allowed"**
```powershell
# Update Vite config automatically
node scripts/update-ngrok-urls.js
```

**4. Can't Access Admin Features**
```powershell
# Recreate admin user
cd backend
node scripts/create-admin-user.js
```

## 📋 Checklist for Future Testing

- [ ] Run `.\start-external-testing.ps1`
- [ ] Wait for ngrok URLs to appear
- [ ] Test frontend URL in browser
- [ ] Login with test accounts
- [ ] Test mobile responsiveness
- [ ] Test multi-select features
- [ ] Share URL with testers
- [ ] Stop services when done: `npm run stop:testing`

## 🎉 That's It!

Your external testing environment should now be live and accessible from anywhere! The PowerShell script handles everything automatically - just run it and share the ngrok URL with your testers.

---
*Last updated: August 26, 2025*
