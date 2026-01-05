@echo off
echo ================================
echo  Ngrok Setup Instructions
echo ================================
echo.
echo 1. Go to https://ngrok.com and sign up
echo 2. Copy your authtoken from the dashboard
echo 3. Run: ngrok config add-authtoken YOUR_TOKEN
echo 4. Run: ngrok http 5173
echo.
echo ================================
echo  Quick Commands
echo ================================
echo.
echo After authentication, run these commands:
echo.
echo Frontend Tunnel:
echo   ngrok http 5173
echo.
echo Backend Tunnel (in another terminal):
echo   ngrok http 3001
echo.
echo ================================
echo  Current Server Status
echo ================================
echo.
echo Frontend: http://localhost:5173/
echo Network:  http://192.168.0.44:5173/
echo Backend:  http://localhost:3001/ (needs restart)
echo.
echo Login Credentials:
echo Email:    cgill1980@hotmail.com
echo Password: admin123
echo.
pause
