@echo off
REM PharmaGo Full Stack Development Startup Script (Windows)
REM This script starts all services: Docker containers, Django backend, React frontend, and Expo mobile app

echo 🚀 Starting PharmaGo Full Stack Development Environment...
echo.

REM Check if Docker is running
echo [1/5] Checking Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [✓] Docker Desktop is running

REM Start Docker services
echo [2/5] Starting Docker services (PostgreSQL, Redis, pgAdmin)...
docker-compose -f docker-compose.services.yml up -d
if errorlevel 1 (
    echo [ERROR] Failed to start Docker services
    pause
    exit /b 1
)
echo [✓] Docker services started

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Check service status
echo [INFO] Checking service status...
docker-compose -f docker-compose.services.yml ps

echo.
echo [3/5] Starting Django Backend...
echo [INFO] Opening Django backend in new window...
start "PharmaGo Django Backend" cmd /k "cd /d %~dp0backend && echo [Django Backend] Activating virtual environment... && venv\Scripts\activate.bat && echo [Django Backend] Starting Django server... && python manage.py runserver && echo [Django Backend] Server stopped. Press any key to close... && pause"

echo.
echo [4/5] Starting React Frontend...
echo [INFO] Opening React frontend in new window...
start "PharmaGo React Frontend" cmd /k "cd /d %~dp0web-frontend && echo [React Frontend] Starting development server... && npm start && echo [React Frontend] Server stopped. Press any key to close... && pause"

echo.
echo [5/5] Starting Expo Mobile App...
echo [INFO] Opening Expo mobile app in new window...
start "PharmaGo Expo Mobile" cmd /k "cd /d %~dp0mobileapp && echo [Expo Mobile] Starting Expo development server... && npx expo start && echo [Expo Mobile] Server stopped. Press any key to close... && pause"

echo.
echo 🎉 [SUCCESS] Full Stack Development Environment Started!
echo.
echo [INFO] Service URLs:
echo   📊 pgAdmin:     http://localhost:8082
echo   🐘 PostgreSQL:  localhost:5433
echo   🔴 Redis:       localhost:6379
echo   🐍 Django API:  http://localhost:8000
echo   ⚛️  React App:   http://localhost:3000
echo   📱 Expo Mobile: http://localhost:8081
echo.
echo [INFO] Default Credentials:
echo   pgAdmin - Email: admin@local.dev, Password: admin123
echo   Django Admin - Create superuser with: python manage.py createsuperuser
echo.
echo [INFO] Development Tips:
echo   - Django backend will auto-reload on code changes
echo   - React frontend will hot-reload on code changes
echo   - Expo mobile app supports live reloading
echo   - All services are running in separate windows for easy monitoring
echo.

REM Open key services in browser
echo [INFO] Opening key services in browser...
timeout /t 5 /nobreak >nul
start http://localhost:8082
timeout /t 2 /nobreak >nul
start http://localhost:8000
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo [INFO] All services are starting up. Check the individual windows for status.
echo [INFO] Press any key to close this startup window...
pause >nul
