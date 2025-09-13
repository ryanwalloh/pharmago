@echo off
REM PharmaGo Development Helper Script (Windows)
REM Quick access to common development tasks

:menu
cls
echo 🛠️  PharmaGo Development Helper
echo.
echo Select an option:
echo.
echo [1] Start Full Stack (Docker + Django + React + Expo)
echo [2] Start Services Only (Docker containers)
echo [3] Stop All Services
echo [4] Django Management Commands
echo [5] Database Operations
echo [6] Check Service Status
echo [7] View Logs
echo [8] Open Services in Browser
echo [9] Exit
echo.
set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto fullstack
if "%choice%"=="2" goto services
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto django
if "%choice%"=="5" goto database
if "%choice%"=="6" goto status
if "%choice%"=="7" goto logs
if "%choice%"=="8" goto browser
if "%choice%"=="9" goto exit
goto menu

:fullstack
echo Starting full stack...
call start-full-stack.bat
goto menu

:services
echo Starting services...
call start-services.bat
goto menu

:stop
echo Stopping services...
call stop-services.bat
goto menu

:django
cls
echo 🐍 Django Management Commands
echo.
echo [1] Run Migrations
echo [2] Create Superuser
echo [3] Collect Static Files
echo [4] Run Tests
echo [5] Django Shell
echo [6] Check System
echo [7] Back to Main Menu
echo.
set /p djchoice="Enter choice (1-7): "

if "%djchoice%"=="1" goto migrate
if "%djchoice%"=="2" goto superuser
if "%djchoice%"=="3" goto collectstatic
if "%djchoice%"=="4" goto test
if "%djchoice%"=="5" goto shell
if "%djchoice%"=="6" goto check
if "%djchoice%"=="7" goto menu

:migrate
echo Running migrations...
cd backend
venv\Scripts\activate.bat
python manage.py migrate
pause
goto django

:superuser
echo Creating superuser...
cd backend
venv\Scripts\activate.bat
python manage.py createsuperuser
pause
goto django

:collectstatic
echo Collecting static files...
cd backend
venv\Scripts\activate.bat
python manage.py collectstatic
pause
goto django

:test
echo Running tests...
cd backend
venv\Scripts\activate.bat
python manage.py test
pause
goto django

:shell
echo Opening Django shell...
cd backend
venv\Scripts\activate.bat
python manage.py shell
pause
goto django

:check
echo Checking Django system...
cd backend
venv\Scripts\activate.bat
python manage.py check
pause
goto django

:database
cls
echo 🗄️  Database Operations
echo.
echo [1] Connect to PostgreSQL
echo [2] Backup Database
echo [3] Restore Database
echo [4] Reset Database (WARNING: Deletes all data)
echo [5] Back to Main Menu
echo.
set /p dbchoice="Enter choice (1-5): "

if "%dbchoice%"=="1" goto connectdb
if "%dbchoice%"=="2" goto backupdb
if "%dbchoice%"=="3" goto restoredb
if "%dbchoice%"=="4" goto resetdb
if "%dbchoice%"=="5" goto menu

:connectdb
echo Connecting to PostgreSQL...
docker exec -it pharmago_postgres psql -U superpharmago -d pharmago
pause
goto database

:backupdb
echo Creating database backup...
docker exec pharmago_postgres pg_dump -U superpharmago pharmago > backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
echo Backup created: backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
pause
goto database

:restoredb
echo Restore database functionality would go here
pause
goto database

:resetdb
echo WARNING: This will delete all data in the database!
set /p confirm="Are you sure? (yes/no): "
if "%confirm%"=="yes" (
    echo Resetting database...
    docker-compose -f docker-compose.services.yml down -v
    docker-compose -f docker-compose.services.yml up -d
    cd backend
    venv\Scripts\activate.bat
    python manage.py migrate
    echo Database reset complete
)
pause
goto database

:status
cls
echo 📊 Service Status
echo.
echo Docker Services:
docker-compose -f docker-compose.services.yml ps
echo.
echo Port Status:
netstat -an | findstr ":5433 :6379 :8000 :3000 :8081 :8082"
echo.
pause
goto menu

:logs
cls
echo 📋 Service Logs
echo.
echo [1] PostgreSQL Logs
echo [2] Redis Logs
echo [3] pgAdmin Logs
echo [4] Back to Main Menu
echo.
set /p logchoice="Enter choice (1-4): "

if "%logchoice%"=="1" goto postgreslogs
if "%logchoice%"=="2" goto redislogs
if "%logchoice%"=="3" goto pgadminlogs
if "%logchoice%"=="4" goto menu

:postgreslogs
echo PostgreSQL logs (last 50 lines):
docker-compose -f docker-compose.services.yml logs --tail=50 postgres
pause
goto logs

:redislogs
echo Redis logs (last 50 lines):
docker-compose -f docker-compose.services.yml logs --tail=50 redis
pause
goto logs

:pgadminlogs
echo pgAdmin logs (last 50 lines):
docker-compose -f docker-compose.services.yml logs --tail=50 pgadmin
pause
goto logs

:browser
echo Opening services in browser...
start http://localhost:8082
timeout /t 1 /nobreak >nul
start http://localhost:8000
timeout /t 1 /nobreak >nul
start http://localhost:3000
timeout /t 1 /nobreak >nul
start http://localhost:8081
goto menu

:exit
echo Goodbye! 👋
exit /b 0
