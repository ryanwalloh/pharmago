# 🔧 Order History Page - Debug & Fix

## 📊 Issue Report
- **Problem**: Order history page not displaying active or recent orders
- **User Report**: "there is currently active orders for the logged in customer as of now"
- **Symptoms**: Empty state shows for both active and recent orders

## 🔍 Investigation

### **Backend API** ✅
**Endpoint**: `/api/customer-orders/<customer_id>/`  
**File**: `backend/api/direct/customer_orders_views.py`

The backend looks correct:
- Returns `{ success: true, data: { active_orders: [...], recent_orders: [...] } }`
- Active orders: `pending`, `accepted`, `preparing`, `ready_for_pickup`, `picked_up`
- Recent orders: `delivered`, `cancelled` (last 30 days)
- Logs successful fetches with counts

### **Frontend API Service** ✅
**Method**: `apiService.getCustomerOrders(customerId)`  
**File**: `mobileapp/apps/customer-app/services/api.ts`

The API service looks correct:
- Uses `makeDirectRequest('/customer-orders/${customerId}/')`
- Direct endpoint (bypasses auth) → correct for mobile app
- URL: `https://pharmago-backend-production.up.railway.app/api/customer-orders/${customerId}/`

### **Potential Issues** 🔍

1. **Customer ID Not Being Passed**
   - User object might not have `customer_id` field set
   - Could be stored as `id` instead
   
2. **API Request Failing Silently**
   - Network error not being logged properly
   - Response not being parsed correctly

3. **Data Structure Mismatch**
   - Backend returns nested `data.data` structure
   - Frontend might be looking at wrong level

## ✅ Fix Implemented

### **Enhanced Debugging & Fallback Logic**
**File**: `mobileapp/apps/customer-app/app/order-history/index.tsx`

**Changes**:

1. **✅ Customer ID Fallback**
   ```typescript
   // Try customer_id or fallback to id
   const customerId = user?.customer_id || user?.id;
   ```

2. **✅ Comprehensive Debug Logging**
   ```typescript
   console.log('🔍 DEBUG - User object:', {
     hasUser: !!user,
     customer_id: user?.customer_id,
     id: user?.id,
     user_id: user?.user_id,
     fullUser: user
   });
   ```

3. **✅ Enhanced API Response Logging**
   ```typescript
   console.log('📦 API Response:', {
     success: response.success,
     hasData: !!response.data,
     dataType: typeof response.data,
     data: response.data
   });
   
   console.log('📊 Orders data structure:', {
     hasActiveOrders: !!ordersData.active_orders,
     hasRecentOrders: !!ordersData.recent_orders,
     activeCount: ordersData.active_orders?.length,
     recentCount: ordersData.recent_orders?.length,
     ordersData: ordersData
   });
   ```

4. **✅ Better Error Logging**
   ```typescript
   console.error('❌ Failed to load orders:', errorMsg);
   console.error('❌ Full response:', response);
   console.error('❌ Error stack:', (err as Error).stack);
   ```

## 🧪 Testing Instructions

### **Step 1: Build and Deploy**
```bash
cd mobileapp/apps/customer-app
eas build --profile preview --platform android
```

### **Step 2: Test Order History**

1. **Open the app and log in**
   - Make sure you're logged in with a customer account that has orders

2. **Navigate to Order History**
   - From profile or navigation

3. **Check Debug Console (Metro/EAS)**
   - Look for these logs:
   ```
   🔍 DEBUG - User object: {
     hasUser: true,
     customer_id: XX or undefined,
     id: XX,
     ...
   }
   📋 Fetching orders for customer ID: XX
   📦 API Response: {...}
   📊 Orders data structure: {...}
   ✅ Loaded orders: { active: X, recent: X }
   ```

