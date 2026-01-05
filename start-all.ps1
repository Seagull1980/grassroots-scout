# Start All Services for External Testing
# Starts backend, frontend, and ngrok tunnels in the correct order

Write-Host "🚀 Starting The Grassroots Scout - External Testing Environment" -ForegroundColor Cyan
Write-Host ""

# 1. Stop any existing ngrok processes
Write-Host "1️⃣ Checking for existing ngrok processes..." -ForegroundColor Yellow
$ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Stopped $($ngrokProcesses.Count) existing ngrok process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ℹ️  No existing ngrok processes found" -ForegroundColor Gray
}

# 2. Check if backend is running
Write-Host ""
Write-Host "2️⃣ Checking backend server (port 3001)..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend server is already running" -ForegroundColor Green
        $backendRunning = $true
    }
} catch {
    Write-Host "   ⚠️  Backend server is not running" -ForegroundColor Yellow
    Write-Host "   📝 Please start the backend server manually:" -ForegroundColor Cyan
    Write-Host "      cd backend; node server.js" -ForegroundColor White
    Write-Host ""
}

# 3. Check if frontend is running
Write-Host ""
Write-Host "3️⃣ Checking frontend server (port 5173)..." -ForegroundColor Yellow
$frontendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend server is already running" -ForegroundColor Green
        $frontendRunning = $true
    }
} catch {
    Write-Host "   ⚠️  Frontend server is not running" -ForegroundColor Yellow
    Write-Host "   📝 Please start the frontend server manually or use the task:" -ForegroundColor Cyan
    Write-Host "      'Start Development Server' task in VS Code" -ForegroundColor White
    Write-Host ""
}

# 4. Start ngrok only if both servers are running
Write-Host ""
Write-Host "4️⃣ Starting ngrok tunnels..." -ForegroundColor Yellow

if (-not $backendRunning -or -not $frontendRunning) {
    Write-Host ""
    Write-Host "❌ Cannot start ngrok - required servers are not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Required services:" -ForegroundColor Yellow
    if (-not $backendRunning) {
        Write-Host "   ❌ Backend (port 3001) - NOT RUNNING" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Backend (port 3001) - RUNNING" -ForegroundColor Green
    }
    if (-not $frontendRunning) {
        Write-Host "   ❌ Frontend (port 5173) - NOT RUNNING" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Frontend (port 5173) - RUNNING" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "Please start the missing services and run this script again." -ForegroundColor Yellow
    exit 1
}

# Both servers are running, start ngrok
$ngrokConfig = Join-Path $PSScriptRoot "ngrok.yml"
if (Test-Path $ngrokConfig) {
    Start-Process -FilePath "ngrok" -ArgumentList "start", "--all", "--config", $ngrokConfig -NoNewWindow
    Start-Sleep -Seconds 3
    
    Write-Host "   ✅ Ngrok tunnels started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ ALL SERVICES RUNNING" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 View your ngrok tunnel URLs at:" -ForegroundColor Cyan
    Write-Host "   http://127.0.0.1:4040" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Services:" -ForegroundColor Cyan
    Write-Host "   Frontend (local): http://localhost:5173" -ForegroundColor White
    Write-Host "   Backend (local):  http://localhost:3001" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "   ❌ Error: ngrok.yml not found at $ngrokConfig" -ForegroundColor Red
    exit 1
}
