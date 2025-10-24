# 📧 Brevo Email Setup Guide for Railway

## ✅ **Implementation Complete!**

I've successfully transitioned your email system from Resend to Brevo. Now follow these steps to complete the setup.

---

## 🎯 **Why Brevo?**

- ✅ **300 emails/day FREE** (3x more than Resend!)
- ✅ **Send to ANY email** (no domain verification needed)
- ✅ Perfect for pharmacy approval emails
- ✅ NO credit card required
- ✅ Works perfectly on Railway

---

## 📋 **Your Manual Steps** (15 minutes total)

### **Step 1: Sign Up for Brevo** (5 minutes)

1. **Go to:** https://app.brevo.com/account/register

2. **Sign up with email:**
   - Enter your email and password
   - NO credit card required!

3. **Verify your email:**
   - Check your inbox
   - Click verification link

4. **Skip the setup wizard:**
   - Just close or skip any onboarding

5. **Get your API key:**
   - Go to: https://app.brevo.com/settings/keys/api
   - Or: Settings → **SMTP & API** → **API Keys**
   - Click **"Create a new API key"**
   - Name it: `PharmGo Railway Production`
   - Copy the API key (starts with `xkeysib-...`)
   - ⚠️ **Save it now!** You won't see it again

---

### **Step 2: Add Railway Environment Variables** (3 minutes)

1. **Go to Railway Dashboard**
2. Click **pharmago-backend** service
3. Go to **Variables** tab
4. Add these THREE variables:

```bash
# Brevo API Key (from Step 1)
BREVO_API_KEY=xkeysib-your_actual_api_key_here

# Email sender (pharmacy approval emails come from this)
DEFAULT_FROM_EMAIL=PharmGo <noreply@pharmago.com>

# Frontend URL (for login links in emails)
FRONTEND_URL=https://pharmago-frontend-production.up.railway.app
```

**Important:**
- Replace `xkeysib-...` with your actual Brevo API key
- Replace the frontend URL with your actual Railway frontend URL
- Keep the format: `PharmGo <noreply@pharmago.com>` (no quotes)

---

### **Step 3: Commit & Deploy** (2 minutes)

In your terminal:

```bash
# Make sure you're on develop branch
git status

# Add the Brevo files
git add backend/requirements.txt backend/api/utils/brevo_backend.py backend/pharmago/settings.py backend/pharmago/settings_production.py BREVO_EMAIL_TRANSITION_PLAN.md BREVO_EMAIL_SETUP_GUIDE.md

# Remove old import scripts (cleanup)
git add backend/import_to_railway.py backend/import_to_railway_direct.py backend/api/management/commands/import_fda_medicines.py

# Commit
git commit -m "Switch from Resend to Brevo email backend for Railway"

# Push
git push origin develop
```

---

### **Step 4: Verify Deployment** (2 minutes)

1. **Watch Railway:**
   - Go to Railway Dashboard → pharmago-backend
   - Click "Deployments"
   - Wait for green "SUCCESS" status

2. **Check logs:**
   - Click the successful deployment
   - Look for: "Deployment successful"
   - No errors about Brevo or email

---

### **Step 5: Test Pharmacy Approval Email** (5 minutes)

#### **Option A: Use Existing Pharmacy**

1. Go to your frontend: `https://your-frontend.up.railway.app/admin-login`
2. Login as admin
3. Go to pharmacy registrations
4. Find a pending pharmacy (or create a test one)
5. Click "Approve"
6. Check the pharmacy owner's email inbox
7. You should receive a welcome email with login link!

#### **Option B: Create Test Pharmacy**

1. Go to frontend registration: `/pharmacy-registration`
2. Fill out form with YOUR email address
3. Submit registration
4. Login to admin panel
5. Approve your test pharmacy
6. Check YOUR email
7. Click the login link
8. Create password & username
9. Access pharmacy dashboard!

---

## 🔍 **Verification Checklist**

After completing all steps:

- [ ] Brevo account created
- [ ] API key obtained (starts with `xkeysib-`)
- [ ] All 3 Railway variables added (`BREVO_API_KEY`, `DEFAULT_FROM_EMAIL`, `FRONTEND_URL`)
- [ ] Code committed and pushed
- [ ] Railway deployment successful (green)
- [ ] No errors in Railway logs
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] Login link works
- [ ] Can create password & login

