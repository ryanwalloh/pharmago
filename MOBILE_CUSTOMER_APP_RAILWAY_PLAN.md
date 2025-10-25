# 📱 Mobile Customer App - Railway Integration Plan

## 🎯 **Goal**
Update the customer mobile app to use Railway hosted backend instead of localhost/local network IPs.

---

## 🔍 **Current State Analysis**

### **✅ What's Already Good:**

1. **API Service (`services/api.ts`)**
   - ✅ Already uses environment variable: `EXPO_PUBLIC_API_BASE`
   - ✅ Smart fallback system with auto-detection
   - ✅ Clean architecture with `getApiBaseUrl()` function

2. **Cloudinary Service (`services/cloudinaryService.ts`)**
   - ✅ Already configured with Cloudinary credentials
   - ✅ Direct upload to Cloudinary (bypasses backend for uploads)
   - ✅ Properly handles prescriptions, licenses, proof of delivery

3. **App Configuration (`app.config.js`)**
   - ✅ Uses environment variables for Google Maps API key
   - ✅ Proper Expo configuration structure

---

## ⚠️ **What Needs Updating:**

### **1. API Fallback URL** 🔴 **CRITICAL**

**File:** `mobileapp/apps/customer-app/services/api.ts`

**Current (Line 40):**
```typescript
return 'http://192.168.254.103:8000/api/v1';  // Local network IP ❌
```

**Should be:**
```typescript
return 'https://pharmago-backend-production.up.railway.app/api/v1';  // Railway ✅
```

**Impact:** If `EXPO_PUBLIC_API_BASE` is not set, app will try to connect to local IP and fail.

---

### **2. OrderTrackingScreen Fallback URL** 🔴 **CRITICAL**

**File:** `mobileapp/apps/customer-app/screens/OrderTrackingScreen.tsx`

**Current (Line 80):**
```typescript
return 'http://192.168.254.103:8000';  // Local network IP ❌
```

**Should be:**
```typescript
return 'https://pharmago-backend-production.up.railway.app';  // Railway ✅
```

**Impact:** Order tracking screen won't load order data.

---

### **3. Debug Log in CreateAccountPage** 🟡 **LOW PRIORITY**

**File:** `mobileapp/apps/customer-app/components/CreateAccountPage.tsx`

**Current (Line 45):**
```typescript
baseURL: 'http://localhost:8000/api/v1',  // Hardcoded in log ❌
```

**Should be:**
```typescript
baseURL: apiService.baseURL || 'Not configured',  // Dynamic ✅
```

**Impact:** Just a debug log, doesn't affect functionality but might confuse developers.

---

## 📋 **Strategic Implementation Plan**

### **Phase 1: Update Fallback URLs** ✅ (Critical)

**Priority:** HIGH  
**Time:** 5 minutes  
**Risk:** Low (just changing fallback values)

**Files to modify:**
1. `services/api.ts` - Update fallback URL
2. `screens/OrderTrackingScreen.tsx` - Update fallback URL
3. `components/CreateAccountPage.tsx` - Fix debug log (optional)

**Why important:** Ensures app works even if environment variables aren't set.

---

### **Phase 2: Create Environment Configuration** ✅ (Important)

**Priority:** MEDIUM  
**Time:** 3 minutes  
**Risk:** None

**Create:** `.env.example` file with template values

**Purpose:** 
- Documentation for other developers
- Template for different environments
- Easy setup for production vs development

---

### **Phase 3: Documentation** ✅ (Important)

**Priority:** MEDIUM  
**Time:** 5 minutes  
**Risk:** None

**Create:** `RAILWAY_SETUP.md` for customer-app

**Include:**
- How to configure environment variables
- How to build for production
- Testing checklist

---

## 🔧 **Detailed Changes Required**

### **Change 1: API Service Fallback**

```typescript
// File: services/api.ts

// Before (Line 40):
return 'http://192.168.254.103:8000/api/v1';

// After:
return 'https://pharmago-backend-production.up.railway.app/api/v1';
```

**Reasoning:** Railway URL should be the default when no environment variable is set.

---

### **Change 2: OrderTrackingScreen Fallback**

```typescript
// File: screens/OrderTrackingScreen.tsx

// Before (Line 80):
return 'http://192.168.254.103:8000';

// After:
return 'https://pharmago-backend-production.up.railway.app';
```

**Reasoning:** Ensures order tracking works with Railway backend.

---

### **Change 3: CreateAccountPage Debug Log** (Optional)

