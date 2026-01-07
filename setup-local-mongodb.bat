@echo off
echo ========================================
echo   MongoDB Local Setup Script
echo ========================================
echo.

echo Checking if MongoDB is installed...
where mongod >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo MongoDB not found!
    echo.
    echo Please install MongoDB from:
    echo https://www.mongodb.com/try/download/community
    echo.
    echo Or use Chocolatey:
    echo choco install mongodb
    pause
    exit /b 1
)

echo MongoDB found!
echo.

echo Creating data directory...
if not exist "C:\data\db" mkdir "C:\data\db"

echo Starting MongoDB...
echo.
echo MongoDB will start on: mongodb://localhost:27017
echo Database name: sportsplatform
echo.

start "MongoDB Server" mongod --dbpath C:\data\db

echo.
echo ========================================
echo   MongoDB started successfully!
echo ========================================
echo.
echo Now update your .env file:
echo MONGODB_URI=mongodb://localhost:27017/sportsplatform
echo.
echo Then run: npm run dev
echo.
pause

