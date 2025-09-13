@echo off
REM PharmaGo Frontend Development Setup Script (Windows)
REM This script sets up the React frontend for local development

setlocal enabledelayedexpansion

echo 🚀 Setting up PharmaGo Frontend for Local Development...

REM Check if we're in the right directory
if not exist "web-frontend\package.json" (
    echo [ERROR] Please run this script from the pharmago project root directory
    pause
    exit /b 1
)

REM Navigate to web-frontend directory
cd web-frontend

echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16+ and try again.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [SUCCESS] Node.js found:
node --version

echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    pause
    exit /b 1
)

echo [SUCCESS] npm found:
npm --version

REM Check if node_modules exists
if exist "node_modules" (
    echo [WARNING] node_modules directory already exists
    set /p reinstall="Do you want to reinstall dependencies? (y/n): "
    if /i "!reinstall!"=="y" (
        echo [INFO] Removing existing node_modules...
        rmdir /s /q node_modules
        del package-lock.json 2>nul
    ) else (
        echo [INFO] Skipping dependency installation
    )
)

REM Install dependencies
if not exist "node_modules" (
    echo [INFO] Installing Node.js dependencies...
    npm install
    echo [SUCCESS] Dependencies installed successfully
) else (
    echo [SUCCESS] Dependencies already installed
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating with default configuration...
    (
        echo # Google Maps API Key
        echo REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyANWzmzRztUKvOfJcg1SA5mA6GDl5ijjo4
        echo.
        echo # API configuration for local development
        echo REACT_APP_API_URL=http://localhost:8000/api/v1
        echo REACT_APP_BACKEND_URL=http://localhost:8000
        echo.
        echo # Development settings
        echo GENERATE_SOURCEMAP=true
        echo CHOKIDAR_USEPOLLING=false
        echo WATCHPACK_POLLING=false
    ) > .env
    echo [SUCCESS] .env file created with default configuration
) else (
    echo [SUCCESS] .env file already exists
)

REM Check if backend is running
echo [INFO] Checking if backend is accessible...
curl -s http://localhost:8000/api/v1/ >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Backend is not accessible at http://localhost:8000
    echo [INFO] Make sure to start the Django backend:
    echo   1. cd backend
    echo   2. venv\Scripts\activate.bat
    echo   3. python manage.py runserver
) else (
    echo [SUCCESS] Backend is running and accessible
)

echo.
echo [SUCCESS] Frontend setup completed successfully!
echo.
echo [INFO] Next steps:
echo 1. Start the React development server: npm start
echo 2. Open browser to: http://localhost:3000
echo 3. Make sure backend is running on: http://localhost:8000
echo.
echo [INFO] Development commands:
echo   npm start          - Start development server
echo   npm run build      - Build for production
echo   npm test           - Run tests
echo   npm run eject      - Eject from Create React App (not recommended)

pause
