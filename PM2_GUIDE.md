# PM2 Auto-Restart Setup

Your development server is now set up with PM2 process management for automatic monitoring and restarting.

## Quick Start

### Start with PM2 Monitoring

**Dev server only:**
```bash
npm run pm2:dev
```

**Full stack (dev + all backend services):**
```bash
npm run pm2:full
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run pm2:dev` | Start Vite dev server with auto-restart |
| `npm run pm2:full` | Start dev server + all backend services |
| `npm run pm2:stop` | Stop all PM2 processes |
| `npm run pm2:restart` | Restart all PM2 processes |
| `npm run pm2:status` | View status of all running processes |
| `npm run pm2:logs` | View real-time logs |
| `npm run pm2:kill` | Stop PM2 daemon completely |

## How It Works

PM2 is configured to:
- ✅ **Automatically restart** if the dev server crashes
- ✅ **Monitor memory usage** (max 500MB for dev, 300MB for backend)
- ✅ **Log errors & output** to `logs/` directory
- ✅ **Auto-recover** up to 10 restarts before giving up
- ✅ **Wait 10 seconds** before restart to ensure proper shutdown

## Logs

All logs are saved to:
- `logs/dev-out.log` - Dev server output
- `logs/dev-error.log` - Dev server errors
- `logs/backend-out.log` - Backend server output
- `logs/backend-error.log` - Backend server errors

View live logs with:
```bash
npm run pm2:logs
```

Or tail specific logs:
```bash
tail -f logs/dev-out.log
```

## What Changed

1. **Created** `ecosystem.config.js` - PM2 configuration file
2. **Updated** `package.json` - Added PM2 npm scripts
3. **Created** `logs/` directory - For log files

## Troubleshooting

If you need to stop everything:
```bash
npm run pm2:kill
```

To completely reset and start fresh:
```bash
npm run pm2:kill
npm run pm2:dev
```

## Going back to manual startup

You can still use the traditional commands:
```bash
npm run dev          # Manual Vite startup
npm run dev:full     # Manual full stack startup
```

The PM2 setup is optional - use whichever works best for your workflow!
