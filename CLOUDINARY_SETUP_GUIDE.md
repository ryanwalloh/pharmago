# Cloudinary Setup Guide for PharmaGo

## Overview

PharmaGo uses **Cloudinary** for file storage instead of AWS S3. This guide shows you how to set it up.

---

## Why Cloudinary?

✅ **Easier Setup** - No IAM users, bucket policies, or CORS configuration  
✅ **Generous Free Tier** - 25GB storage + 25GB bandwidth/month  
✅ **Image Transformations** - Automatic resizing, optimization, format conversion  
✅ **CDN Included** - Fast delivery worldwide  
✅ **Simple Integration** - Just 3 environment variables  

---

## Quick Setup (5 Minutes)

### Step 1: Create Free Account

1. Go to: https://cloudinary.com/users/register/free
2. Sign up with email or Google
3. Verify your email
4. Login to dashboard

### Step 2: Get Credentials

After login, you'll see your **Dashboard**:

```
Cloud name:    your-cloud-name
API Key:       123456789012345
API Secret:    ************************ (click "Show")
```

**Copy these three values!** You'll need them for Railway.

### Step 3: Add to Railway

In Railway Backend Service → Variables, add:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12
```

That's it! Your file uploads will now use Cloudinary.

---

## What's Already Configured

The following is already set up in your project:

### Backend Configuration

**requirements.txt** includes:
```
django-cloudinary-storage==0.3.0
cloudinary==1.36.0
```

**settings_production.py** automatically:
- Detects Cloudinary credentials
- Configures Cloudinary storage
- Sets it as default file storage

No additional Django configuration needed!

---

## Testing File Uploads

### After Deployment

1. **Login to Admin**:
   ```
   https://your-backend.railway.app/admin/
   ```

2. **Upload a Test File**:
   - Go to a model with file/image field
   - Upload a pharmacy registration or prescription
   - Click Save

3. **Verify in Cloudinary**:
   - Go to: https://cloudinary.com/console/media_library
   - Your uploaded file should appear there
   - File URL will be: `https://res.cloudinary.com/your-cloud-name/...`

---

## Cloudinary Free Tier Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Storage | 25 GB | More than enough for testing |
| Bandwidth | 25 GB/month | ~833 MB/day |
| Transformations | 25,000/month | Image resizing, optimization |
| Credits | 25 | Monthly usage credits |

**For PharmaGo testing, the free tier is perfect!**

If you exceed limits, Cloudinary offers paid plans starting at $99/month.

---

## Advanced Features (Optional)

### Upload Presets

For direct frontend uploads (bypassing backend):

1. **Create Preset**:
   - Dashboard → Settings → Upload
   - Add upload preset
   - Name: `pharmago-uploads`
   - Signing Mode: `Unsigned`
   - Save

2. **Add to Frontend**:
   ```bash
   # Railway Frontend Variables
   REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
   REACT_APP_CLOUDINARY_UPLOAD_PRESET=pharmago-uploads
   ```

3. **Use in React**:
   ```javascript
   // Direct upload from browser
   const formData = new FormData();
   formData.append('file', file);
   formData.append('upload_preset', 'pharmago-uploads');
   
   fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
     method: 'POST',
     body: formData
   });
   ```

### Image Transformations

Cloudinary can automatically:
- Resize images
- Convert formats (JPG → WebP)
- Optimize file size
- Generate thumbnails

Example URL transformations:
```
Original:  https://res.cloudinary.com/demo/image/upload/sample.jpg
Thumbnail: https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fill/sample.jpg
Optimized: https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg
```

---

## Monitoring Usage

### View Usage Stats

1. Go to: https://cloudinary.com/console/usage
2. See:
   - Storage used
   - Bandwidth consumed
   - Transformations used
   - Credits remaining

### Set Up Alerts

1. Dashboard → Settings → Notifications
2. Enable "Usage alerts"
3. Set threshold (e.g., 80% of limit)
4. Get email when approaching limits

---

## Migration from Existing Files

If you have existing files in local storage or S3:

### Option 1: Upload via Admin

1. Login to admin panel
2. Manually re-upload important files
3. Old files will remain in local storage
4. New files go to Cloudinary

### Option 2: Bulk Upload via Cloudinary

