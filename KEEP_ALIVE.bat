@echo off
chcp 65001 >nul
cd /d "%~dp0"
title BlueCat KeepAlive
echo Сервер Blue Cat — не закрывай это окно, если играешь локально.
echo В интернете сайт работает отдельно:
echo https://zdapteka22.github.io/my-games-portal/
echo.

:loop
rem if not listening, start
netstat -ano | findstr ":8765" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo [%date% %time%] старт serve_nocache.py
  start "BlueCatPortal" /MIN python serve_nocache.py
)
timeout /t 20 /nobreak >nul
goto loop
