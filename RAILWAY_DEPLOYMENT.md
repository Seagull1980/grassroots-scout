# Railway Deployment Guide - The Grassroots Scout

## Prerequisites
- Railway account (sign up at railway.app)
- Railway CLI installed
- Git repository ready

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Initialize Project

```bash
# From your project root directory
railway init
```

Choose:
- Create a new project
- Name it "grassroots-scout" or similar

## Step 4: Link to Railway Project

```bash
railway link
```

Select your newly created project.

## Step 5: Set Environment Variables

Go to Railway dashboard (railway.app) or use CLI:

```bash
# Set JWT Secret (generate a random string)
railway variables set JWT_SECRET="your-secure-random-string-here"

# Set Node Environment
railway variables set NODE_ENV="production"

# Email configuration (if using Gmail)
railway variables set EMAIL_USER="your-email@gmail.com"
railway variables set EMAIL_PASSWORD="your-app-specific-password"
railway variables set EMAIL_FROM="noreply@grassrootshub.com"

# Google Maps (if you have API key)
railway variables set GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

**Note:** BASE_URL and FRONTEND_URL will be automatically set by Railway after first deployment.

## Step 6: Create .railwayignore

Already created. This prevents uploading unnecessary files.

## Step 7: Deploy!

```bash
railway up
```

This will:
1. Upload your code
2. Install dependencies
3. Build the React app (npm run build)
4. Start the server (node railway-server.js)

## Step 8: Get Your URL

After deployment completes:

```bash
railway domain
```

Or check the Railway dashboard. Your app will be at:
`https://your-app.railway.app`

## Step 9: Update API URLs in Frontend

After getting your Railway URL, you'll need to update the API URLs in your React app to use relative paths (already done) or the Railway domain.

The app is configured to use relative paths like `/api/...` which will work automatically.

## Step 10: Database Migration

On first deploy, run the migrations:

```bash
# Connect to your Railway deployment
railway run bash

# Run migrations
node backend/migrations/add-feedback-system.js
node backend/migrations/add-clubname-to-rosters.js
node backend/migrations/add-club-updates.js

# Exit
exit
```

Or add a migration script to package.json and run it as a deployment step.

## Monitoring & Logs

```bash
# View logs
railway logs

# View logs in real-time
railway logs --follow
```

## Updates

To deploy updates:

```bash
# Make your code changes
git add .
git commit -m "Update message"

# Deploy to Railway
railway up
```

## Database Backups

Railway provides automatic backups, but you can also:

```bash
# Download database locally
railway run bash
# Then scp or use railway CLI to download database.sqlite
```

## Cost Estimate

Railway free tier includes:
- $5 credit per month
- 500 hours execution time
- Shared CPU/RAM

For beta testing with 20-50 users, the free tier should be sufficient. After that, costs are:
- ~$5-10/month for small usage
- Scales automatically with traffic

## Troubleshooting

### Build fails:
- Check `railway logs`
- Ensure all dependencies in package.json
- Check Node version compatibility

### App crashes:
- Check logs: `railway logs`
- Verify environment variables
- Check database migrations ran

### Cannot connect to database:
- Ensure SQLite file is created
- Check file permissions
- Run migrations

## Production Checklist

Before sharing with beta testers:

- [ ] JWT_SECRET is set to secure random string
- [ ] Email configuration tested (password reset works)
- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test all major features
- [ ] Remove AuthDebugger from production
- [ ] Set up error monitoring (Sentry)
- [ ] Configure CORS properly
- [ ] Test on mobile devices
- [ ] Have feedback system ready for bug reports!

## Alternative: One-Click Deploy

Railway also supports:
1. Connect GitHub repository
2. Auto-deploy on push
3. No CLI needed

To set this up:
1. Push code to GitHub
2. Go to railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Configure environment variables
6. Deploy!

## Support

Railway documentation: https://docs.railway.app
Railway Discord: https://discord.gg/railway

## Next Steps After Deployment

1. **Share URL with beta testers**
2. **Create test accounts** for different roles
3. **Monitor feedback** via /admin/feedback
4. **Watch logs** for errors
5. **Iterate based on feedback**

Good luck with your beta testing! 🚀
