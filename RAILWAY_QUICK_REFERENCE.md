# Railway Deployment - Quick Reference Card

## 🚀 30-Minute Deployment Checklist

### Prerequisites (5 min)
```bash
✅ Railway account: railway.app
✅ GitHub repo pushed
✅ AWS S3 bucket created
✅ Google Maps API key ready
✅ .env file contents ready
```

### Deployment (25 min)

#### 1. Create Railway Project (3 min)
```
→ railway.app/dashboard
→ New Project
→ Deploy from GitHub
→ Select pharmago repo
```

#### 2. Add Database Plugins (2 min)
```
→ + New → Database → PostgreSQL
→ + New → Database → Redis
(Auto-creates DATABASE_URL and REDIS_URL)
```

#### 3. Deploy Backend (10 min)
```
→ + New → GitHub Repo → pharmago
→ Settings → Root Directory: /backend
→ Variables → Add all backend variables (see below)
→ Generate Domain
→ Deploy
```

**Required Backend Variables:**
```bash
SECRET_KEY=<generate-new>
DEBUG=False
ALLOWED_HOSTS=<backend-domain>.railway.app
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_STORAGE_BUCKET_NAME=<bucket>
AWS_S3_REGION_NAME=ap-southeast-2
GOOGLE_MAPS_API_KEY=<your-key>
FRONTEND_URL=https://<frontend-domain>.railway.app
ENABLE_API_USAGE_MW=1
ENABLE_SYSTEM_HEALTH_MW=1
DISABLE_THROTTLE=0
LIGHT_LOGGING=0
DISABLE_FILE_LOG=1
EMAIL_CONSOLE=0
```

#### 4. Deploy Frontend (5 min)
```
→ + New → GitHub Repo → pharmago
→ Settings → Root Directory: /web-frontend
→ Variables → Add frontend variables
→ Generate Domain
→ Deploy
```

**Required Frontend Variables:**
```bash
REACT_APP_API_URL=https://<backend-domain>.railway.app/api/v1
REACT_APP_BACKEND_URL=https://<backend-domain>.railway.app
NODE_ENV=production
```

#### 5. Post-Deployment (5 min)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# Create superuser
railway run python manage.py createsuperuser

# Test
→ Visit: https://<backend-domain>.railway.app/admin
→ Visit: https://<frontend-domain>.railway.app
```

---

## 🔧 Essential Commands

### Railway CLI Quick Commands
```bash
# Deploy
railway up

# View logs
railway logs

# Access shell
railway shell

# Set variable
railway variables set KEY=value

# List all variables
railway variables

# Run command
railway run <command>
```

### Common Django Commands via Railway
```bash
railway run python manage.py migrate
railway run python manage.py createsuperuser
railway run python manage.py collectstatic
railway run python manage.py shell
```

---

## 📝 Environment Variable Templates

### Backend (Copy-Paste Ready)
```
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=ap-southeast-2
GOOGLE_MAPS_API_KEY=
FRONTEND_URL=
ENABLE_API_USAGE_MW=1
ENABLE_SYSTEM_HEALTH_MW=1
DISABLE_THROTTLE=0
LIGHT_LOGGING=0
DISABLE_FILE_LOG=1
EMAIL_CONSOLE=0
```

### Frontend (Copy-Paste Ready)
```
REACT_APP_API_URL=
REACT_APP_BACKEND_URL=
NODE_ENV=production
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
```

---

## 🛠️ Generate Secret Key

```bash
# Method 1: Django
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Method 2: OpenSSL
openssl rand -base64 50

# Method 3: Railway CLI
railway variables set SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')"
```

---

## 🧪 Testing Endpoints

```bash
# Health check
curl https://<backend>.railway.app/api/v1/health/

# API schema
curl https://<backend>.railway.app/api/schema/

# Admin panel
https://<backend>.railway.app/admin/

