Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Login Flow Debug Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test 1: Checking Server Status..." -ForegroundColor Yellow
try {
    $authServer = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  [OK] Auth Server (Port 3001): Running" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] Auth Server (Port 3001): Not Running" -ForegroundColor Red
    Write-Host "    Start with: npm run dev" -ForegroundColor Gray
}

try {
    $frontendServer = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  [OK] Frontend Server (Port 5173): Running" -ForegroundColor Green
}
catch {
    Write-Host "  [FAIL] Frontend Server (Port 5173): Not Running" -ForegroundColor Red
    Write-Host "    Start with: npm run dev" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Test 2: Testing Login Endpoint..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "coach@example.com"
        password = "password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.token -and $loginData.user) {
        Write-Host "  [OK] Login Endpoint: Working" -ForegroundColor Green
        Write-Host "    User: $($loginData.user.email)" -ForegroundColor Gray
    }
    else {
        Write-Host "  [FAIL] Login Endpoint: Invalid Response" -ForegroundColor Red
    }
}
catch {
    Write-Host "  [FAIL] Login Endpoint: Error" -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 3: Opening Diagnostic Tool..." -ForegroundColor Yellow
$diagnosticPath = Join-Path $PSScriptRoot "test-login-flow.html"
if (Test-Path $diagnosticPath) {
    Write-Host "  Opening test-login-flow.html..." -ForegroundColor Gray
    Start-Process $diagnosticPath
    Write-Host "  [OK] Diagnostic tool opened" -ForegroundColor Green
}
else {
    Write-Host "  [FAIL] test-login-flow.html not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Check browser console for [AuthContext] logs" -ForegroundColor White
Write-Host "2. Use the diagnostic tool to test login flow" -ForegroundColor White
Write-Host "3. Monitor Network tab for 401 errors" -ForegroundColor White
Write-Host ""
