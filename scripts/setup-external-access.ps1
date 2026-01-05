# PowerShell script to set up external ngrok access quickly
Write-Host "🌐 Setting up external ngrok access..." -ForegroundColor Cyan

# Function to get current ngrok tunnels
function Get-NgrokTunnels {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -Method Get
        return $response.tunnels
    } catch {
        Write-Host "❌ Unable to connect to ngrok. Make sure ngrok is running." -ForegroundColor Red
        return $null
    }
}

# Function to update frontend API configuration
function Update-FrontendConfig($backendUrl) {
    $apiFile = "c:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4\src\services\api.ts"
    
    try {
        $content = Get-Content $apiFile -Raw
        $newContent = $content -replace "const API_URL = '[^']+';", "const API_URL = '$backendUrl/api';"
        Set-Content $apiFile $newContent
        Write-Host "✅ Frontend API configuration updated" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update frontend config: $_" -ForegroundColor Red
    }
}

# Main execution
Write-Host "`n1. Checking for existing ngrok tunnels..." -ForegroundColor Yellow

$tunnels = Get-NgrokTunnels

if ($tunnels -and $tunnels.Count -gt 0) {
    Write-Host "✅ Found existing ngrok tunnels:" -ForegroundColor Green
    
    $frontendUrl = $null
    $backendUrl = $null
    
    foreach ($tunnel in $tunnels) {
        $addr = $tunnel.config.addr
        $publicUrl = $tunnel.public_url
        
        if ($addr -eq "http://localhost:5173") {
            $frontendUrl = $publicUrl
            Write-Host "   Frontend: $publicUrl" -ForegroundColor Cyan
        } elseif ($addr -eq "http://localhost:3001") {
            $backendUrl = $publicUrl
            Write-Host "   Backend: $publicUrl" -ForegroundColor Cyan
        }
    }
    
    if ($backendUrl) {
        Write-Host "`n2. Updating frontend configuration..." -ForegroundColor Yellow
        Update-FrontendConfig $backendUrl
    } else {
        Write-Host "`n❌ No backend tunnel found. Make sure to run: ngrok http 3001" -ForegroundColor Red
    }
    
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "🎉 EXTERNAL ACCESS READY!" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Green
    
    if ($frontendUrl) {
        Write-Host "`n🌐 Share this URL for external testing:" -ForegroundColor Cyan
        Write-Host "   $frontendUrl" -ForegroundColor White
    }
    
    Write-Host "`n📋 Test Credentials:" -ForegroundColor Yellow
    Write-Host "   Email: coach@test.com" -ForegroundColor White
    Write-Host "   Password: test123" -ForegroundColor White
    
    Write-Host "`n⚠️  Important Notes:" -ForegroundColor Yellow
    Write-Host "   • Frontend automatically configured to use ngrok backend" -ForegroundColor White
    Write-Host "   • You may need to restart the frontend (npm run dev)" -ForegroundColor White
    Write-Host "   • Ngrok URLs change when restarted" -ForegroundColor White
    
} else {
    Write-Host "`n❌ No ngrok tunnels found!" -ForegroundColor Red
    Write-Host "`n🔧 To set up ngrok tunnels:" -ForegroundColor Yellow
    Write-Host "   1. Open two separate terminals" -ForegroundColor White
    Write-Host "   2. In terminal 1: ngrok http 5173  (frontend)" -ForegroundColor White
    Write-Host "   3. In terminal 2: ngrok http 3001  (backend)" -ForegroundColor White
    Write-Host "   4. Run this script again" -ForegroundColor White
}

Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
