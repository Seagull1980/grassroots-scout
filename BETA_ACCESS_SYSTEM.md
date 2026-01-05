# Beta Access System - Complete Setup Guide

## 🎯 Overview

The beta access system allows you to deploy your site publicly (on any hosting platform) while controlling who can use it. This eliminates the need for ngrok or any tunneling service!

## ✨ How It Works

1. **Public Deployment**: Deploy to Render, Railway, Vercel, etc. (free hosting)
2. **Registration Open**: Anyone can register an account
3. **Beta Access Required**: New users get `betaAccess = false` by default
4. **Admin Approval**: Admins grant beta access to approved beta testers
5. **Automatic Email**: Users receive welcome email when granted access

## 🚀 Setup Steps

### Step 1: Run the Database Migration

```powershell
cd backend
node migrations/add-beta-access.js
```

This will:
- Add `betaAccess` column to users table
- Set `betaAccess = true` for all existing users
- Ensure all admins have beta access

### Step 2: Test Locally

Start your servers:
```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

### Step 3: Test Beta Access Flow

1. **Create a test user**:
   - Register at `http://localhost:5173/register`
   - New users will have `betaAccess = false` automatically

2. **Login as admin**:
   - Use an existing admin account
   - Navigate to `/admin/beta-access`

3. **Grant beta access**:
   - Toggle the switch for your test user
   - User receives welcome email
   - User can now access the app

4. **Test access denied**:
   - Login with a user who has `betaAccess = false`
   - Should be redirected to `/beta-access-denied`

### Step 4: Deploy to Hosting Platform

Choose your preferred free hosting:

#### Option A: Render.com (Recommended - Best Free Tier)

```powershell
# 1. Push to GitHub
git add .
git commit -m "Add beta access system"
git push

# 2. Go to render.com
# 3. Create New Web Service
# 4. Connect your GitHub repo
# 5. Configure:
#    - Build Command: npm install && npm run build
#    - Start Command: node backend/server.js
#    - Environment Variables: Set JWT_SECRET, EMAIL_USER, EMAIL_PASS
```

#### Option B: Railway

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Set environment variables
railway variables set JWT_SECRET="your-secret"
railway variables set NODE_ENV="production"

# Deploy
railway up
```

#### Option C: Vercel (Frontend) + Render (Backend)

```powershell
# Deploy frontend to Vercel
npm install -g vercel
vercel

# Deploy backend to Render (see Option A)
```

### Step 5: Configure Production Environment

Set these environment variables on your hosting platform:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@grassrootshub.com
FRONTEND_URL=https://your-app-url.com
PORT=3001
```

## 📱 Admin Features

### Beta Access Management

Admins can access the beta access dashboard at `/admin/beta-access`:

**Features**:
- ✅ View all users and their beta access status
- ✅ Enable/disable beta access with one click
- ✅ Search users by name or email
- ✅ See statistics (total users, granted, pending)
- ✅ Automatic email notifications when access granted
- ✅ Admins always have beta access (cannot be disabled)

### Grant Beta Access

Two ways to grant beta access:

1. **Via UI** (Easy):
   - Go to `/admin/beta-access`
   - Toggle switch next to user's name
   - User receives email automatically

2. **Via API** (Programmatic):
   ```javascript
   PATCH /api/admin/users/:id/beta-access
   Body: { betaAccess: true }
   ```

## 🎨 User Experience

### New User Registration

1. User registers at `/register`
2. Receives email verification
3. Verifies email
4. Logs in
5. **Redirected to `/beta-access-denied`** (if no beta access)
6. Sees message: "Your account is pending review"
7. Admin grants access
8. User receives welcome email
9. User can now access the app!

### Beta Access Denied Page

Shows users:
- ✅ Friendly message explaining beta testing
- ✅ Expected wait time (24-48 hours)
- ✅ Contact support button
- ✅ Logout option

## 🔐 Security Features

- ✅ **Admins always have access** - Cannot be disabled
- ✅ **JWT tokens unchanged** - Works with existing auth
- ✅ **No breaking changes** - Existing users keep access
- ✅ **Middleware check** - Verifies beta access on API calls
- ✅ **Database-driven** - Easy to manage

## 🌐 Deployment Benefits

### Why This is Better Than ngrok

| Feature | Beta Access System | ngrok/Tunnel |
|---------|-------------------|--------------|
| **Cost** | FREE | Limited free tier |
| **Stability** | ✅ Always on | ⚠️ Disconnects |
| **URL** | ✅ Permanent | ⚠️ Changes daily |
| **Speed** | ✅ Fast (CDN) | ⚠️ Slower |
| **Control** | ✅ Full control | ⚠️ Limited |
| **Professional** | ✅ Yes | ⚠️ No |
| **SSL/HTTPS** | ✅ Automatic | ⚠️ Limited |
| **Bandwidth** | ✅ Unlimited | ⚠️ Limited |

### Free Hosting Options

1. **Render.com**:
   - ✅ Free PostgreSQL database
   - ✅ Automatic SSL
   - ✅ GitHub auto-deploy
   - ⚠️ Sleeps after 15min inactivity

2. **Railway**:
   - ✅ $5 free credits/month
   - ✅ No auto-sleep
   - ✅ Very fast
   - ⚠️ Credits run out

3. **Fly.io**:
   - ✅ Better free tier
   - ✅ Fast global network
   - ✅ Volumes included
   - ⚠️ Steeper learning curve

## 📊 Beta Testing Strategy

### Phase 1: Soft Launch (Week 1)
- Grant access to 5-10 trusted testers
- Monitor for critical bugs
- Gather initial feedback

### Phase 2: Expansion (Week 2-3)
- Grant access to 25-50 users
- Test under load
- Iterate on feedback

### Phase 3: Open Beta (Week 4+)
- Auto-approve new registrations
- Or keep manual approval for quality control

### Auto-Approve Script (Optional)

If you want to auto-approve users after testing:

```javascript
// backend/auto-approve-beta.js
const Database = require('./db/database.js');
const db = new Database();

// Auto-approve users who registered more than 24 hours ago
setInterval(async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.query(
    'UPDATE users SET betaAccess = 1 WHERE betaAccess = 0 AND createdAt < ?',
    [oneDayAgo.toISOString()]
  );
}, 60 * 60 * 1000); // Run every hour
```

## 🐛 Troubleshooting

### "betaAccess column doesn't exist"
```powershell
cd backend
node migrations/add-beta-access.js
```

### "All users blocked from accessing app"
Check that existing users have `betaAccess = 1`:
```sql
UPDATE users SET betaAccess = 1 WHERE role IN ('Coach', 'Player', 'Parent/Guardian', 'Admin');
```

### "Can't access admin panel"
Ensure your admin account has beta access:
```sql
UPDATE users SET betaAccess = 1 WHERE role = 'Admin';
```

### "Beta access emails not sending"
Check your email service configuration in `.env`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

## 📈 Next Steps

1. ✅ Run migration
2. ✅ Test locally
3. ✅ Deploy to hosting platform
4. ✅ Share public URL with beta testers
5. ✅ Grant access via admin panel
6. ✅ Monitor feedback
7. ✅ Iterate and improve!

## 🎉 You're Done!

Your app is now publicly accessible with controlled beta access. No more ngrok, no more tunnel services, no more headaches!

**Share your app URL**: `https://your-app.render.com` (or whatever your hosting URL is)

Anyone can register, but only approved users can access the full app. Perfect for beta testing! 🚀
