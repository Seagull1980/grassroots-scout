@echo off
echo 🌐 Starting ngrok tunnels for external access...
echo.

REM Check if ngrok is installed
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ngrok is not installed or not in PATH
    echo 💡 Install from: https://ngrok.com/download
    pause
    exit /b 1
)

echo 🔧 Starting backend tunnel (port 3001)...
start "Ngrok Backend" cmd /k "ngrok http 3001 --region=us"

timeout /t 3 /nobreak >nul

echo 🎨 Starting frontend tunnel (port 5173)...
start "Ngrok Frontend" cmd /k "ngrok http 5173 --region=us"

echo.
echo ⏳ Waiting for tunnels to establish...
timeout /t 5 /nobreak >nul

echo.
echo ✅ Ngrok tunnels are starting!
echo 📊 Visit ngrok dashboard: http://localhost:4040
echo.
echo 🔧 Next steps:
echo    1. Check the ngrok dashboard for tunnel URLs
echo    2. Run the PowerShell setup script: .\scripts\setup-external-access.ps1
echo    3. Share the frontend URL for external testing
echo.
echo 🛑 To stop tunnels, close the ngrok command windows
echo.
pause
