# Restart Ngrok Tunnels
# Safely stops existing ngrok processes and starts fresh tunnels

Write-Host "🔄 Restarting ngrok tunnels..." -ForegroundColor Cyan

# Stop any existing ngrok processes
Write-Host "Stopping existing ngrok processes..." -ForegroundColor Yellow
$ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Stopped $($ngrokProcesses.Count) ngrok process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "ℹ️  No existing ngrok processes found" -ForegroundColor Gray
}

# Verify cleanup
$remaining = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "⚠️  Some ngrok processes are still running, forcing cleanup..." -ForegroundColor Yellow
    taskkill /f /im ngrok.exe 2>$null | Out-Null
    Start-Sleep -Seconds 1
}

# Start ngrok with config
Write-Host "Starting ngrok tunnels..." -ForegroundColor Yellow
$ngrokConfig = Join-Path $PSScriptRoot "ngrok.yml"

if (Test-Path $ngrokConfig) {
    Start-Process -FilePath "ngrok" -ArgumentList "start", "--all", "--config", $ngrokConfig -NoNewWindow
    Start-Sleep -Seconds 3
    
    Write-Host "✅ Ngrok tunnels started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 View your tunnel URLs at: http://127.0.0.1:4040" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ Error: ngrok.yml not found at $ngrokConfig" -ForegroundColor Red
}
