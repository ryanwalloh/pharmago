# Terminal Commands Guide for PharmaGo Dockerized Project

## Overview

This document compiles all the working terminal commands for the PharmaGo project, specifically focusing on the Dockerized environment. It identifies which commands work and which don't, saving time for future development sessions.

## Table of Contents

1. [Working Commands](#working-commands)
2. [Failed Commands & Alternatives](#failed-commands--alternatives)
3. [Docker-Specific Commands](#docker-specific-commands)
4. [PowerShell vs Bash Differences](#powershell-vs-bash-differences)
5. [API Testing Commands](#api-testing-commands)
6. [Development Server Commands](#development-server-commands)
7. [Troubleshooting Commands](#troubleshooting-commands)

## Working Commands

### ✅ **Server Status Checking**

```powershell
# Check if backend server is running (port 8000)
netstat -an | findstr :8000

# Check if frontend server is running (port 3000)
netstat -an | findstr :3000

# Check if any Python processes are running
tasklist | findstr python
```

### ✅ **API Testing with PowerShell**

```powershell
# Test API endpoint (WORKING METHOD)
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET

# Get response content only
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET | Select-Object -ExpandProperty Content

# Test with JSON parsing
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
$response.Content | ConvertFrom-Json
```

### ✅ **Process Management**

```powershell
# Kill Python processes (when needed)
taskkill /F /IM python.exe

# Check running processes
netstat -an | findstr LISTENING
```

### ✅ **Directory Navigation**

```powershell
# Navigate to backend
cd backend

# Navigate to frontend
cd web-frontend

# Navigate to project root
cd C:\Users\Ryan\Desktop\pharmago
```

## Failed Commands & Alternatives

### ❌ **Failed: curl Commands**

```bash
# THESE DON'T WORK in PowerShell
curl -X GET "http://127.0.0.1:8000/api/pharmacy-stats/" -H "Content-Type: application/json"
curl -X GET "http://127.0.0.1:8000/api/pharmacies/pending-verification/"
```

**Alternative (WORKING):**
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
```

### ❌ **Failed: Bash-style Command Chaining**

```bash
# THESE DON'T WORK in PowerShell
cd backend && python manage.py shell
timeout 3 && Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
```

**Alternative (WORKING):**
```powershell
cd backend
python manage.py shell

# Or for delays:
Start-Sleep -Seconds 3; Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
```

### ❌ **Failed: Complex PowerShell JSON Operations**

```powershell
# THIS FAILED - Too complex for PowerShell
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET; $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Alternative (WORKING):**
```powershell
# Simple approach
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET | Select-Object -ExpandProperty Content
```

### ❌ **Failed: Django Shell Commands**

```bash
# THESE DON'T WORK - Virtual environment issues
python manage.py shell -c "from api.users.models import Pharmacy; print('Total pharmacies:', Pharmacy.objects.count())"
```

**Reason:** Virtual environment not activated or Django not installed in current environment.

## Docker-Specific Commands

### 🐳 **Docker Commands (If Using Docker)**

```bash
# Check if Docker is running
docker ps

# Check Docker containers
docker-compose ps

# Start the stack
docker-compose up -d

# Stop the stack
docker-compose down

# View logs
docker-compose logs backend
docker-compose logs frontend
```

### 🐳 **Docker Development Commands**

```bash
# Execute commands in running container
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py runserver

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh
```

## PowerShell vs Bash Differences

### **PowerShell (Windows) - CURRENT ENVIRONMENT**

```powershell
# Command chaining
Start-Sleep -Seconds 3; Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET

# Process management
taskkill /F /IM python.exe
tasklist | findstr python

# Network checking
netstat -an | findstr :8000

# Web requests
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
```

### **Bash (Linux/Mac) - NOT CURRENT ENVIRONMENT**

```bash
# Command chaining
sleep 3 && curl -X GET "http://127.0.0.1:8000/api/pharmacy-stats/"

# Process management
kill -9 $(pgrep python)
ps aux | grep python

# Network checking
netstat -an | grep :8000
lsof -i :8000

# Web requests
curl -X GET "http://127.0.0.1:8000/api/pharmacy-stats/"
```

## API Testing Commands

### **Working API Test Sequence**

```powershell
# 1. Check if server is running
netstat -an | findstr :8000

# 2. Test basic endpoint
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET

# 3. Get response content
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET | Select-Object -ExpandProperty Content

# 4. Test different endpoints
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pending-pharmacies/" -Method GET
```

### **API Response Analysis**

```powershell
# Get full response details
$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
$response.StatusCode
$response.Content
$response.Headers
```

## Development Server Commands

### **Starting Servers**

```powershell
# Start backend (Django)
cd backend
python manage.py runserver

# Start frontend (React)
cd web-frontend
npm start
```

### **Background Processes**

```powershell
# Start servers in background (PowerShell)
Start-Process -NoNewWindow python -ArgumentList "manage.py", "runserver"
Start-Process -NoNewWindow npm -ArgumentList "start"
```

## Troubleshooting Commands

### **Server Issues**

```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process by PID
taskkill /F /PID [PID_NUMBER]
```

### **Python Environment Issues**

```powershell
# Check Python version
python --version

# Check if Django is installed
python -c "import django; print(django.get_version())"

# Check virtual environment
python -c "import sys; print(sys.prefix)"
```

### **Node.js Environment Issues**

```powershell
# Check Node version
node --version

# Check npm version
npm --version

# Check if React is installed
npm list react
```

## Environment-Specific Notes

### **Current Environment Details**
- **OS**: Windows 10 (win32 10.0.19045)
- **Shell**: PowerShell
- **Backend**: Django (Python)
- **Frontend**: React (Node.js)
- **Containerization**: Docker (but servers running natively)

### **Working Ports**
- **Backend**: http://127.0.0.1:8000
- **Frontend**: http://localhost:3000

### **Working File Paths**
- **Project Root**: C:\Users\Ryan\Desktop\pharmago
- **Backend**: C:\Users\Ryan\Desktop\pharmago\backend
- **Frontend**: C:\Users\Ryan\Desktop\pharmago\web-frontend

## Quick Reference Commands

### **Daily Development Workflow**

```powershell
# 1. Check server status
netstat -an | findstr :8000
netstat -an | findstr :3000

# 2. Test API
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET | Select-Object -ExpandProperty Content

# 3. Start servers if needed
cd backend; python manage.py runserver
cd web-frontend; npm start
```

### **Debugging Workflow**

```powershell
# 1. Check processes
tasklist | findstr python
tasklist | findstr node

# 2. Check ports
netstat -an | findstr LISTENING

# 3. Test connectivity
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/pharmacy-stats/" -Method GET
```

## Best Practices

### **Command Selection**
1. **Always use PowerShell commands** in Windows environment
2. **Avoid bash-style chaining** (use `;` instead of `&&`)
3. **Use Invoke-WebRequest** instead of curl
4. **Check server status first** before testing APIs
5. **Use simple commands** rather than complex one-liners

### **Error Prevention**
1. **Check if servers are running** before API tests
2. **Verify port availability** before starting servers
3. **Use proper PowerShell syntax** for command chaining
4. **Test with simple commands first** before complex operations

### **Efficiency Tips**
1. **Keep servers running** during development sessions
2. **Use background processes** for long-running servers
3. **Test APIs frequently** during development
4. **Use consistent command patterns** for reliability

## Common Issues & Solutions

### **Issue: "curl is not recognized"**
**Solution**: Use `Invoke-WebRequest` instead

### **Issue: "Command not found"**
**Solution**: Check if you're in the correct directory and using PowerShell

### **Issue: "Connection refused"**
**Solution**: Check if servers are running with `netstat -an | findstr :8000`

### **Issue: "Virtual environment not activated"**
**Solution**: Either activate virtual environment or use Docker commands

### **Issue: "Port already in use"**
**Solution**: Kill existing processes with `taskkill /F /IM python.exe`

This guide should save significant time in future development sessions by providing the exact working commands for this specific environment.
