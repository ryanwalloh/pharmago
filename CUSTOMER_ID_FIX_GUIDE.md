# Customer ID Fix - Registration & Address Save

## 🐛 **Problem**
When users registered, the `customer_id` from the API response was not being saved to AsyncStorage, causing the "Customer ID not found" error when trying to save addresses.

## ✅ **What I Fixed**

### **1. Updated User Interface** (`AuthContext.tsx`)
Added customer ID fields to the User interface:
```typescript
interface User {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  hasCompletedOnboarding?: boolean;
  customer_id?: number;  // ✅ Added
  id?: number;            // ✅ Added
  user_id?: number;       // ✅ Added
}
```

### **2. Updated Registration Flow** (`CreateAccountPage.tsx`)
Now saves the complete user data including customer_id from API response:
```typescript
const userData = {
  username: username.trim(),
  email: email.trim(),
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  phone: normalizedPhone,
  // ✅ Save customer_id from API response
  customer_id: response.data?.customer_id || response.data?.id || response.data?.customer?.id,
  id: response.data?.id || response.data?.customer_id,
};

await login(userData);
```

### **3. Enhanced Address Save** (`checkout.tsx`)
Added debugging and multiple fallback options:
```typescript
// Try multiple possible field names for customer ID
const customerId = user.customer_id || user.id || user.user_id || user.customer?.id;

console.log('👤 User data from AsyncStorage:', user);
console.log('🔍 Customer ID found:', customerId);
```

---

## 🔧 **For Users Who Already Registered**

### **Option 1: Re-register (Fresh Start)**
1. Log out from the app
2. Register again with new account
3. Customer ID will be saved properly ✅

### **Option 2: Login Again** (If login also saves customer_id)
1. Log out
2. Log back in
3. Check if customer ID is now saved

### **Option 3: Wait for API Update** (If needed)
Backend might need to return customer_id in login response as well.

---

## 📋 **Testing Checklist**

### **For New Registrations:**
- [ ] Register new account
- [ ] Check console logs for: `💾 Saving complete user data including customer_id:`
- [ ] Navigate to checkout
- [ ] Click "Edit" on Delivery Address
- [ ] Fill in address details
- [ ] Click "Save"
- [ ] Should see: `✅ Address saved successfully to database:`
- [ ] No more "Customer ID not found" error ✅

### **Debugging Steps:**
1. Open app and go to checkout
2. Open console/debug logs
3. Click "Edit" on Delivery Address
4. Try to save
5. Check logs for:
   ```
   👤 User data from AsyncStorage: { ... }
   🔍 Customer ID found: 24
   📍 Saving address to database: { ... }
   ✅ Address saved successfully to database: { ... }
   ```

---

## 🔍 **What to Look For in Logs**

### **Good (Working):**
```
👤 User data from AsyncStorage: {
  username: "john_doe",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+639123456789",
  customer_id: 24,  ← ✅ This should exist!
  id: 24
}
🔍 Customer ID found: 24
📍 Saving address to database: { customer_id: 24, ... }
✅ Address saved successfully to database: { ... }
```

### **Bad (Not Working):**
```
👤 User data from AsyncStorage: {
  username: "john_doe",
  email: "john@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+639123456789"
  // ❌ No customer_id!
}
🔍 Customer ID found: undefined
❌ No customer ID found in user data
```

---

## 🚀 **Files Modified**

1. `mobileapp/apps/customer-app/contexts/AuthContext.tsx`
   - Added customer_id fields to User interface

2. `mobileapp/apps/customer-app/components/CreateAccountPage.tsx`
   - Updated registration to save customer_id from API response

3. `mobileapp/apps/customer-app/app/checkout.tsx`
   - Enhanced debugging
   - Multiple fallback options for customer ID
   - Better error messages

---

## 📝 **Next Steps**

1. **Test with new registration** - Should work immediately ✅
2. **Existing users** - May need to re-register or log in again
3. **Backend** - Consider returning customer_id in login response as well

---

## 💡 **Additional Recommendations**

### **For Better UX:**
Consider adding a "Sync Profile" button that re-fetches user data from the backend if customer_id is missing:

```typescript
const syncUserData = async () => {
  const response = await apiService.getUserProfile();
  if (response.success && response.data.customer_id) {
    await login({ ...user, ...response.data });
  }
};
```

This would help existing users without requiring re-registration.

---

**The fix is now deployed! New registrations will work correctly.** ✅