4. **Expected Outcomes:**

   **✅ SUCCESS CASE**:
   ```
   🔍 DEBUG - User object: { hasUser: true, customer_id: 5, id: 5, ... }
   📋 Fetching orders for customer ID: 5
   📦 API Response: { success: true, hasData: true, ... }
   📊 Orders data structure: { activeCount: 2, recentCount: 1, ... }
   ✅ Loaded orders: { active: 2, recent: 1 }
   [Orders display in UI]
   ```

   **❌ FAILURE CASE - No Customer ID**:
   ```
   🔍 DEBUG - User object: { hasUser: true, customer_id: undefined, id: undefined, ... }
   ❌ Customer ID not found. Please log in again.
   [Error message in UI]
   ```

   **❌ FAILURE CASE - API Error**:
   ```
   🔍 DEBUG - User object: { hasUser: true, customer_id: 5, ... }
   📋 Fetching orders for customer ID: 5
   📦 API Response: { success: false, hasData: false, ... }
   ❌ Failed to load orders: Customer not found with ID 5
   ```

   **❌ FAILURE CASE - Network Error**:
   ```
   🔍 DEBUG - User object: { hasUser: true, customer_id: 5, ... }
   📋 Fetching orders for customer ID: 5
   ❌ Error fetching orders: TypeError: Network request failed
   ❌ Error stack: ...
   [Network error message in UI]
   ```

### **Step 3: Check Backend Logs (Railway)**

When you open order history, you should see:
```
INFO: 📋 Fetching orders for customer Ryan Dela Cruz (ID: 5)
INFO: ✅ Found 2 active orders and 1 recent orders for customer 5
```

If not, check:
- Is the customer ID being passed correctly?
- Does the customer exist in the database?
- Are there actually orders for this customer?

## 🔧 Troubleshooting

### **Issue 1: "Customer ID not found"**
**Cause**: User object doesn't have `customer_id` or `id` field

**Solution**:
1. Check what's stored in AsyncStorage:
   ```typescript
   const userData = await AsyncStorage.getItem('user');
   console.log('Stored user:', JSON.parse(userData));
   ```
2. Verify login flow is setting `customer_id` correctly
3. Check `LoginPage.tsx` line 93: `customer_id: userData.customer_id || null`

### **Issue 2: API Returns Empty Arrays**
**Cause**: Customer has no orders OR orders are in different statuses

**Solution**:
1. Check Railway logs to confirm orders exist
2. Verify order statuses in database
3. Check if orders are linked to correct customer

### **Issue 3: API Request Fails (403/404/500)**
**Cause**: Backend endpoint not accessible or database issue

**Solution**:
1. Test endpoint directly: `GET https://pharmago-backend-production.up.railway.app/api/customer-orders/5/`
2. Check Railway logs for errors
3. Verify customer exists in database

### **Issue 4: Orders Exist but Not Showing**
**Cause**: Data structure mismatch or parsing issue

**Solution**:
1. Check console logs for API response structure
2. Verify `response.data.data` vs `response.data` parsing
3. Check if `active_orders` and `recent_orders` keys exist

## 📊 Expected Data Flow

```
1. User opens Order History
   ↓
2. AuthContext provides user object { id: 5, customer_id: 5, ... }
   ↓
3. fetchOrders() extracts customer_id (5)
   ↓
4. apiService.getCustomerOrders(5)
   ↓
5. GET /api/customer-orders/5/
   ↓
6. Backend queries: Order.objects.filter(customer_id=5, ...)
   ↓
7. Returns: {
      success: true,
      data: {
        active_orders: [{id: 78, ...}, {id: 77, ...}],
        recent_orders: [{id: 76, ...}]
      }
    }
   ↓
8. Frontend parses: ordersData.active_orders
   ↓
9. setActiveOrders([{id: 78, ...}, {id: 77, ...}])
   ↓
10. UI renders order cards ✅
```

## 📝 Summary

### **What Was Fixed**:
1. ✅ Added customer ID fallback (`customer_id` || `id`)
2. ✅ Added comprehensive debug logging
3. ✅ Enhanced error messages
4. ✅ Better API response parsing logs

### **What to Test**:
1. Open order history page
2. Check console logs
3. Verify orders display
4. Test pull-to-refresh

### **What to Share**:
Please share the console logs when opening the order history page:
- 🔍 DEBUG - User object
- 📋 Fetching orders for customer ID
- 📦 API Response
- 📊 Orders data structure
- ✅ Loaded orders OR ❌ Error messages

This will help identify exactly where the issue is!

---

**Status**: ✅ Debug logging added, ready to test
**Priority**: 🟡 MEDIUM (Feature broken but not blocking other features)
**Next Steps**: 
1. Build preview
2. Test and share logs
3. Identify root cause from logs
4. Apply targeted fix

**Created**: November 6, 2025
**Last Updated**: November 6, 2025