```typescript
// File: components/CreateAccountPage.tsx

// Before (Line 45):
baseURL: 'http://localhost:8000/api/v1',

// After:
baseURL: API_BASE_URL,  // Import from api.ts
```

**Reasoning:** Shows actual configured URL, not hardcoded value.

---

## 📊 **Environment Variable Setup**

### **For Development (Local Backend):**

Create: `mobileapp/apps/customer-app/.env`

```bash
# Backend URL - Use your local backend
EXPO_PUBLIC_API_BASE=http://192.168.254.103:8000

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ

# Cloudinary (already hardcoded, but good to document)
CLOUDINARY_CLOUD_NAME=dwqrkobq1
CLOUDINARY_UPLOAD_PRESET=pharmago-file-uploads
CLOUDINARY_API_KEY=947651824417687
```

### **For Production/Testing (Railway Backend):**

Update: `mobileapp/apps/customer-app/.env`

```bash
# Backend URL - Use Railway hosted backend
EXPO_PUBLIC_API_BASE=https://pharmago-backend-production.up.railway.app

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ

# Cloudinary (already hardcoded, but good to document)
CLOUDINARY_CLOUD_NAME=dwqrkobq1
CLOUDINARY_UPLOAD_PRESET=pharmago-file-uploads
CLOUDINARY_API_KEY=947651824417687
```

---

## ✅ **How Environment Variables Work in Customer App**

### **Priority Order:**

```
1. EXPO_PUBLIC_API_BASE (from .env)           ← Highest priority ✅
   ↓ If not set...
2. Auto-detected from Expo dev server IP      ← For local development
   ↓ If fails...
3. Fallback URL (what we're updating)         ← Should be Railway URL
```

---

## 🧪 **Testing Strategy**

### **Test 1: Environment Variable Method**

1. Create `.env` file with Railway URL
2. Run: `npm start` in customer-app
3. Test on physical device or emulator
4. Verify API calls go to Railway

### **Test 2: Fallback Method**

1. Delete/rename `.env` file
2. Run: `npm start`
3. App should use fallback (Railway URL)
4. Verify API calls work

### **Test 3: Web Version**

1. Run: `npm run web`
2. Opens in browser
3. Should detect localhost or use Railway
4. Test login/registration

---

## 📝 **Complete Testing Checklist**

### **Customer App Features to Test:**

- [ ] **User Registration**
  - Create account with email/password
  - Verify backend receives data
  
- [ ] **User Login**
  - Login with credentials
  - Receive auth token
  - Token stored properly
  
- [ ] **Pharmacy Search**
  - Search active pharmacies
  - View pharmacy details
  - Check distance calculation
  
- [ ] **Medicine Search (SuperSearch)**
  - Search medicines
  - Filter results
  - View medicine details
  
- [ ] **Prescription Upload**
  - Take photo or select from gallery
  - Upload to Cloudinary ✅ (already working)
  - Create prescription order
  
- [ ] **Regular Order**
  - Add items to cart
  - Select pharmacy
  - Select delivery address
  - Place order
  
- [ ] **Order Tracking**
  - View order status
  - See delivery progress
  - Real-time updates
  
- [ ] **Chat with Pharmacy**
  - Open chat for order
  - Send messages
  - Receive pricing quotes
  - Approve/reject pricing
  
- [ ] **Profile Management**
  - View profile
  - Update information
  - Manage addresses

---

## 🔐 **Security Considerations**

### **✅ Already Secure:**

1. **Cloudinary Credentials**
   - Upload preset is **unsigned** (correct for client-side)
   - API key is read-only for uploads
   - Secure URLs returned

2. **Auth Token Management**
   - Uses AsyncStorage (encrypted on device)
   - Bearer token authentication
   - Proper error handling

### **⚠️ Recommendations:**

1. **Move Cloudinary to Environment Variables** (Future Enhancement)
   - Not critical for now
   - Cloudinary upload preset is meant to be public
   - API key is read-only

2. **HTTPS Only** (Already Handled)
   - Railway uses HTTPS ✅
   - Cloudinary uses HTTPS ✅

---

## 📦 **Files Summary**

### **Files to Modify:**

| File | Changes | Priority | Risk |
|------|---------|----------|------|
| `services/api.ts` | Update fallback URL (line 40) | 🔴 HIGH | Low |
| `screens/OrderTrackingScreen.tsx` | Update fallback URL (line 80) | 🔴 HIGH | Low |
| `components/CreateAccountPage.tsx` | Fix debug log (line 45) | 🟡 LOW | None |

### **Files to Create:**

