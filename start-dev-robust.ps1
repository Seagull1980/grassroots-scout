# Robust Development Server Startup Script
# This script starts all servers and monitors their status

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  The Grassroots Hub - Dev Environment  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing node processes to avoid port conflicts
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start all servers
$jobs = @()

Write-Host ""
Write-Host "Starting backend services..." -ForegroundColor Cyan

# Main backend server
Write-Host "Starting Main Backend on port 3000..." -ForegroundColor Green
$job1 = Start-Job -ScriptBlock {
    Set-Location "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)\backend"
    node server.js
}
$jobs += @{ Name = "Main Backend"; Port = "3000"; Job = $job1 }

Start-Sleep -Seconds 2

# Team Roster Server
Write-Host "Starting Team Roster on port 3001..." -ForegroundColor Green
$job2 = Start-Job -ScriptBlock {
    Set-Location "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)\backend"
    node team-roster-server.js
}
$jobs += @{ Name = "Team Roster"; Port = "3001"; Job = $job2 }

Start-Sleep -Seconds 1

# Playing History Server
Write-Host "Starting Playing History on port 3002..." -ForegroundColor Green
$job3 = Start-Job -ScriptBlock {
    Set-Location "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)\backend"
    node playing-history-server.js
}
$jobs += @{ Name = "Playing History"; Port = "3002"; Job = $job3 }

Start-Sleep -Seconds 1

# Forum Server
Write-Host "Starting Forum on port 3003..." -ForegroundColor Green
$job4 = Start-Job -ScriptBlock {
    Set-Location "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)\backend"
    node forum-server.js
}
$jobs += @{ Name = "Forum"; Port = "3003"; Job = $job4 }

Write-Host ""
Write-Host "Waiting for backend servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Vite dev server
Write-Host ""
Write-Host "Starting Vite development server..." -ForegroundColor Cyan
$job5 = Start-Job -ScriptBlock {
    Set-Location "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)"
    npm run dev
}
$jobs += @{ Name = "Vite"; Port = "5173"; Job = $job5 }

Write-Host ""
Write-Host "Waiting for Vite to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check server status
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Server Status Check                   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allRunning = $true

foreach ($server in $jobs) {
    $port = $server.Port
    $name = $server.Name
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "✓ $name (port $port): " -NoNewline -ForegroundColor Green
        Write-Host "RUNNING" -ForegroundColor Green
    } catch {
        Write-Host "✗ $name (port $port): " -NoNewline -ForegroundColor Red
        Write-Host "NOT RESPONDING" -ForegroundColor Red
        $allRunning = $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allRunning) {
    Write-Host "✓ All servers are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Frontend: " -NoNewline
    Write-Host "http://localhost:5173" -ForegroundColor Yellow
    Write-Host "Backend:  " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Yellow
} else {
    Write-Host "⚠ Some servers failed to start. Check the output above." -ForegroundColor Red
    Write-Host "Try running this script again or check for port conflicts." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Gray
Write-Host ""

# Keep script running and monitor jobs
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if any jobs have failed
        foreach ($server in $jobs) {
            if ($server.Job.State -eq "Failed" -or $server.Job.State -eq "Stopped") {
                Write-Host "⚠ $($server.Name) has stopped!" -ForegroundColor Red
            }
        }
    }
} catch {
    # Handle Ctrl+C
} finally {
    Write-Host ""
    Write-Host "Stopping all servers..." -ForegroundColor Yellow
    foreach ($server in $jobs) {
        Stop-Job -Job $server.Job -ErrorAction SilentlyContinue
        Remove-Job -Job $server.Job -ErrorAction SilentlyContinue
    }
    Write-Host "All servers stopped." -ForegroundColor Green
}
