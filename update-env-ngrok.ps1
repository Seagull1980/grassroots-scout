# Update .env with current ngrok URLs
# Fetches the ngrok URLs from the API and updates .env file

Write-Host "🔄 Updating .env with ngrok URLs..." -ForegroundColor Cyan
Write-Host ""

try {
    # Fetch ngrok tunnels from the API
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop
    
    $backendUrl = $null
    $frontendUrl = $null
    
    # Find backend and frontend tunnels
    foreach ($tunnel in $response.tunnels) {
        if ($tunnel.name -eq "backend") {
            $backendUrl = $tunnel.public_url
        }
        if ($tunnel.name -eq "frontend") {
            $frontendUrl = $tunnel.public_url
        }
    }
    
    if (-not $backendUrl) {
        Write-Host "❌ Backend tunnel not found! Make sure ngrok is running." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Found ngrok URLs:" -ForegroundColor Green
    Write-Host "   Backend:  $backendUrl" -ForegroundColor White
    Write-Host "   Frontend: $frontendUrl" -ForegroundColor White
    Write-Host ""
    
    # Read current .env file
    $envPath = Join-Path $PSScriptRoot ".env"
    $envContent = Get-Content $envPath -Raw
    
    # Update or add VITE_API_URL
    $apiUrl = "$backendUrl/api"
    if ($envContent -match "(?m)^#?\s*VITE_API_URL=.*$") {
        $envContent = $envContent -replace "(?m)^#?\s*VITE_API_URL=.*$", "VITE_API_URL=$apiUrl"
    } else {
        $envContent += "`nVITE_API_URL=$apiUrl`n"
    }
    
    # Update or add VITE_ROSTER_API_URL (same backend for now)
    if ($envContent -match "(?m)^#?\s*VITE_ROSTER_API_URL=.*$") {
        $envContent = $envContent -replace "(?m)^#?\s*VITE_ROSTER_API_URL=.*$", "VITE_ROSTER_API_URL=$apiUrl"
    } else {
        $envContent += "VITE_ROSTER_API_URL=$apiUrl`n"
    }
    
    # Save updated .env file
    Set-Content -Path $envPath -Value $envContent -NoNewline
    
    Write-Host "✅ Updated .env file successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You need to restart the Vite dev server for changes to take effect!" -ForegroundColor Yellow
    Write-Host "   1. Stop the current dev server (Ctrl+C in the terminal)" -ForegroundColor Cyan
    Write-Host "   2. Restart it using the 'Start Development Server' task" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: Could not fetch ngrok tunnels" -ForegroundColor Red
    Write-Host "   Make sure ngrok is running and accessible at http://127.0.0.1:4040" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Gray
    exit 1
}