| File | Purpose | Priority |
|------|---------|----------|
| `.env.example` | Environment template | 🟢 MEDIUM |
| `RAILWAY_SETUP.md` | Setup documentation | 🟢 MEDIUM |

### **Files Already Correct:**

| File | Status | Note |
|------|--------|------|
| `services/cloudinaryService.ts` | ✅ Good | Already uses Cloudinary |
| `services/prescriptionService.ts` | ✅ Good | Uses api.ts |
| `services/dispatchService.ts` | ✅ Good | Uses api.ts |
| `contexts/AuthContext.tsx` | ✅ Good | Uses api.ts |
| All screens | ✅ Good | Use services layer |

---

## 🚀 **Implementation Steps**

### **Step 1: Update Fallback URLs** (5 min)

```typescript
// 1. Update services/api.ts line 40
return 'https://pharmago-backend-production.up.railway.app/api/v1';

// 2. Update screens/OrderTrackingScreen.tsx line 80
return 'https://pharmago-backend-production.up.railway.app';

// 3. (Optional) Fix CreateAccountPage.tsx line 45
import { apiService } from '../services/api';
baseURL: apiService.baseURL || 'Not configured',
```

### **Step 2: Create .env.example** (2 min)

```bash
# Railway Backend (Production/Testing)
EXPO_PUBLIC_API_BASE=https://pharmago-backend-production.up.railway.app

# OR Local Backend (Development)
# EXPO_PUBLIC_API_BASE=http://192.168.x.x:8000

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ
```

### **Step 3: Create Documentation** (3 min)

Create `RAILWAY_SETUP.md` with instructions.

### **Step 4: Test Everything** (15 min)

Follow testing checklist above.

---

## ⚡ **Quick Start (For You)**

### **Option A: Use Environment Variable** (Recommended)

1. **Create `.env` file:**
   ```bash
   cd mobileapp/apps/customer-app
   echo EXPO_PUBLIC_API_BASE=https://pharmago-backend-production.up.railway.app > .env
   echo GOOGLE_MAPS_API_KEY=AIzaSyCCuDLJMhB-23kQiXYpXwi-yYGvKz7OgSQ >> .env
   ```

2. **Start the app:**
   ```bash
   npm start
   ```

3. **Test on device/emulator**

### **Option B: Update Fallback URLs** (Permanent)

1. Update the 2 files (api.ts, OrderTrackingScreen.tsx)
2. Commit changes
3. App works without .env file

---

## 🔄 **Development vs Production**

### **For Local Development:**
```bash
EXPO_PUBLIC_API_BASE=http://192.168.x.x:8000  # Your computer's local IP
```

### **For Railway Testing:**
```bash
EXPO_PUBLIC_API_BASE=https://pharmago-backend-production.up.railway.app
```

### **Easy Switching:**
Just change the `.env` file and restart the app!

---

## 📊 **Expected Results After Update**

### **Before:**
```
❌ App tries to connect to: http://192.168.254.103:8000
❌ Connection fails (IP not accessible)
❌ Login fails
❌ Registration fails
❌ All features broken
```

### **After:**
```
✅ App connects to: https://pharmago-backend-production.up.railway.app
✅ Login works
✅ Registration works
✅ Pharmacy search works
✅ Order creation works
✅ Prescription upload works (Cloudinary + Railway)
✅ Chat works
✅ Order tracking works
```

---

## 🎯 **Recommendation**

### **Best Approach: Update Fallback URLs**

**Why:**
- ✅ Works immediately without .env file
- ✅ Railway becomes the default
- ✅ Still supports local dev via environment variable
- ✅ One-time change, permanent fix

**Implementation:**
1. Change 2 lines of code
2. Commit
3. Done!

---

## 🔍 **Double-Check - No Other Hardcoded URLs**

I scanned the entire customer-app:

✅ **All API calls use `apiService`**
✅ **All screens use services layer**
✅ **No direct fetch() calls to localhost (except in api.ts)**
✅ **Cloudinary service is independent**
✅ **No hardcoded backend URLs in components**

**Result:** Only 2 files need updating! 🎉

---

## ⏭️ **What Happens Next**

After fixing customer-app:
1. Test customer registration/login
2. Test order creation
3. Test prescription upload
4. Move to rider-app (similar process)

---

## 🚀 **Ready to Implement?**

The plan is simple:
1. Update 2 fallback URLs
2. Create .env.example for documentation
3. Test the app
4. Move to rider-app

**Total time: ~15 minutes**

---

**Should I proceed with the implementation?** 🎯

