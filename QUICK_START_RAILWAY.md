# Quick Start - Railway Deployment

## Step 1: Install Railway CLI

```powershell
npm install -g @railway/cli
```

## Step 2: Login

```powershell
railway login
```

## Step 3: Initialize Project

```powershell
railway init
```

Select: **Create new project** → Name it "grassroots-scout"

## Step 4: Set Environment Variables

```powershell
railway variables set JWT_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
railway variables set NODE_ENV="production"
```

## Step 5: Deploy

```powershell
railway up
```

Wait 3-5 minutes for build and deployment.

## Step 6: Generate Domain

```powershell
railway domain
```

This creates your public URL: `https://your-app.railway.app`

## Step 7: Test!

Visit your URL and test:
- ✅ Registration
- ✅ Login  
- ✅ Post adverts
- ✅ Search
- ✅ Feedback system

## Troubleshooting

**Build fails?**
```powershell
railway logs
```

**Need to run migrations?**
```powershell
railway run bash
cd backend
node migrations/add-feedback-system.js
exit
```

**Update deployment:**
```powershell
railway up
```

## Monitor

```powershell
# View logs
railway logs --follow
```

## Share with Beta Testers

Your URL: `https://your-app.railway.app`

Create test accounts:
- Coach account
- Player account  
- Parent account

Share credentials with testers and gather feedback via `/admin/feedback`!

---

**Estimated Time:** 10-15 minutes
**Cost:** Free tier ($5/month credit)
