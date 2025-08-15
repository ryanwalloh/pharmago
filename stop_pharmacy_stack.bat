@echo off
echo ================================
echo   STOPPING FULL PHARMACY STACK
echo ================================
echo.

:: Kill by window titles
for %%t in (
    "Django Backend"
    "React Web"
    "Metro Bundler"
    "React Native Android"
    "Android Emulator"
) do (
    taskkill /FI "WINDOWTITLE eq %%~t*" /T /F >nul 2>&1
)

:: Also kill ports just in case
for %%p in (8000 3000 8081) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /PID %%i /F >nul 2>&1
    )
)

echo All pharmacy stack processes stopped!
pause
