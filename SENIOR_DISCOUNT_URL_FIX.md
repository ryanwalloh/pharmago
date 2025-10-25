# 🔧 Senior Discount URL Path Fix

## ✅ **Issue: 404 Not Found**

Railway logs showed:
```
WARNING Not Found: /api/pharmacy-review-senior-discount/12/
WARNING Not Found: /api/orders/pharmacy-review-senior-discount/10/
```

---

## 🔍 **Root Cause Analysis**

### **Backend URL Structure:**
```
urls_core.py:
  └─ /api/ → include('api.urls')
       └─ api/urls.py:
            └─ /v1/ → include([ ... ])
                 └─ '' → include('api.orders.urls')
                      └─ api/orders/urls.py:
                           └─ pharmacy-review-senior-discount/<id>/
                           └─ cancel/<id>/
```

**Correct Paths:**
- ✅ `/api/v1/pharmacy-review-senior-discount/12/`
- ✅ `/api/v1/cancel/12/`

### **Direct Endpoints (Different Path):**
```
urls_core.py:
  └─ /api/ → include('api.direct.urls')
       └─ api/direct/urls.py:
            └─ accept-cart-order/<id>/
```

**Direct Endpoint:**
- ✅ `/api/accept-cart-order/12/`

---

## ✅ **Fixes Applied**

### **1. Pharmacy Dashboard (Web)**

**Before:**
```javascript
❌ /api/orders/pharmacy-review-senior-discount/12/
❌ /api/pharmacy-review-senior-discount/12/
```

**After:**
```javascript
✅ /api/v1/pharmacy-review-senior-discount/12/
```

**File:** `web-frontend/src/components/PharmacyDashboard.js`
- Fixed line 377: `handleApproveSeniorDiscount()`
- Fixed line 456: `handleSubmitRejection()`

---

### **2. Mobile App (Customer)**

**Before:**
```typescript
❌ /orders/cancel/12/  → becomes /api/v1/orders/cancel/12/ (404)
```

**After:**
```typescript
✅ /cancel/12/  → becomes /api/v1/cancel/12/ (Correct!)
```

**File:** `mobileapp/apps/customer-app/services/api.ts`
- Fixed line 574: `cancelOrder()` method

---

## 📊 **Complete URL Reference**

### **Cart Orders:**
```
✅ POST /api/accept-cart-order/<id>/           (Direct endpoint)
✅ POST /api/v1/pharmacy-review-senior-discount/<id>/  (Orders endpoint)
✅ POST /api/v1/cancel/<id>/                   (Orders endpoint)
```

### **Chat:**
```
✅ POST /api/order-chat-room/                  (Chat dev endpoint)
✅ POST /api/order-chat-send/                  (Chat dev endpoint)
✅ GET  /api/order-chat-messages/              (Chat dev endpoint)
```

### **Other:**
```
✅ GET  /api/pharmacy-orders/<id>/             (Direct endpoint)
✅ POST /api/create-cart-order/                (Direct endpoint)
```

---

## 🚀 **Deploy Commands**

```bash
git add web-frontend/src/components/PharmacyDashboard.js
git add mobileapp/apps/customer-app/services/api.ts

git commit -m "Fix senior discount and cancel order API paths

- Correct pharmacy-review-senior-discount to use /api/v1/ prefix
- Fix cancel order path in mobile app
- Resolves 404 errors on Railway

Backend routes are under /api/v1/ while direct routes are under /api/"

git push origin develop
```

---

## ✅ **Expected Result After Deployment**

### **Reject Senior Discount:**
```
1. Pharmacy clicks "Reject Discount"
2. Modal shows with reasons
3. Select reason, click "Submit"
4. ✅ POST /api/v1/pharmacy-review-senior-discount/12/
5. ✅ Response: 200 OK
6. ✅ Discount removed, total updated
7. ✅ Message sent to customer
```

### **Cancel Order:**
```
1. Customer clicks "Cancel Order"
2. Confirms cancellation
3. ✅ POST /api/v1/cancel/12/
4. ✅ Response: 200 OK
5. ✅ Order status → cancelled
6. ✅ Pharmacy notified
```

---

## 🎯 **Testing Checklist**

After deployment:
- [ ] Reject senior discount works (no 404)
- [ ] Customer receives rejection message
- [ ] Action buttons appear in mobile app
- [ ] Cancel order works from mobile app
- [ ] Proceed with order sends message

---

**All URL paths now correctly aligned with backend routing!** ✅

