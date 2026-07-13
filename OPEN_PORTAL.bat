@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Blue Cat — сайт БЕЗ Grok
echo ========================================
echo.
echo ОТКРЫВАЮ ИНТЕРНЕТ-САЙТ (главный):
echo https://zdapteka22.github.io/my-games-portal/
echo.

REM Always open permanent internet site first
start "" "https://zdapteka22.github.io/my-games-portal/"

REM Start local server as backup (offline on this PC)
if exist "%~dp0START_SERVER_SILENT.vbs" (
  wscript "%~dp0START_SERVER_SILENT.vbs"
) else (
  netstat -ano | findstr ":8765" | findstr "LISTENING" >nul
  if errorlevel 1 (
    where python >nul 2>&1
    if not errorlevel 1 start "BlueCatPortal" /MIN python serve_nocache.py
  )
)

timeout /t 2 /nobreak >nul
REM Also open CDN mirror tab as backup if pages 404
start "" "https://cdn.jsdelivr.net/gh/zdapteka22/my-games-portal@main/index.html"

echo Готово. Если GitHub Pages 404 — используй вкладку CDN.
echo Grok выключать можно — сайт в интернете останется.
timeout /t 4 >nul
