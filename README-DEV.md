# PharmaGo Hybrid Development Setup

This guide provides a comprehensive hybrid development approach that solves Windows Docker Desktop volume mounting issues while maintaining fast development cycles.

## 🎯 Overview

**Problem Solved:** Windows Docker Desktop volume mounting causes I/O errors and slow development cycles.

**Solution:** Run services (PostgreSQL, Redis) in Docker containers while running Django backend and React frontend locally for instant code reloading.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hybrid Development Setup                 │
├─────────────────────────────────────────────────────────────┤
│  Docker Containers (Services Only)                         │
│  ├── PostgreSQL (localhost:5432)                           │
│  ├── Redis (localhost:6379)                                │
│  └── pgAdmin (localhost:8082)                              │
├─────────────────────────────────────────────────────────────┤
│  Local Development (No Docker Volumes)                     │
│  ├── Django Backend (localhost:8000)                       │
│  ├── React Frontend (localhost:3000)                       │
│  └── Mobile App (connects to localhost:8000)               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** (for Django backend)
- **Node.js 16+** (for React frontend)
- **Docker Desktop** (for services only)
- **Git** (for version control)

### 1. Start Services Only

```bash
# Start PostgreSQL, Redis, and pgAdmin containers
docker-compose -f docker-compose.services.yml up -d

# Verify services are running
docker-compose -f docker-compose.services.yml ps
```

### 2. Setup Backend (Django)

```bash
# Run the backend setup script
chmod +x setup-dev.sh
./setup-dev.sh

# Or manually:
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Setup Frontend (React)

```bash
# Run the frontend setup script
chmod +x setup-web.sh
./setup-web.sh

# Or manually:
cd web-frontend
npm install
npm start
```

## 📁 File Structure

```
pharmago/
├── docker-compose.yml              # Original (for production)
├── docker-compose.services.yml     # Services only (for development)
├── setup-dev.sh                   # Backend setup script
├── setup-web.sh                   # Frontend setup script
├── README-DEV.md                  # This file
├── backend/
│   ├── .env                       # Backend environment config
│   ├── manage.py
│   ├── requirements.txt
│   └── pharmago/
└── web-frontend/
    ├── .env                       # Frontend environment config
    ├── package.json
    └── src/
```

## 🔧 Configuration Files

### Backend .env Configuration

```env
DEBUG=1
SECRET_KEY=@lkf@7pbimd7=c_#5ake7_wxhvjle4s6!5s%kj^017tk&-)e!-

# Database configuration for local development
DB_NAME=pharmago
DB_USER=superpharmago
DB_PASSWORD=pharmagoldenkey
DB_HOST=localhost
DB_PORT=5432

# CORS and security settings
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# AWS S3 settings (keep existing)
AWS_ACCESS_KEY_ID=AKIA5RA7TEOC2ZAU5MG2
AWS_SECRET_ACCESS_KEY=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
AWS_STORAGE_BUCKET_NAME=pharmago-user-uploads
AWS_S3_REGION_NAME=ap-southeast-2

# Redis configuration for local development
REDIS_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend .env Configuration

```env
# Google Maps API Key (keep existing)
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyANWzmzRztUKvOfJcg1SA5mA6GDl5ijjo4

# API configuration for local development
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_BACKEND_URL=http://localhost:8000

# Development settings
GENERATE_SOURCEMAP=true
CHOKIDAR_USEPOLLING=false
WATCHPACK_POLLING=false
```

## 🔄 Development Workflow

### Daily Development Process

```bash
# 1. Start services (run once per day)
docker-compose -f docker-compose.services.yml up -d

# 2. Start backend (Terminal 1)
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python manage.py runserver

# 3. Start frontend (Terminal 2)
cd web-frontend
npm start

# 4. Access applications
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# pgAdmin: http://localhost:8082
```

### Mobile App Development

The mobile app (`mobileapp/apps/customer-app/`) is already configured to connect to `http://localhost:8000/api/v1` for API calls. No changes needed.

## 🛠️ Common Commands

### Backend Commands

```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run Django server
python manage.py runserver

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Run tests
python manage.py test

# Django shell
python manage.py shell
```

### Frontend Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Install new package
npm install package-name

# Update dependencies
npm update
```

### Docker Commands

```bash
# Start services only
docker-compose -f docker-compose.services.yml up -d

# Stop services
docker-compose -f docker-compose.services.yml down

# View logs
docker-compose -f docker-compose.services.yml logs

# Restart services
docker-compose -f docker-compose.services.yml restart

# Remove all containers and volumes (clean slate)
docker-compose -f docker-compose.services.yml down -v
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `django.db.utils.OperationalError: could not connect to server`

**Solution:**
```bash
# Check if PostgreSQL container is running
docker-compose -f docker-compose.services.yml ps

# Start services if not running
docker-compose -f docker-compose.services.yml up -d

# Wait for health check to pass
docker-compose -f docker-compose.services.yml logs postgres
```

#### 2. Backend Not Accessible from Frontend

