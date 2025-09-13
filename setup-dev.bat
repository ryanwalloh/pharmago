@echo off
REM PharmaGo Backend Development Setup Script (Windows)
REM This script sets up the Django backend for local development

setlocal enabledelayedexpansion

echo 🚀 Setting up PharmaGo Backend for Local Development...

REM Check if we're in the right directory
if not exist "backend\manage.py" (
    echo [ERROR] Please run this script from the pharmago project root directory
    pause
    exit /b 1
)

REM Navigate to backend directory
cd backend

echo [INFO] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python is not installed. Please install Python 3.8+ and try again.
        echo Download from: https://python.org/downloads/
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo [SUCCESS] Python found:
%PYTHON_CMD% --version

REM Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    %PYTHON_CMD% -m venv venv
    echo [SUCCESS] Virtual environment created
) else (
    echo [SUCCESS] Virtual environment already exists
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo [INFO] Installing Python dependencies...
pip install -r requirements.txt
echo [SUCCESS] Dependencies installed successfully

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating with default configuration...
    (
        echo DEBUG=1
        echo SECRET_KEY=@lkf@7pbimd7=c_#5ake7_wxhvjle4s6!5s%%kj^017tk&-)e!-
        echo.
        echo # Database configuration for local development
        echo DB_NAME=pharmago
        echo DB_USER=superpharmago
        echo DB_PASSWORD=pharmagoldenkey
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo.
        echo # CORS and security settings
        echo ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
        echo CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
        echo CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
        echo.
        echo # AWS S3 settings
        echo AWS_ACCESS_KEY_ID=AKIA5RA7TEOC2ZAU5MG2
        echo AWS_SECRET_ACCESS_KEY=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
        echo AWS_STORAGE_BUCKET_NAME=pharmago-user-uploads
        echo AWS_S3_REGION_NAME=ap-southeast-2
        echo.
        echo # Redis configuration for local development
        echo REDIS_URL=redis://localhost:6379/1
        echo CELERY_BROKER_URL=redis://localhost:6379/0
        echo CELERY_RESULT_BACKEND=redis://localhost:6379/0
    ) > .env
    echo [SUCCESS] .env file created with default configuration
) else (
    echo [SUCCESS] .env file already exists
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Check database connection
echo [INFO] Checking database connection...
python manage.py check --database default >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Cannot connect to database. Make sure Docker services are running:
    echo [INFO] Run: docker-compose -f docker-compose.services.yml up -d
) else (
    echo [SUCCESS] Database connection successful
    echo [INFO] Running database migrations...
    python manage.py migrate
    echo [SUCCESS] Database migrations completed
)

REM Collect static files
echo [INFO] Collecting static files...
python manage.py collectstatic --noinput
echo [SUCCESS] Static files collected

echo.
echo [SUCCESS] Backend setup completed successfully!
echo.
echo [INFO] Next steps:
echo 1. Start Docker services: docker-compose -f docker-compose.services.yml up -d
echo 2. Run Django server: python manage.py runserver
echo 3. Access admin at: http://localhost:8000/admin/
echo.
echo [INFO] To activate virtual environment in future sessions:
echo   venv\Scripts\activate.bat

pause
