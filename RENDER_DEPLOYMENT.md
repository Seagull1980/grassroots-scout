# Render Deployment Guide - The Grassroots Scout

## Overview
This guide will help you deploy The Grassroots Scout application to Render. The application is a full-stack React + Express.js app that will be deployed as a single web service.

## Prerequisites
- Render account (sign up at render.com)
- Git repository with your code
- Required API keys and credentials

## Step 1: Prepare Your Repository

1. Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
2. Ensure the `render.yaml` file is included in your repository

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your Git repository
4. Render will automatically detect the `render.yaml` file and set up the service

### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your Git repository
4. Configure the service:
   - **Name**: grassroots-scout (or your preferred name)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

## Step 3: Configure Environment Variables

In your Render service settings, add these environment variables:

### Required Variables
```
NODE_ENV=production
JWT_SECRET=<generate-a-secure-random-string>
```

### API Keys (Get these from respective services)
```
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
VITE_OUTLOOK_CLIENT_ID=<your-outlook-client-id>
VITE_WEATHER_API_KEY=<your-weather-api-key>
```

### Email Configuration (for notifications)
```
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASS=<your-email-app-password>
```

### Database (Optional - uses SQLite by default)
```
DATABASE_URL=<postgresql-connection-string>
```

## Step 4: Set Up Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. **ENABLE BILLING** (required - $200 free credits available)
4. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Geometry API
5. Create an API key and add it to Render environment variables

## Step 5: Deploy

1. Click "Create Web Service" on Render
2. Wait for the build to complete (this may take several minutes)
3. Once deployed, your app will be available at the provided URL

## Step 6: Post-Deployment Setup

1. Visit your deployed app
2. Create an admin account using the setup script:
   ```bash
   # Run this locally or in Render's shell
   npm run setup-admin
   ```

## Troubleshooting

### Build Failures
- Check that all dependencies are listed in `package.json`
- Ensure Node.js version is compatible (16+ recommended)
- Check build logs for specific errors

### Runtime Issues
- Verify all environment variables are set correctly
- Check that API keys are valid and have proper permissions
- Ensure database connectivity if using external database

### CORS Issues
- The app is configured to work with Render's deployment URLs
- If you need custom domains, update the CORS configuration in `backend/server.js`

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `JWT_SECRET` | Yes | Random string for JWT signing |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps API key |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `VITE_OUTLOOK_CLIENT_ID` | No | Outlook OAuth client ID |
| `VITE_WEATHER_API_KEY` | No | Weather API key |
| `EMAIL_USER` | No | Email address for notifications |
| `EMAIL_PASS` | No | Email app password |
| `DATABASE_URL` | No | PostgreSQL connection string |

## Security Notes

- Never commit API keys or secrets to your repository
- Use Render's environment variable system for all sensitive data
- Regularly rotate your JWT secret
- Keep dependencies updated for security patches

## Support

If you encounter issues:
1. Check Render's deployment logs
2. Verify environment variables are set correctly
3. Test locally with `npm run build && npm start`
4. Check the [Render Documentation](https://docs.render.com/)