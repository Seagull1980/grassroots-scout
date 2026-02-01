# Railway Deployment Script
# Run this in PowerShell from your project root directory

Write-Host "🚀 Starting Railway deployment..." -ForegroundColor Green
Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Yellow

# Check if railway CLI is available
try {
    $railwayVersion = railway --version 2>$null
    Write-Host "✅ Railway CLI version: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Run: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check railway status
Write-Host "🔍 Checking Railway connection..." -ForegroundColor Cyan
try {
    railway status
} catch {
    Write-Host "❌ Not connected to Railway project." -ForegroundColor Red
    Write-Host "Run: railway login && railway link" -ForegroundColor Yellow
    exit 1
}

# Deploy
Write-Host "📦 Deploying to Railway..." -ForegroundColor Cyan
railway up

Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host "📊 Check your Railway dashboard for deployment status." -ForegroundColor Cyan