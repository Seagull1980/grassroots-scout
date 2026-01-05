@echo off
echo ========================================
echo   Stopping All Development Servers
echo ========================================
echo.

echo Closing server windows...
taskkill /FI "WINDOWTITLE eq Main Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Team Roster*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Playing History*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Forum*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Vite Dev Server*" /F >nul 2>&1

echo Killing all node processes...
taskkill /F /IM node.exe >nul 2>&1

timeout /t 1 >nul

echo.
echo ========================================
echo   All servers stopped!
echo ========================================
echo.
pause
