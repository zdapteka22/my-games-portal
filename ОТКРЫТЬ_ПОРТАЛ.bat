@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Stopping old server on 8765...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8765 ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>&1
)

echo Starting Портал любимых игр · Blue Cat ...
start "BlueCatPortal" /MIN python serve_nocache.py
timeout /t 2 /nobreak >nul

set TS=%RANDOM%%RANDOM%
start "" "http://127.0.0.1:8765/index.html?v=%TS%"
echo Opened http://127.0.0.1:8765/index.html?v=%TS%
echo Close the minimized python window to stop the server.
