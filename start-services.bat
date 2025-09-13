@echo off
REM PharmaGo Services Startup Script (Windows)
REM Starts only Docker services: PostgreSQL, Redis, and pgAdmin

echo 🐳 Starting PharmaGo Docker Services...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [INFO] Starting Docker services...
docker-compose -f docker-compose.services.yml up -d

echo [INFO] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo [INFO] Service status:
docker-compose -f docker-compose.services.yml ps

echo.
echo [SUCCESS] Services started successfully!
echo.
echo [INFO] Service URLs:
echo   📊 pgAdmin:     http://localhost:8082
echo   🐘 PostgreSQL:  localhost:5433
echo   🔴 Redis:       localhost:6379
echo.
echo [INFO] Default pgAdmin credentials:
echo   Email: admin@local.dev
echo   Password: admin123
echo.

REM Open pgAdmin in browser
echo [INFO] Opening pgAdmin...
start http://localhost:8082

echo [INFO] Services are ready. You can now start Django and React manually.
pause
