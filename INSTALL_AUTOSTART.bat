@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Автозапуск сервера Blue Cat
echo  Сайт на этом ПК будет подниматься
echo  сам при включении Windows
echo ========================================
echo.

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LINK=%STARTUP%\BlueCatPortal.lnk"
set "VBS=%~dp0START_SERVER_SILENT.vbs"

if not exist "%VBS%" (
  echo Не найден START_SERVER_SILENT.vbs
  pause
  exit /b 1
)

powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%LINK%');" ^
  "$s.TargetPath='wscript.exe';" ^
  "$s.Arguments='\"%VBS%\"';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.WindowStyle=7;" ^
  "$s.Description='Blue Cat portal local server';" ^
  "$s.Save()"

echo Готово: ярлык в автозагрузке
echo %LINK%
echo.
echo Также запускаю сервер сейчас...
wscript "%VBS%"
timeout /t 2 /nobreak >nul

start "" "https://zdapteka22.github.io/my-games-portal/"
echo.
echo ВАЖНО:
echo - В интернете сайт работает ВСЕГДА по ссылке GitHub Pages
echo   https://zdapteka22.github.io/my-games-portal/
echo - Локальный 127.0.0.1 нужен только если открываешь с этого ПК
echo   без интернета. Теперь он стартует вместе с Windows.
echo.
pause