1. Go to: https://cloudinary.com/console/media_library
2. Click "Upload"
3. Drag and drop files
4. Update database URLs if needed

### Option 3: Programmatic Upload

```python
# backend/scripts/migrate_to_cloudinary.py
import cloudinary.uploader
from api.pharmacies.models import Pharmacy

for pharmacy in Pharmacy.objects.all():
    if pharmacy.registration_document:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            pharmacy.registration_document.path
        )
        # Update URL
        pharmacy.registration_document = result['secure_url']
        pharmacy.save()
```

---

## Troubleshooting

### Issue: Files Not Uploading

**Check**:
1. Cloudinary credentials are correct
2. All three variables are set (CLOUD_NAME, API_KEY, API_SECRET)
3. Backend service restarted after adding variables
4. Check Railway logs for errors

**Test credentials**:
```python
railway run python manage.py shell

import cloudinary
cloudinary.config(
    cloud_name="your-cloud",
    api_key="your-key",
    api_secret="your-secret"
)
cloudinary.uploader.upload("test.jpg")
```

### Issue: Files Upload but Can't Be Accessed

**Check**:
1. File URLs in database are correct
2. Cloudinary files are set to "Public"
3. CORS is configured (usually not needed for Cloudinary)

### Issue: Exceeding Free Tier

**Solutions**:
1. Optimize images before upload
2. Delete unused files from Cloudinary
3. Upgrade to paid plan ($99/month)
4. Use transformations to reduce bandwidth

---

## Security Best Practices

### Protect API Secret

✅ **DO**:
- Store in Railway environment variables
- Never commit to git
- Rotate regularly
- Use different credentials for staging/production

❌ **DON'T**:
- Hardcode in source code
- Share via email/Slack
- Use same credentials across environments
- Expose in frontend code

### Upload Restrictions

Configure in Cloudinary Dashboard → Settings → Upload:

- **Allowed formats**: jpg, png, pdf
- **Max file size**: 10 MB
- **Resource type**: image, raw
- **Folder**: pharmago/uploads

---

## Cost Optimization

### Tips to Stay Within Free Tier

1. **Optimize Before Upload**:
   - Resize large images on upload
   - Compress files
   - Use appropriate formats

2. **Clean Up Regularly**:
   - Delete test uploads
   - Remove unused files
   - Archive old files

3. **Use Transformations Wisely**:
   - Cache transformed URLs
   - Don't generate unique transformations for each request
   - Use responsive breakpoints

4. **Monitor Usage**:
   - Check dashboard weekly
   - Set up usage alerts
   - Track bandwidth consumption

---

## Cloudinary vs AWS S3 Comparison

| Feature | Cloudinary | AWS S3 |
|---------|-----------|--------|
| Setup Complexity | ⭐ Easy | ⭐⭐⭐ Complex |
| Free Tier | 25GB storage | 5GB storage |
| CDN Included | ✅ Yes | ❌ No (CloudFront extra) |
| Image Processing | ✅ Built-in | ❌ Need Lambda |
| Cost (small scale) | Free | ~$2-5/month |
| Cost (large scale) | $99+/month | $20-50/month |
| File Management | Better UI | CLI/Console |

**For PharmaGo testing: Cloudinary is the better choice!**

---

## Environment Variables Summary

### Backend (3 variables)

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12
```

### Frontend (Optional, 2 variables)

```bash
REACT_APP_CLOUDINARY_CLOUD_NAME=your-cloud-name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=pharmago-uploads
```

---

## Support Resources

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Django Integration**: https://cloudinary.com/documentation/django_integration
- **Dashboard**: https://cloudinary.com/console
- **Support**: https://support.cloudinary.com

---

## Quick Reference Card

```
📋 CLOUDINARY SETUP CHECKLIST

□ Sign up: cloudinary.com/users/register/free
□ Get credentials from dashboard
□ Add to Railway backend variables:
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET
□ Deploy backend
□ Test file upload in admin
□ Verify in Cloudinary media library

✅ Done! Files now stored in Cloudinary
```

---

**Created**: October 2024  
**Status**: Production Ready  
**Free Tier**: Perfect for Testing  
**Setup Time**: 5 minutes

