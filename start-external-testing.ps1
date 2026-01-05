# External Testing Setup PowerShell Script
# The Grassroots Hub - Automated External Testing Setup
# This script automates the complete setup for external testing via ngrok

param(
    [switch]$SkipCleanup,
    [switch]$ShowUrls,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
🚀 External Testing Setup Script for The Grassroots Hub

USAGE:
    .\start-external-testing.ps1 [options]

OPTIONS:
    -SkipCleanup    Skip killing existing Node.js and ngrok processes
    -ShowUrls       Show the current ngrok URLs after setup
    -Help           Show this help message

EXAMPLES:
    .\start-external-testing.ps1                    # Full setup
    .\start-external-testing.ps1 -SkipCleanup      # Keep existing processes
    .\start-external-testing.ps1 -ShowUrls         # Setup and show URLs

"@ -ForegroundColor Green
    exit
}

# Configuration
$ProjectDir = "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)"
$BackendDir = "$ProjectDir\backend"
$NgrokConfig = "$ProjectDir\ngrok.yml"

# Colors
function Write-Step($message) { Write-Host "=== $message ===" -ForegroundColor Blue }
function Write-Success($message) { Write-Host "✅ $message" -ForegroundColor Green }
function Write-Warning($message) { Write-Host "⚠️  $message" -ForegroundColor Yellow }
function Write-Error($message) { Write-Host "❌ $message" -ForegroundColor Red }

Write-Host "🚀 Starting External Testing Setup for The Grassroots Hub..." -ForegroundColor Cyan

# Step 1: Cleanup (optional)
if (-not $SkipCleanup) {
    Write-Step "Cleaning up existing processes"
    try {
        # Stop ngrok processes first
        $ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
        if ($ngrokProcesses) {
            Write-Host "Stopping existing ngrok processes..."
            Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        
        # Stop node processes
        taskkill /f /im node.exe 2>$null | Out-Null
        Write-Success "Cleaned up existing processes"
    } catch {
        Write-Warning "No processes to clean up"
    }
    Start-Sleep -Seconds 2
}

# Step 2: Start backend server
Write-Step "Starting backend server"
Push-Location $BackendDir
$BackendJob = Start-Job -ScriptBlock { 
    Set-Location $using:BackendDir
    npm start 
} -Name "BackendServer"
Pop-Location
Start-Sleep -Seconds 5
Write-Success "Backend server started on port 3001"

# Step 3: Start frontend server
Write-Step "Starting frontend server"
Push-Location $ProjectDir
$FrontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:ProjectDir
    npm run dev 
} -Name "FrontendServer"
Pop-Location
Start-Sleep -Seconds 5
Write-Success "Frontend server started on port 5173"

# Step 4: Wait for servers to be ready
Write-Step "Waiting for servers to be ready"
$maxAttempts = 10
$attempt = 0

do {
    $attempt++
    $backendReady = $false
    $frontendReady = $false
    
    try {
        $backendTest = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($backendTest.StatusCode -eq 200) { $backendReady = $true }
    } catch { }
    
    try {
        $frontendTest = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($frontendTest) { $frontendReady = $true }
    } catch { }
    
    if ($backendReady -and $frontendReady) {
        Write-Success "Both servers are ready!"
        break
    }
    
    Write-Host "." -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 2
} while ($attempt -lt $maxAttempts)

if (-not ($backendReady -and $frontendReady)) {
    Write-Warning "Servers may not be fully ready, but proceeding with ngrok setup"
}

# Step 5: Start ngrok tunnels
Write-Step "Starting ngrok tunnels"
Write-Host "This will start ngrok in interactive mode..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C in the ngrok window to stop tunnels when testing is complete." -ForegroundColor Yellow

# Create the admin user before starting ngrok
Write-Step "Setting up admin user"
Push-Location $BackendDir
try {
    node scripts/create-admin-user.js
    Write-Success "Admin user setup complete"
} catch {
    Write-Warning "Admin user setup failed, but continuing..."
}
Pop-Location

# Start ngrok
Push-Location $ProjectDir
Start-Process -FilePath "ngrok" -ArgumentList "start", "--all", "--config=`"$NgrokConfig`"" -Wait
Pop-Location

Write-Host "🎉 External testing setup complete!" -ForegroundColor Green

# Cleanup jobs when script ends
Write-Step "Cleaning up background jobs"
Stop-Job -Name "BackendServer", "FrontendServer" -ErrorAction SilentlyContinue
Remove-Job -Name "BackendServer", "FrontendServer" -ErrorAction SilentlyContinue
