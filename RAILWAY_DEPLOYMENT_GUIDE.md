# Railway Deployment Guide - PharmaGo

This guide covers deploying the PharmaGo platform to Railway for initial hosted testing.

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Deployment Steps](#deployment-steps)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Setup](#post-deployment-setup)
7. [Troubleshooting](#troubleshooting)

---

## Overview

PharmaGo consists of three main components:
- **Backend (Django)**: REST API with WebSocket support
- **Web Frontend (React)**: Pharmacy dashboard
- **Mobile App (Expo)**: Customer and rider apps (deployed separately via Expo EAS)

For Railway deployment, we'll deploy:
1. Backend service (with PostgreSQL and Redis plugins)
2. Web Frontend service

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Railway Project                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Backend    │  │ Web Frontend │  │  PostgreSQL  │  │
│  │   (Django)   │  │   (React)    │  │   (Plugin)   │  │
│  │              │  │              │  │              │  │
│  │  Port: 8000  │  │  Port: 3000  │  │  Port: 5432  │  │
│  │  ASGI/Daphne │  │  Serve       │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐                                        │
│  │    Redis     │                                        │
│  │   (Plugin)   │                                        │
│  │              │                                        │
│  │  Port: 6379  │                                        │
│  └──────────────┘                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘

External:
┌──────────────┐
│  Mobile App  │  (Deployed via Expo EAS)
│   (Expo)     │  Points to Backend Railway URL
└──────────────┘
```

---

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your `.env` values (see below)
4. **API Keys Ready**: AWS, Google Maps, etc.

---

## Deployment Steps

### Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your `pharmago` repository

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically provision a PostgreSQL instance
4. Note: Railway automatically creates `DATABASE_URL` variable

### Step 3: Add Redis Cache

1. Click **"+ New"** again
2. Select **"Database"** → **"Redis"**
3. Railway will automatically provision a Redis instance
4. Note: Railway automatically creates `REDIS_URL` variable

### Step 4: Deploy Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. Configure the service:
   - **Name**: `pharmago-backend`
   - **Root Directory**: `/backend`
   - **Start Command**: Will use `Procfile` automatically
4. Railway will detect the `Procfile` and deploy

### Step 5: Deploy Web Frontend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository again
3. Configure the service:
   - **Name**: `pharmago-web-frontend`
   - **Root Directory**: `/web-frontend`
   - **Start Command**: Will use `railway.json` automatically
4. Railway will build and deploy the React app

### Step 6: Configure Environment Variables

See [Environment Variables](#environment-variables) section below for comprehensive list.

### Step 7: Generate Public URLs

1. Go to each service settings
2. Under **"Networking"** → **"Public Networking"**
3. Click **"Generate Domain"**
4. Note the URLs:
   - Backend: `https://pharmago-backend-production.up.railway.app`
   - Frontend: `https://pharmago-web-frontend-production.up.railway.app`

### Step 8: Update Environment Variables with URLs

Update these variables in **Backend service**:
```
FRONTEND_URL=https://pharmago-web-frontend-production.up.railway.app
ALLOWED_HOSTS=pharmago-backend-production.up.railway.app
```

Update these variables in **Frontend service**:
```
REACT_APP_API_URL=https://pharmago-backend-production.up.railway.app/api/v1
REACT_APP_BACKEND_URL=https://pharmago-backend-production.up.railway.app
```

---

## Environment Variables

### Backend Service (Django)

#### Required Variables

**Please provide your `.env` file contents, but here's the comprehensive list:**

```bash
# ===== Django Core =====
SECRET_KEY=your-very-secure-secret-key-here-min-50-chars-recommended
DEBUG=False
ALLOWED_HOSTS=pharmago-backend-production.up.railway.app,localhost,127.0.0.1

# ===== Database (Auto-populated by Railway PostgreSQL Plugin) =====
# DATABASE_URL=postgresql://user:password@host:port/database
# Railway provides this automatically, but you can also set individual vars:
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<from Railway>
DB_HOST=<from Railway>
DB_PORT=5432

# ===== Redis (Auto-populated by Railway Redis Plugin) =====
# REDIS_URL=redis://default:password@host:port
# Railway provides this automatically

# ===== Cache & Celery =====
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}

# ===== CORS & Frontend =====
FRONTEND_URL=https://pharmago-web-frontend-production.up.railway.app

# ===== AWS S3 (For File Uploads) =====
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=ap-southeast-2

# ===== Google Maps API =====
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ===== Performance Toggles (Production) =====
ENABLE_API_USAGE_MW=1
ENABLE_SYSTEM_HEALTH_MW=1
DISABLE_THROTTLE=0
LIGHT_LOGGING=0
DISABLE_FILE_LOG=0
EMAIL_CONSOLE=0

# ===== Email Configuration =====
EMAIL_HOST_USER=sotidelivery@gmail.com
EMAIL_HOST_PASSWORD=lbhl lwyt kjlc cxby
DEFAULT_FROM_EMAIL=PharmaGo Admin <sotidelivery@gmail.com>

# ===== Static/Media Files =====
# For production, consider using S3 or Cloudinary
STATIC_URL=/static/
MEDIA_URL=/media/

# ===== WebSocket Configuration =====
# In production, use Redis channel layer
CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer
CHANNEL_LAYERS_CONFIG_HOSTS=[("${REDIS_HOST}", ${REDIS_PORT})]
```

#### Optional Variables

```bash
# Django Admin
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@pharmago.com
ADMIN_PASSWORD=<set-strong-password>

# Sentry (Error Tracking)
SENTRY_DSN=your-sentry-dsn-here

# Cloudinary (Alternative to S3)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

### Web Frontend Service (React)

#### Required Variables

```bash
# API Configuration
REACT_APP_API_URL=https://pharmago-backend-production.up.railway.app/api/v1
REACT_APP_BACKEND_URL=https://pharmago-backend-production.up.railway.app

# Environment
NODE_ENV=production

# Build Configuration
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
```

#### Optional Variables

```bash
# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Cloudinary (if using)
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your-preset
```

---

## Post-Deployment Setup

### 1. Run Database Migrations

Railway automatically runs migrations via the `release` command in `Procfile`, but you can manually run:

```bash
# In Railway backend service terminal
python manage.py migrate
```

### 2. Create Superuser

```bash
# In Railway backend service terminal
python manage.py createsuperuser
```

Follow prompts to create admin account.

### 3. Collect Static Files

Railway automatically runs this via `release` command, but manually:

```bash
python manage.py collectstatic --noinput
```

### 4. Import Initial Data

If you have medicine data to import:

```bash
# In Railway backend service terminal
python manage.py shell

# Then in Python shell:
from api.inventory.import_data import import_medicines
import_medicines()
```

Or upload via admin panel: `https://your-backend-url/admin`

### 5. Test API Endpoints

```bash
# Health check
curl https://pharmago-backend-production.up.railway.app/api/v1/health/

# API schema
curl https://pharmago-backend-production.up.railway.app/api/schema/

# Admin panel
https://pharmago-backend-production.up.railway.app/admin/
```

### 6. Update Mobile App Configuration

Update `mobileapp/apps/customer-app/services/api.ts`:

```typescript
const getApiBaseUrl = () => {
  // Production Railway backend
  if (process.env.EXPO_PUBLIC_ENV === 'production') {
    return 'https://pharmago-backend-production.up.railway.app/api/v1';
  }
  
  // ... rest of development logic
};
```

---

## File Storage Configuration

### Option 1: AWS S3 (Recommended for Production)

Already configured in `settings.py`. Just set environment variables:
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=...
```

### Option 2: Railway Volumes (Limited)

Railway offers persistent volumes, but they're limited. To enable:

1. Go to Backend service settings
2. Click "Volumes" tab
3. Add volume: `/app/media`

Update `settings.py`:
```python
if not os.getenv('AWS_ACCESS_KEY_ID'):
    # Use local file storage
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

### Option 3: Cloudinary (Alternative to S3)

1. Install package:
```bash
pip install django-cloudinary-storage
```

2. Update `settings.py`:
```python
INSTALLED_APPS += ['cloudinary_storage', 'cloudinary']

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET')
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
```

---

## Settings.py Production Changes

Add to `backend/pharmago/settings.py`:

```python
# At the top after imports
import dj_database_url

# Database - Use Railway DATABASE_URL if available
if os.getenv('DATABASE_URL'):
    DATABASES['default'] = dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )

# Redis - Use Railway REDIS_URL if available
if os.getenv('REDIS_URL'):
    CACHES['default']['LOCATION'] = os.getenv('REDIS_URL')
    CELERY_BROKER_URL = os.getenv('REDIS_URL')
    CELERY_RESULT_BACKEND = os.getenv('REDIS_URL')

# Channel Layers - Use Redis in production
if not DEBUG:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [os.getenv('REDIS_URL', 'redis://localhost:6379')],
            },
        },
    }

# Security Settings for Production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'

# Logging for Production
if not DEBUG:
    LOGGING['handlers']['console']['level'] = 'INFO'
    LOGGING['loggers']['django']['level'] = 'WARNING'
    LOGGING['loggers']['api']['level'] = 'INFO'
```

Install additional package:
```bash
pip install dj-database-url
```

Add to `backend/requirements.txt`:
```
dj-database-url==2.1.0
```

---

## CORS Configuration Update

Update `backend/pharmago/settings.py` CORS settings:

```python
# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pharmago-web-frontend-production.up.railway.app",  # Add Railway frontend
]

# For testing, you might want to allow your mobile device
if os.getenv('ADDITIONAL_CORS_ORIGINS'):
    CORS_ALLOWED_ORIGINS.extend(os.getenv('ADDITIONAL_CORS_ORIGINS').split(','))

# Only allow all origins in development
CORS_ALLOW_ALL_ORIGINS = DEBUG

# Allow credentials
CORS_ALLOW_CREDENTIALS = True
```

---

## Troubleshooting

### Issue: Database Connection Fails

**Solution:**
1. Check that PostgreSQL plugin is running
2. Verify `DATABASE_URL` is set in environment variables
3. Check Railway service logs: `Settings → Deploy Logs`

### Issue: Static Files Not Loading

**Solution:**
1. Ensure `collectstatic` runs in `Procfile` release command
2. Check `STATIC_ROOT` and `STATIC_URL` settings
3. Consider using S3/Cloudinary for static files

### Issue: WebSocket Connections Fail

**Solution:**
1. Ensure Daphne is running (check logs)
2. Verify Redis connection (`REDIS_URL` set)
3. Check ASGI configuration in `asgi.py`
4. Update `CHANNEL_LAYERS` to use Redis

### Issue: CORS Errors from Frontend

**Solution:**
1. Add frontend URL to `CORS_ALLOWED_ORIGINS`
2. Set `CORS_ALLOW_CREDENTIALS = True`
3. Check `ALLOWED_HOSTS` includes backend domain

### Issue: File Upload Errors

**Solution:**
1. Configure S3/Cloudinary (Railway doesn't persist files)
2. Or add Railway volume for `/app/media`
3. Check file upload size limits in settings

### Issue: Migrations Not Running

**Solution:**
1. Check `release` command in `Procfile`
2. Manually run: `python manage.py migrate`
3. Check service logs for errors

### Issue: Environment Variables Not Loading

**Solution:**
1. Verify variables are set in Railway service settings
2. Check variable names (case-sensitive)
3. Redeploy after adding new variables

### View Service Logs

```bash
# In Railway dashboard
Service → Deploy Logs
Service → Build Logs
```

Or use Railway CLI:
```bash
railway logs
```

---

## Monitoring & Maintenance

### Railway Dashboard

Monitor your services:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: Track deployment history

### Database Backups

Railway doesn't auto-backup. Set up manual backups:

```bash
# Create backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore backup
railway run psql $DATABASE_URL < backup.sql
```

### Health Checks

Set up health check endpoints in Django:

```python
# api/core/views.py
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    # Check database
    try:
        connection.ensure_connection()
        db_status = "ok"
    except Exception:
        db_status = "error"
    
    return JsonResponse({
        "status": "ok" if db_status == "ok" else "error",
        "database": db_status,
    })
```

### Scaling

Railway supports:
- **Vertical Scaling**: Increase CPU/Memory in service settings
- **Horizontal Scaling**: Add replicas (Pro plan)

---

## Cost Estimation

Railway pricing (as of 2024):

- **Starter Plan**: $5/month credit (limited resources)
- **Pro Plan**: $20/month + usage
  - PostgreSQL: ~$5-10/month
  - Redis: ~$5/month
  - Backend: ~$5-10/month
  - Frontend: ~$5/month

**Estimated Total**: ~$30-40/month for testing environment

---

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Create admin user and test admin panel
3. ✅ Import initial medicine data
4. ✅ Test pharmacy registration flow
5. ✅ Test order creation and processing
6. ✅ Update mobile app to point to Railway backend
7. ✅ Test WebSocket connections (rider dispatch)
8. ✅ Configure error tracking (Sentry)
9. ✅ Set up monitoring and alerts
10. ✅ Document deployed URLs for team

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Daphne Documentation](https://github.com/django/daphne)
- [Railway CLI](https://docs.railway.app/develop/cli)

---

## Support

For issues:
1. Check Railway logs first
2. Review Django logs
3. Test locally with production settings
4. Contact Railway support for platform issues

---

**Created**: 2024
**Last Updated**: 2024
**Version**: 1.0

