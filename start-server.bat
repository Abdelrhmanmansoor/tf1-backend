@echo off
echo ================================================
echo    Starting Backend Server
echo    تشغيل السيرفر
echo ================================================
echo.

cd /d "%~dp0"

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo خطأ: Node.js غير مثبت!
    pause
    exit /b 1
)

echo Node.js: OK
echo.

echo Starting server...
echo جاري تشغيل السيرفر...
echo.

npm run dev

pause
