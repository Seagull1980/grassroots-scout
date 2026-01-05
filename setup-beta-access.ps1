# Quick Setup - Beta Access System

Write-Host "🚀 Setting up Beta Access System..." -ForegroundColor Green

# Step 1: Run migration
Write-Host "`n📊 Step 1: Running database migration..." -ForegroundColor Cyan
Set-Location -Path "backend"
node migrations/add-beta-access.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check the error above." -ForegroundColor Red
    exit 1
}

Set-Location -Path ".."

# Step 2: Check if servers are running
Write-Host "`n🔍 Step 2: Checking if servers are running..." -ForegroundColor Cyan

$backendRunning = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendRunning = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if (-not $backendRunning) {
    Write-Host "⚠️  Backend not running on port 3001" -ForegroundColor Yellow
    Write-Host "   Start it with: cd backend && npm start" -ForegroundColor Gray
}

if (-not $frontendRunning) {
    Write-Host "⚠️  Frontend not running on port 5173" -ForegroundColor Yellow
    Write-Host "   Start it with: npm run dev" -ForegroundColor Gray
}

# Step 3: Show next steps
Write-Host "`n✅ Beta Access System Setup Complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test locally:" -ForegroundColor White
Write-Host "   - Visit http://localhost:5173/admin/beta-access" -ForegroundColor Gray
Write-Host "   - Create a test user and grant/revoke beta access" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy to hosting:" -ForegroundColor White
Write-Host "   Render:  See BETA_ACCESS_SYSTEM.md - Option A" -ForegroundColor Gray
Write-Host "   Railway: See BETA_ACCESS_SYSTEM.md - Option B" -ForegroundColor Gray
Write-Host "   Vercel:  See BETA_ACCESS_SYSTEM.md - Option C" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Share your public URL with beta testers!" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full documentation: BETA_ACCESS_SYSTEM.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 No more ngrok needed!" -ForegroundColor Green
