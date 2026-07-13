@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PAGE=%~dp0index.html"

if exist "%LocalAppData%\Yandex\YandexBrowser\Application\browser.exe" (
  start "" "%LocalAppData%\Yandex\YandexBrowser\Application\browser.exe" "%PAGE%"
  exit /b 0
)
if exist "%ProgramFiles%\Yandex\YandexBrowser\Application\browser.exe" (
  start "" "%ProgramFiles%\Yandex\YandexBrowser\Application\browser.exe" "%PAGE%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Yandex\YandexBrowser\Application\browser.exe" (
  start "" "%ProgramFiles(x86)%\Yandex\YandexBrowser\Application\browser.exe" "%PAGE%"
  exit /b 0
)

start "" "%PAGE%"