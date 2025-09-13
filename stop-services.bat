@echo off
REM PharmaGo Services Shutdown Script (Windows)
REM Stops all Docker services and cleans up

echo 🛑 Stopping PharmaGo Services...

echo [INFO] Stopping Docker services...
docker-compose -f docker-compose.services.yml down

echo [INFO] Cleaning up any orphaned containers...
docker-compose -f docker-compose.services.yml down --remove-orphans

echo [INFO] Service status:
docker-compose -f docker-compose.services.yml ps

echo.
echo [SUCCESS] All services stopped successfully!
echo.
echo [INFO] To start services again, run: start-services.bat
echo [INFO] To start full stack, run: start-full-stack.bat
echo.
pause
