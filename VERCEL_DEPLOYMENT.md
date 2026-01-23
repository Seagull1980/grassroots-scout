# Vercel Deployment Guide - The Grassroots Scout

## Prerequisites
- Vercel account (sign up at vercel.com)
- Vercel CLI installed (`npm install -g vercel`)
- Railway backend deployed (for API endpoints)

## Step 1: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate.

## Step 2: Update vercel.json

Edit `vercel.json` and replace `your-railway-backend-url.railway.app` with your actual Railway backend URL.

## Step 3: Set Environment Variables

Set these environment variables in Vercel dashboard or via CLI:

```bash
vercel env add VITE_API_URL
# Enter: https://your-railway-backend-url.railway.app/api

vercel env add VITE_ROSTER_API_URL
# Enter: https://your-railway-backend-url.railway.app

# Add other required environment variables:
vercel env add VITE_GOOGLE_MAPS_API_KEY
vercel env add VITE_GOOGLE_CLIENT_ID
vercel env add VITE_OUTLOOK_CLIENT_ID
vercel env add VITE_WEATHER_API_KEY
```

## Step 4: Deploy

```bash
vercel
```

Follow the prompts:
- Link to existing project or create new
- Set project name: "grassroots-scout-frontend"
- Directory: ./ (current directory)

## Step 5: Production Deployment

```bash
vercel --prod
```

## Architecture Notes

- **Frontend**: Deployed to Vercel (static React app)
- **Backend**: Remains on Railway (persistent Node.js servers)
- **API Proxy**: Vercel routes `/api/*` requests to Railway backend

## Benefits of This Setup

- ⚡ Fast frontend delivery via Vercel's CDN
- 💰 Free tier covers most usage
- 🔄 Easy deployments from Git
- 🛡️ Backend security on Railway
- 📊 Better performance for static assets

## Troubleshooting

- If API calls fail, check that `vercel.json` has the correct Railway URL
- Ensure environment variables are set in Vercel dashboard
- Check Vercel function logs for any routing issues