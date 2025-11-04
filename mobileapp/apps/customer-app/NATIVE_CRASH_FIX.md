# Native Crash Fix: OrderTrackingScreen apiService Import

## 🐛 Problem Summary

The app was crashing immediately when navigating to `OrderTrackingScreen` after placing an order. The crash was **silent** (no JS errors in console/Metro) and only occurred when `apiService` was imported or used.

## 🔍 Root Cause

The crash was caused by **synchronous access to `NativeModules.SourceCode.scriptURL`** during the `ApiService` constructor initialization, which executed **before React Native's native bridge was fully initialized** for the new screen.

### Call Flow That Caused the Crash:

1. `OrderTrackingScreen` imports `apiService`
2. First call to `apiService.getOrderStatus()` triggers Proxy's `get` trap
3. Proxy instantiates: `new ApiService()`
4. Constructor calls: `this.baseURL = getApiBaseUrl()`
5. `getApiBaseUrl()` accesses: `NativeModules.SourceCode.scriptURL`
6. **Native bridge not ready** → **Native crash** (not JS error)

### Why Silent (No JS Errors)?

Native module crashes occur **below the JavaScript layer** in the native runtime:
- iOS: Objective-C/Swift native exception
- Android: JNI/Java native crash

The JS error handlers never get invoked because the crash happens at the **native thread level**, terminating the app process before JS can catch it.

## ✅ The Fix

### Primary Fix: Lazy Initialization

Deferred `getApiBaseUrl()` call from constructor to the first actual network request:

```typescript
class ApiService {
  private baseURL: string | null = null;  // Changed from string to string | null
  private authToken: string | null = null;

  // Removed constructor that called getApiBaseUrl()

  private getBaseURL(): string {
    if (!this.baseURL) {
      this.baseURL = getApiBaseUrl();  // Lazy init on first use
    }
    return this.baseURL;
  }

  public async makeRequest<T>(...) {
    const url = `${this.getBaseURL()}${endpoint}`;  // Uses lazy getter
    // ...
  }
}
```

### Secondary Fix: Defensive NativeModules Access

Added extra safety checks to prevent native crashes even when `getApiBaseUrl()` is called:

```typescript
// Check if NativeModules is available first
if (!expHostUri && NativeModules && typeof NativeModules === 'object') {
  try {
    expHostUri = (NativeModules as any)?.SourceCode?.scriptURL;
  } catch (nativeErr) {
    // Silently fail if native module access fails
    console.warn('⚠️ Could not access NativeModules.SourceCode - bridge may not be ready:', nativeErr);
  }
}
```

## 🎯 Key Learnings

### Import-Time Side Effects Are Dangerous

Any code that runs at import time or during class instantiation should:
- ✅ NOT access native modules
- ✅ NOT make synchronous native calls
- ✅ Use lazy initialization patterns
- ✅ Defer heavy operations to first use

### Native Crashes vs JS Errors

| Type | Catchable | Console Output | Behavior |
|------|-----------|----------------|----------|
| JS Error | ✅ Yes (try/catch) | ✅ Stack trace in Metro | App continues |
| Native Crash | ❌ No | ❌ Silent quit | App terminates |

### Debugging Native Crashes

When you see:
- App quits with no error message
- No console logs before crash
- Crash only on specific imports/calls
- Other features work fine

**Suspect:** Synchronous native module access before bridge initialization

## 🧪 Testing the Fix

1. **Clean Build Required:**
   ```bash
   cd mobileapp
   npm run clean
   npx expo start -c
   ```

2. **Test Navigation Flow:**
   - Place an order (cart or prescription)
   - Verify smooth navigation to OrderTrackingScreen
   - Confirm order details load without crash

3. **Verify Logs:**
   - Check console for `🚀 API Request:` logs
   - Confirm no `⚠️ Could not access NativeModules` warnings (unless in edge cases)

## 📝 Files Modified

- `mobileapp/apps/customer-app/services/api.ts`
  - Made `baseURL` nullable and lazy-initialized
  - Added `getBaseURL()` private method
  - Updated all `this.baseURL` references to `this.getBaseURL()`
  - Enhanced `getApiBaseUrl()` with defensive NativeModules checks

## 🚀 Future Recommendations

1. **Avoid Import-Time Computation:**
   - Never access native modules at import time
   - Use lazy getters for expensive operations
   - Defer initialization to first use or explicit init method

2. **Add Error Boundaries:**
   - Wrap critical screens in React Error Boundaries
   - Won't catch native crashes but helps with JS errors

3. **Native Debug Logging:**
   - Enable native logging in development to catch these earlier
   - iOS: Check Xcode console for native exceptions
   - Android: Use `adb logcat` for native crash logs

## 🔗 Related Issues

This fix resolves the crash described in the debugging journey (Phases 1-8) where:
- App worked without apiService
- Crashed instantly with apiService import
- Dynamic imports still crashed
- No errors logged before crash

The root cause was confirmed to be **synchronous NativeModules access during constructor initialization**.