---

## 📧 **What Emails Look Like**

### **Subject:**
```
Welcome to PharmaGo - Your Pharmacy Account is Approved!
```

### **From:**
```
PharmGo <noreply@pharmago.com>
```

### **Content Includes:**
- Welcome message
- Pharmacy name
- Login link (48-hour expiry)
- Instructions to create password
- Support contact info

---

## 🎯 **How It Works Now**

```
Admin approves pharmacy
    ↓
Backend generates 48-hour login token
    ↓
Brevo sends welcome email
    ↓
Email contains: {FRONTEND_URL}/initial-login?token={token}
    ↓
Pharmacy owner clicks link
    ↓
Creates password & username
    ↓
Access pharmacy dashboard
```

---

## 📊 **Brevo Free Tier Limits**

```
Daily:   300 emails
Monthly: 9,000 emails
```

**Perfect for:**
- ✅ Pharmacy registration approvals
- ✅ Order confirmations
- ✅ Password resets
- ✅ System notifications
- ✅ Customer communications

---

## 🔧 **Troubleshooting**

### **"Email not sending"**

1. Check Railway logs:
   - Railway → pharmago-backend → Logs
   - Look for "Brevo" errors

2. Verify API key:
   - Railway → pharmago-backend → Variables
   - Check `BREVO_API_KEY` is correct

3. Check Brevo dashboard:
   - https://app.brevo.com/
   - Go to "Transactional" → "Email API" → "Real-time"
   - See if emails appear there

### **"Invalid API key"**

- Regenerate in Brevo: Settings → SMTP & API → Create new key
- Update Railway variable
- Redeploy (Railway auto-redeploys on variable change)

### **"Login link doesn't work"**

- Check `FRONTEND_URL` is correct in Railway variables
- Verify token hasn't expired (48 hours)
- Check browser console for errors

### **"Email goes to spam"**

- Check email subject line
- This is normal for free tier
- Tell users to check spam folder
- Or upgrade Brevo plan (still free, just verify sender)

---

## 📈 **Monitor Email Usage**

**Brevo Dashboard:**
1. Go to: https://app.brevo.com/
2. Click **"Statistics"**
3. See:
   - Emails sent today
   - Delivery rate
   - Open rate
   - Click rate

**Railway Logs:**
1. Go to: Railway → pharmago-backend → Logs
2. Search for: "Email sent successfully via Brevo"
3. See message IDs and recipients

---

## 🎉 **You're Done!**

Once you complete the 5 steps above:
- ✅ Pharmacy approval emails work
- ✅ 300 emails/day capacity
- ✅ Professional delivery
- ✅ Login links automatically generated
- ✅ No SMTP issues on Railway

---

## 🔗 **Useful Links**

- Brevo Dashboard: https://app.brevo.com/
- Brevo API Keys: https://app.brevo.com/settings/keys/api
- Brevo Docs: https://developers.brevo.com/
- Brevo Statistics: https://app.brevo.com/statistics
- Brevo Support: https://help.brevo.com/

---

## 📞 **Need Help?**

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Railway logs carefully
3. Verify all environment variables
4. Test with your own email first

---

## ✅ **Changes Made (Technical)**

For your reference, here's what was changed:

### **Files Modified:**
1. `backend/requirements.txt` - Added `sib-api-v3-sdk==7.6.0` (removed resend)
2. `backend/api/utils/brevo_backend.py` - New Brevo email backend
3. `backend/pharmago/settings.py` - Made `DEFAULT_FROM_EMAIL` environment-driven
4. `backend/pharmago/settings_production.py` - Configured Brevo backend

### **Files Deleted:**
1. `backend/api/utils/resend_backend.py` - Old Resend backend
2. `RESEND_EMAIL_SETUP.md` - Old documentation

### **Environment Variables Required:**
```
BREVO_API_KEY=xkeysib-...
DEFAULT_FROM_EMAIL=PharmGo <noreply@pharmago.com>
FRONTEND_URL=https://your-frontend.up.railway.app
```

---

## 🚀 **Ready? Let's Go!**

Follow the 5 steps above and you'll have working pharmacy approval emails in ~15 minutes!

Good luck! 🎯