# Frontend
https://<frontend>.railway.app/
```

---

## 🐛 Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Build fails | Check `railway logs` for errors |
| Database error | Verify PostgreSQL plugin added |
| Static files 404 | Check `collectstatic` in Procfile |
| CORS error | Add frontend URL to backend CORS |
| WebSocket fails | Verify Daphne running, Redis connected |
| Variables not loading | Redeploy after adding variables |

---

## 📊 Service Health Check

```bash
# Check backend
curl https://<backend>.railway.app/api/v1/health/

# Check frontend (should return HTML)
curl https://<frontend>.railway.app/

# Check WebSocket
# (Use browser console)
const ws = new WebSocket('wss://<backend>.railway.app/ws/delivery/');
```

---

## 🔄 Update Process

```bash
# 1. Make changes locally
git add .
git commit -m "Your changes"
git push

# 2. Railway auto-deploys on push
# Or manually trigger: railway up

# 3. Check deployment
railway logs

# 4. Test changes
curl https://<your-domain>.railway.app
```

---

## 💰 Cost Monitoring

```
Railway Dashboard → Project → Usage
```

**Expected Costs:**
- Backend: $8-12/month
- Frontend: $5-8/month
- PostgreSQL: $5/month
- Redis: $3/month
- **Total: ~$21-28/month**

---

## 📁 File Structure

```
pharmago/
├── backend/
│   ├── Procfile              ← Railway commands
│   ├── runtime.txt           ← Python version
│   ├── railway.json          ← Build config
│   ├── nixpacks.toml         ← Build settings
│   └── .railwayignore        ← Files to exclude
│
└── web-frontend/
    ├── railway.json          ← Build config
    ├── nixpacks.toml         ← Build settings
    └── .railwayignore        ← Files to exclude
```

---

## 🔐 Security Checklist

- [ ] New SECRET_KEY generated
- [ ] DEBUG=False in production
- [ ] ALLOWED_HOSTS set correctly
- [ ] AWS credentials use IAM user (not root)
- [ ] Google Maps API key restricted
- [ ] Strong admin password
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Environment variables encrypted (automatic on Railway)

---

## 📞 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Backend Admin**: https://your-backend.railway.app/admin
- **Frontend**: https://your-frontend.railway.app
- **PostgreSQL**: Railway Dashboard → PostgreSQL → Connect
- **Redis**: Railway Dashboard → Redis → Connect

---

## 🆘 Emergency Commands

```bash
# View recent logs
railway logs --tail 100

# Restart service
railway restart

# Rollback deployment
railway rollback

# Access database
railway shell
python manage.py dbshell

# Create database backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore database
railway run psql $DATABASE_URL < backup.sql
```

---

## ✅ Post-Deployment Verification

```bash
# 1. Backend health
curl https://<backend>.railway.app/api/v1/health/
# Expected: {"status": "ok"}

# 2. Admin access
Visit: https://<backend>.railway.app/admin/
Login with superuser credentials

# 3. Frontend loads
Visit: https://<frontend>.railway.app/
Check browser console for errors

# 4. API calls work
Check Network tab in browser DevTools
Verify calls go to correct backend URL

# 5. File uploads work
Test uploading image in admin
Verify appears in S3 bucket

# 6. WebSocket works
Test real-time features
Check WebSocket connection in Network tab
```

---

## 📚 Documentation Files

1. **RAILWAY_DEPLOYMENT_GUIDE.md** - Detailed guide (start here)
2. **RAILWAY_ENVIRONMENT_VARIABLES.md** - Complete variable reference
3. **RAILWAY_ENV_VARIABLES_TEMPLATE.txt** - Copy-paste template
4. **RAILWAY_DEPLOYMENT_SUMMARY.md** - Overview and checklist
5. **RAILWAY_QUICK_REFERENCE.md** - This quick reference

---

**Print this page and keep it handy during deployment!**

Last Updated: October 23, 2025

