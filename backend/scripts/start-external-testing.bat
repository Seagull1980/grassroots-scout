@echo off
echo 🌐 THE GRASSROOTS HUB - EXTERNAL TESTING SETUP
echo ==================================================

echo.
echo 🔍 Checking if LocalTunnel is available...
npx localtunnel --help >nul 2>&1
if errorlevel 1 (
    echo ❌ LocalTunnel not found. Installing...
    npm install -g localtunnel
    if errorlevel 1 (
        echo ❌ Failed to install LocalTunnel. Please install manually.
        pause
        exit /b 1
    )
)

echo ✅ LocalTunnel is ready!
echo.
echo 🚀 Starting external testing tunnels...
echo ⚠️  This will create public URLs for your application
echo.

echo 🔧 Starting backend tunnel (port 5000)...
start "Backend Tunnel" cmd /k "npx localtunnel --port 5000 --subdomain grassroots-api-test && pause"

echo 📱 Starting frontend tunnel (port 5173)...
start "Frontend Tunnel" cmd /k "npx localtunnel --port 5173 --subdomain grassroots-hub-test && pause"

echo.
echo 🎉 Tunnels are starting in separate windows!
echo.
echo 📱 Your application should be accessible at:
echo Frontend: https://grassroots-hub-test.loca.lt
echo Backend:  https://grassroots-api-test.loca.lt
echo.
echo 📋 Test Accounts:
echo Admin: admin@grassrootshub.com / admin123
echo Coach: coach.wilson@email.com / password123
echo Player: player.martinez@email.com / password123
echo Parent: parent.taylor@email.com / password123
echo.
echo 🛑 To stop: Close the tunnel windows
echo.
pause