**Error:** `CORS error` or `Network Error`

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/api/v1/

# Check .env configuration
cat backend/.env | grep CORS_ALLOWED_ORIGINS

# Restart backend after .env changes
python manage.py runserver
```

#### 3. Frontend Hot Reload Not Working

**Error:** File changes not detected

**Solution:**
```bash
# Check .env configuration
cat web-frontend/.env | grep CHOKIDAR_USEPOLLING

# Should be: CHOKIDAR_USEPOLLING=false
# Restart frontend
npm start
```

#### 4. Mobile App Can't Connect

**Error:** `Network request failed`

**Solution:**
```bash
# Verify backend is accessible
curl http://localhost:8000/api/v1/users/register/

# Check mobile app API configuration
cat mobileapp/apps/customer-app/services/api.ts | grep API_BASE_URL

# Should be: const API_BASE_URL = 'http://localhost:8000/api/v1';
```

### Performance Issues

#### 1. Slow Database Queries

```bash
# Check database performance
docker-compose -f docker-compose.services.yml exec postgres psql -U superpharmago -d pharmago -c "SELECT * FROM pg_stat_activity;"

# Use pgAdmin for query analysis
# Access: http://localhost:8082
```

#### 2. Memory Usage

```bash
# Check container resource usage
docker stats

# Restart services if needed
docker-compose -f docker-compose.services.yml restart
```

## 🧪 Testing

### Backend Testing

```bash
cd backend
source venv/bin/activate
python manage.py test

# Run specific app tests
python manage.py test api.users
python manage.py test api.orders
```

### Frontend Testing

```bash
cd web-frontend
npm test

# Run tests in watch mode
npm test -- --watch
```

### Integration Testing

```bash
# Test user registration flow
curl -X POST http://localhost:8000/api/v1/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'

# Test frontend-backend connection
# Open http://localhost:3000 and check browser console
```

## 📊 Monitoring

### Database Monitoring

- **pgAdmin:** http://localhost:8082
  - Email: admin@local.dev
  - Password: admin123

### Application Logs

```bash
# Backend logs (Django)
tail -f backend/logs/django.log

# Docker service logs
docker-compose -f docker-compose.services.yml logs -f postgres
docker-compose -f docker-compose.services.yml logs -f redis
```

## 🚀 Production Deployment

For production deployment, use the original `docker-compose.yml`:

```bash
# Production deployment
docker-compose up -d

# This runs everything in containers with proper volume mounts
```

## 🔄 Migration from Docker Development

If you're currently using the full Docker setup and want to switch to hybrid:

1. **Stop current containers:**
   ```bash
   docker-compose down
   ```

2. **Start services only:**
   ```bash
   docker-compose -f docker-compose.services.yml up -d
   ```

3. **Setup local development:**
   ```bash
   ./setup-dev.sh
   ./setup-web.sh
   ```

4. **Update your IDE:**
   - Point to local Python interpreter in `backend/venv/bin/python`
   - Configure Node.js to use local installation

## 👥 Team Onboarding

### New Developer Setup

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd pharmago
   ```

2. **Run setup scripts:**
   ```bash
   chmod +x setup-dev.sh setup-web.sh
   ./setup-dev.sh
   ./setup-web.sh
   ```

3. **Start development:**
   ```bash
   # Terminal 1: Services
   docker-compose -f docker-compose.services.yml up -d
   
   # Terminal 2: Backend
   cd backend && source venv/bin/activate && python manage.py runserver
   
   # Terminal 3: Frontend
   cd web-frontend && npm start
   ```

## 📝 Benefits of Hybrid Approach

✅ **No Volume Mounting Issues:** Eliminates Windows Docker Desktop I/O errors  
✅ **Instant Code Reloading:** Django auto-reload and React hot reload work perfectly  
✅ **Fast Development Cycle:** No container rebuilds needed  
✅ **Direct Debugging:** IDE debugging works without container complexity  
✅ **Preserved Data:** Database data remains intact  
✅ **Production Ready:** Original Docker setup preserved for deployment  
✅ **Team Friendly:** Standard development workflow  

## 📚 Additional Documentation

- [Mobile App Database Access Patterns](docs/mobile_app_database_access_patterns.md) - Complete guide for mobile app development and database access patterns
- [Database Access Pattern Guide](docs/database_access_pattern_guide.md) - General database access patterns
- [Django Apps Architecture](docs/django_apps_architecture.md) - Django application architecture overview
- [Terminal Commands Guide](docs/terminal_commands_guide.md) - Useful terminal commands for development

## 🆘 Support

If you encounter issues:

1. Check this troubleshooting section
2. Verify all services are running: `docker-compose -f docker-compose.services.yml ps`
3. Check logs: `docker-compose -f docker-compose.services.yml logs`
4. Restart services: `docker-compose -f docker-compose.services.yml restart`
5. Clean slate: `docker-compose -f docker-compose.services.yml down -v && ./setup-dev.sh && ./setup-web.sh`

---

**Happy Coding! 🚀**
