@echo off
REM External Testing Setup Script for The Grassroots Hub
REM This script automates the complete setup for external testing via ngrok

echo 🚀 Starting External Testing Setup for The Grassroots Hub...

REM Configuration
set PROJECT_DIR=C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4
set BACKEND_DIR=%PROJECT_DIR%\backend

REM Step 1: Clean up existing processes
echo === Cleaning up existing processes ===
echo Stopping ngrok processes...
taskkill /f /im ngrok.exe >nul 2>&1
timeout /t 2 /nobreak >nul
taskkill /f /im ngrok.exe >nul 2>&1
echo Stopping node processes...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Cleaned up existing processes

REM Step 2: Start backend server
echo === Starting backend server ===
cd /d "%BACKEND_DIR%"
start /B cmd /c "npm start"
timeout /t 5 >nul
echo ✅ Backend server starting on port 3001

REM Step 3: Start frontend server  
echo === Starting frontend server ===
cd /d "%PROJECT_DIR%"
start /B cmd /c "npm run dev"
timeout /t 5 >nul
echo ✅ Frontend server starting on port 5173

REM Step 4: Wait for servers to be ready
echo === Waiting for servers to be ready ===
timeout /t 10 >nul

REM Step 5: Start ngrok tunnels
echo === Starting ngrok tunnels ===
ngrok start --all --config="%PROJECT_DIR%\ngrok.yml"

echo 🎉 External testing setup complete!
