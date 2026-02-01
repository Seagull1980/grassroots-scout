# Fly.io Deployment Guide - The Grassroots Scout

## Why Fly.io?

- ✅ **Always-on VMs** (no sleeping like Render/Railway)
- ✅ **Persistent storage** for SQLite database
- ✅ **Global edge network** for fast access
- ✅ **Free tier:** 3 shared VMs, 256MB RAM, 1GB storage

## Prerequisites

- Fly.io account (sign up at fly.io)
- Fly CLI installed

## Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Verify installation
fly version
```

## Step 2: Login to Fly.io

```bash
fly auth login
```

This opens your browser for authentication.

## Step 3: Initialize Project

```bash
# From your project root directory
fly launch

# Answer prompts:
# - Choose app name: grassroots-scout (or your choice)
# - Select region: Choose closest to your users
# - Would you like to copy its configuration to the new app? No
```

## Step 4: Configure Environment Variables

```bash
# Set required environment variables
fly secrets set JWT_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
fly secrets set NODE_ENV="production"
fly secrets set PORT="8080"

# Optional: Add your API keys
fly secrets set GOOGLE_MAPS_API_KEY="your-key-here"
```

## Step 5: Deploy

```bash
fly deploy
```

This will:
1. Build your Docker image
2. Deploy to Fly.io
3. Start your application

## Step 6: Get Your URL

```bash
fly status
```

Your app will be available at: `https://grassroots-scout.fly.dev`

## Database Persistence

Fly.io provides persistent volumes. Your SQLite database will persist between deployments.

## Monitoring & Logs

```bash
# View logs
fly logs

# Check app status
fly status

# SSH into the VM (if needed)
fly ssh console
```

## Cost Management

**Free Tier Limits:**
- 3 shared VMs
- 256MB RAM per VM
- 1GB storage
- 160GB outbound data/month

**Upgrade when needed:**
```bash
fly scale memory 512  # Increase RAM
fly scale count 2     # Add more VMs
```

## Troubleshooting

**Common Issues:**

1. **Build fails:** Check your Dockerfile.fly
2. **App won't start:** Check logs with `fly logs`
3. **Database issues:** SQLite should work fine with persistent storage

**Reset deployment:**
```bash
fly destroy
fly launch  # Start over
```