@echo off
REM PharmaGo Hybrid Development Quick Start Script (Windows)
REM This script starts all services for hybrid development

echo 🚀 Starting PharmaGo Hybrid Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [INFO] Starting Docker services (PostgreSQL, Redis, pgAdmin)...
docker-compose -f docker-compose.services.yml up -d

echo [INFO] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo [INFO] Checking service status...
docker-compose -f docker-compose.services.yml ps

echo.
echo [SUCCESS] Services started successfully!
echo.
echo [INFO] Service URLs:
echo   PostgreSQL: localhost:5432
echo   Redis: localhost:6379
echo   pgAdmin: http://localhost:8082
echo.
echo [INFO] Next steps:
echo 1. Start backend: cd backend ^&^& venv\Scripts\activate.bat ^&^& python manage.py runserver
echo 2. Start frontend: cd web-frontend ^&^& npm start
echo.
echo [INFO] Or run the setup scripts if this is your first time:
echo   setup-dev.bat (for backend setup)
echo   setup-web.bat (for frontend setup)
echo.

REM Open pgAdmin in browser
echo [INFO] Opening pgAdmin in browser...
start http://localhost:8082

echo [INFO] Press any key to continue...
pause >nul
