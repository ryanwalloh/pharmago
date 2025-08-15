@echo off
setlocal enabledelayedexpansion

echo.
echo ================================
echo   STARTING FULL PHARMACY STACK
echo ================================
echo.

:: ==== CONFIG (edit only these 3 paths) ====
set BACKEND_PATH=C:\Users\Ryan\pharmago\backend
set FRONTEND_PATH=C:\Users\Ryan\pharmago\web-frontend
set MOBILE_PATH=C:\Users\Ryan\pharmago\mobileapp
:: ==========================================

:: 1. Auto-detect Virtual Environment Path
for /f "tokens=*" %%i in ('dir /b /s "%BACKEND_PATH%\venv\Scripts\activate.bat" 2^>nul') do (
    set VENV_PATH=%%i
    goto foundVenv
)
:foundVenv
if not defined VENV_PATH (
    echo [ERROR] Virtual environment not found inside %BACKEND_PATH%\venv\Scripts.
    pause
    exit /b
)

:: 2. Auto-detect Android SDK Path
if defined ANDROID_HOME (
    set SDK_PATH=%ANDROID_HOME%
) else if defined ANDROID_SDK_ROOT (
    set SDK_PATH=%ANDROID_SDK_ROOT%
) else (
    for /f "tokens=*" %%i in ('dir /b /s "%LOCALAPPDATA%\Android\Sdk" 2^>nul') do (
        set SDK_PATH=%%i
        goto foundSDK
    )
)
:foundSDK
if not defined SDK_PATH (
    echo [ERROR] Android SDK not found.
    pause
    exit /b
)

set PATH=%PATH%;%SDK_PATH%\platform-tools;%SDK_PATH%\emulator

:: 3. Auto-detect First Available Emulator
for /f "delims=" %%i in ('emulator -list-avds 2^>nul') do (
    set AVD_NAME=%%i
    goto foundAVD
)
:foundAVD
if not defined AVD_NAME (
    echo [ERROR] No AVDs found. Create one in Android Studio.
    pause
    exit /b
)

echo Using:
echo  VENV: %VENV_PATH%
echo  SDK : %SDK_PATH%
echo  AVD : %AVD_NAME%
echo.

:: 4. Free up required ports
echo [Cleaning] Closing processes on ports 8000, 3000, 8081...
for %%p in (8000 3000 8081) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /PID %%i /F >nul 2>&1
    )
)
timeout /t 2 >nul

:: 5. Start Django Backend
echo [1/5] Starting Django backend...
start "Django Backend" cmd /k "cd /d %BACKEND_PATH% && call %VENV_PATH% && python manage.py runserver"
timeout /t 5 >nul
echo.

:: 6. Start React Web Frontend
echo [2/5] Starting React web frontend...
start "React Web" cmd /k "cd /d %FRONTEND_PATH% && set BROWSER=chrome && npm start"
timeout /t 5 >nul
echo.

:: 7. Start Metro Bundler
echo [3/5] Starting Metro bundler...
taskkill /f /im node.exe >nul 2>&1
start "Metro Bundler" cmd /k "cd /d %MOBILE_PATH% && npx react-native start"
timeout /t 10 >nul
echo.

:: 8. Start Emulator (always launch)
echo [4/5] Starting Android emulator...
start "Android Emulator" cmd /k "emulator -avd %AVD_NAME%"
echo Waiting for emulator to boot...
timeout /t 45 >nul
echo.

:: 9. Run React Native Android App
echo [5/5] Running React Native Android app...
start "React Native Android" cmd /k "cd /d %MOBILE_PATH% && npx react-native run-android"

echo.
echo All services launched successfully!
echo.
pause
