# The Grassroots Hub - External Testing Setup
# PowerShell script for Windows

Write-Host "🌐 THE GRASSROOTS HUB - EXTERNAL TESTING SETUP" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Yellow

# Check if servers are running
Write-Host "`n🔍 Checking server status..." -ForegroundColor Cyan

$frontendRunning = $false
$backendRunning = $false

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 3 -ErrorAction SilentlyContinue
    $frontendRunning = $true
    Write-Host "📱 Frontend (5173): ✅ Running" -ForegroundColor Green
} catch {
    Write-Host "📱 Frontend (5173): ❌ Not running" -ForegroundColor Red
}

try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
    $backendRunning = $true
    Write-Host "🔧 Backend (5000): ✅ Running" -ForegroundColor Green
} catch {
    Write-Host "🔧 Backend (5000): ❌ Not running" -ForegroundColor Red
}

if (-not $frontendRunning -or -not $backendRunning) {
    Write-Host "`n⚠️  SERVERS NOT RUNNING!" -ForegroundColor Red
    Write-Host "Please start both servers first:" -ForegroundColor Yellow
    Write-Host "1. Backend: cd backend && node server.js" -ForegroundColor White
    Write-Host "2. Frontend: cd .. && npm run dev" -ForegroundColor White
    Write-Host "`nThen run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🚇 EXTERNAL TESTING OPTIONS:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Yellow

Write-Host "`n1. 🟢 LOCALTUNNEL (Easiest - Already installed)" -ForegroundColor Green
Write-Host "   • Free and simple to use"
Write-Host "   • No registration required"
Write-Host "   • Good for quick testing"

Write-Host "`n2. 🔵 NGROK (Most reliable)" -ForegroundColor Blue
Write-Host "   • Industry standard"
Write-Host "   • Better performance"
Write-Host "   • Requires free signup"

Write-Host "`n3. 🟡 CLOUDFLARE TUNNEL (Enterprise grade)" -ForegroundColor Yellow
Write-Host "   • Best security"
Write-Host "   • Custom domains"
Write-Host "   • More setup required"

Write-Host "`n🎯 QUICK START - LOCALTUNNEL:" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Yellow

Write-Host "`nStarting LocalTunnel for external access..." -ForegroundColor Cyan
Write-Host "This will create public URLs for your application" -ForegroundColor Gray

# Start LocalTunnel for backend
Write-Host "`n🔧 Starting backend tunnel..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    npx localtunnel --port 5000 --subdomain grassroots-api-2025
}

# Start LocalTunnel for frontend  
Write-Host "📱 Starting frontend tunnel..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    npx localtunnel --port 5173 --subdomain grassroots-hub-2025
}

# Wait for tunnels to establish
Write-Host "`n⏳ Establishing tunnels (this may take 10-15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Create testing guide
$testingGuide = @"
🌐 EXTERNAL TESTING GUIDE - THE GRASSROOTS HUB
===============================================

📱 PUBLIC ACCESS URLs:
Frontend: https://grassroots-hub-2025.loca.lt
Backend API: https://grassroots-api-2025.loca.lt

⚠️  If URLs above don't work, try these alternatives:
Frontend: https://loca.lt/tunnel?host=localhost&port=5173
Backend: https://loca.lt/tunnel?host=localhost&port=5000

🧪 TEST ACCOUNTS:
===============

Admin User:
- Email: admin@grassrootshub.com
- Password: admin123

Test Coach:
- Email: coach.wilson@email.com  
- Password: password123

Test Player:
- Email: player.martinez@email.com
- Password: password123

Test Parent:
- Email: parent.taylor@email.com
- Password: password123

🎯 TESTING SCENARIOS:
===================

1. **Authentication Testing**
   ✓ Register new accounts (Coach, Player, Parent)
   ✓ Login with test accounts
   ✓ Admin dashboard access
   ✓ Password validation

2. **Team Vacancy Testing**
   ✓ Post new team vacancy (Coach account)
   ✓ Search/filter vacancies
   ✓ View vacancy details
   ✓ Location-based search

3. **Player Availability Testing**
   ✓ Post player availability (Player account)
   ✓ Search available players
   ✓ Multi-position selection
   ✓ Contact information display

4. **Profile Management**
   ✓ Complete user profiles
   ✓ Update contact information
   ✓ Role-specific fields

5. **Real League Data**
   ✓ Browse 35 authentic FA leagues
   ✓ Click through to official FA websites
   ✓ Filter by league categories

6. **Mobile Responsiveness**
   ✓ Test on phones/tablets
   ✓ Navigation usability
   ✓ Form interactions

7. **Admin Features** (Admin account only)
   ✓ Analytics dashboard
   ✓ User management
   ✓ League management

📊 REAL DATA AVAILABLE:
=====================
- 35 authentic FA leagues imported
- 30 leagues with official website links
- Region-based league organization
- Various competition categories

🐛 BUG REPORTING:
===============
Please report any issues with:
- Browser type and version
- Device type (mobile/desktop)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if helpful

📱 DEVICE COMPATIBILITY:
======================
✓ Chrome, Firefox, Safari, Edge
✓ iOS Safari, Android Chrome
✓ Tablets and desktop computers
✓ All screen sizes supported

Thank you for testing The Grassroots Hub! 🏈⚽

"@

# Save testing guide
$guidePath = Join-Path $PSScriptRoot "..\EXTERNAL-TESTING-GUIDE.md"
$testingGuide | Out-File -FilePath $guidePath -Encoding UTF8

Write-Host "`n🎉 EXTERNAL TESTING SETUP COMPLETE!" -ForegroundColor Green
Write-Host ("=" * 40) -ForegroundColor Yellow

Write-Host "`n📱 Share these URLs with your testers:" -ForegroundColor Cyan
Write-Host "Frontend: https://grassroots-hub-2025.loca.lt" -ForegroundColor White
Write-Host "Backend:  https://grassroots-api-2025.loca.lt" -ForegroundColor White

Write-Host "`n📋 Testing guide saved to:" -ForegroundColor Cyan
Write-Host $guidePath -ForegroundColor White

Write-Host "`n🔄 Alternative methods if URLs don't work:" -ForegroundColor Yellow
Write-Host "1. Try different subdomain names" -ForegroundColor Gray
Write-Host "2. Use ngrok (requires signup): https://ngrok.com" -ForegroundColor Gray
Write-Host "3. Deploy to cloud platform" -ForegroundColor Gray

Write-Host "`n🛑 To stop tunnels: Close this PowerShell window" -ForegroundColor Red
Write-Host "⏱️  Tunnels will remain active until you close this session" -ForegroundColor Gray

# Keep the script running to maintain tunnels
Write-Host "`n✅ Tunnels are now active! Press Ctrl+C to stop." -ForegroundColor Green

try {
    while ($true) {
        Start-Sleep -Seconds 30
        # Check if jobs are still running
        if ($backendJob.State -ne "Running" -or $frontendJob.State -ne "Running") {
            Write-Host "`n⚠️  One or more tunnels stopped. Restarting..." -ForegroundColor Yellow
            
            if ($backendJob.State -ne "Running") {
                $backendJob = Start-Job -ScriptBlock {
                    npx localtunnel --port 5000 --subdomain grassroots-api-2025
                }
            }
            
            if ($frontendJob.State -ne "Running") {
                $frontendJob = Start-Job -ScriptBlock {
                    npx localtunnel --port 5173 --subdomain grassroots-hub-2025
                }
            }
        }
    }
} finally {
    # Cleanup
    Write-Host "`n🛑 Stopping tunnels..." -ForegroundColor Red
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}
