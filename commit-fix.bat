@echo off
cd /d "C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Scout (v4)"
git add backend/db/database.js backend/server.js
git commit -m "Fix database close hook and add beta access endpoints"
git push origin main
pause
