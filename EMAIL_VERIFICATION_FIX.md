# Fix Email Verification for Production on Render

## The Problem
Email verification links were pointing to `localhost:5174` which doesn't work in production. Users clicking the verification link get "can't reach this page" error.

## The Solution
Added `FRONTEND_URL` environment variable that must be set on Render to your actual production URL.

## Setup Instructions for Render.com

### 1. Find Your Render App URL
After deploying to Render, your app will have a URL like:
- `https://grassroots-scout.onrender.com` (or similar)

### 2. Set Environment Variable on Render
1. Go to your Render dashboard
2. Click on your web service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://your-actual-app-name.onrender.com` (your real URL)

### 3. Required Environment Variables on Render
Make sure these are ALL set:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=your-strong-secret-key-here
ENCRYPTION_KEY=64-character-hex-string-here
FRONTEND_URL=https://your-app-name.onrender.com
EMAIL_USER=thegrassrootsupp@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM="Grassroots Hub <noreply@grassrootshub.com>"
DB_TYPE=sqlite
```

### 4. Redeploy
After adding `FRONTEND_URL`, trigger a new deployment:
- Render will auto-deploy when you push to GitHub
- Or manually trigger: Dashboard > Manual Deploy > Deploy latest commit

### 5. Test Email Verification
1. Register a new account
2. Check the verification email
3. The link should now point to `https://your-app-name.onrender.com/verify-email/...`
4. Clicking it should work! ✅

## What Changed
- ✅ Email service now uses `process.env.FRONTEND_URL` for verification links
- ✅ Fallback to `http://localhost:5173` for local development
- ✅ Fixed encryption key length validation
- ✅ Added `.env.production.example` template

## Local Development
For local development, the `.env` file has:
```
FRONTEND_URL=http://localhost:5173
```
This works for testing locally.

## Important Notes
- Without `FRONTEND_URL` set on Render, emails will still use localhost (won't work)
- The URL must match exactly (including https://)
- Don't include trailing slash in FRONTEND_URL
- Email verification tokens expire in 24 hours
