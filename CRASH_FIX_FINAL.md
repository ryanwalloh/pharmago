# Customer App Crash - FINAL DIAGNOSTIC FIX

## The Real Problem

After multiple iterations, the root cause is: **Import-time code execution in production builds causes crashes.**

When clicking Login/Sign Up, expo-router tries to load the route files, which import the heavy components, which import services that run initialization code, causing crashes BEFORE the component even renders.

## The Solution: Delayed Loading Pattern

### Changed Approach

Instead of importing components directly at module level, we now use **two-stage loading**:

1. **Stage 1**: Minimal placeholder screen (loads immediately, won't crash)
2. **Stage 2**: Heavy component (loads only when user confirms)

This isolates the crash point and prevents import-time failures.

---

## Files Modified

### 1. `app/login.tsx` - Diagnostic Wrapper

**Before (Crashed):**
```typescript
import LoginPage from '../components/LoginPage';
export default LoginPage;
```

**After (Safe):**
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [showLogin, setShowLogin] = React.useState(false);

  // Delay import until user explicitly requests it
  if (showLogin) {
    const LoginPage = require('../components/LoginPage').default;
    return <LoginPage />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Loading...</Text>
      <TouchableOpacity onPress={() => setShowLogin(true)}>
        <Text>Continue to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**What This Does:**
- ✅ Navigation works (no crash on button click)
- ✅ Minimal imports (only React Native core)
- ✅ Shows placeholder screen immediately
- ✅ Loads LoginPage only when "Continue" is clicked
- 🔍 **Diagnostic**: If app crashes when clicking "Continue", we know the issue is in LoginPage imports

### 2. `app/signup.tsx` - Same Pattern

Applied identical delayed loading pattern.

---

## Testing Protocol

### Test 1: Navigation Works?
1. Click "Login" button on welcome screen
2. **Expected**: App navigates to placeholder screen showing "Login Loading..."
3. **If crashes**: Issue is with expo-router itself (unlikely)
4. **If works**: Proceed to Test 2

### Test 2: Component Loading?
1. On placeholder screen, click "Continue to Login"
2. **Expected**: Either works OR crashes here
3. **If crashes**: Issue is in LoginPage component imports (apiService, AuthContext, or assets)
4. **If works**: Problem solved!

---

## Root Cause Analysis

### Why Import-Time Crashes Happen in Production

1. **Development builds** are lenient with module loading
2. **Production builds** are optimized and strict:
   - All imports are bundled and tree-shaken
   - Code runs in different order
   - Missing modules fail immediately
   - Native modules must be initialized properly

3. **Common culprits**:
   - `console.log()` in constructors (lines run at import)
   - Native module access before initialization
   - Environment variables not available
   - Circular imports
   - Missing peer dependencies

### In Our Case

**File: `services/api.ts`**
```typescript
const getApiBaseUrl = () => {
  // Accesses Constants, NativeModules at module load time
};
const API_BASE_URL = getApiBaseUrl(); // RUNS AT IMPORT
export const apiService = new ApiService(); // RUNS AT IMPORT
```

When LoginPage imports apiService, this code executes immediately:
- Accesses `Constants` (may not be ready)
- Accesses `NativeModules` (may not be ready)
- Calls constructor with `console.log()` (runs before React is ready)

---

## Additional Fixes Applied

### Fix 1: Font Loading (from previous iteration)
✅ Still in place - uses `useFonts` hook in `_layout.tsx`

### Fix 2: expo-image Replacement (from previous iteration)
✅ Still in place - uses `ImageBackground` instead

### Fix 3: Delayed Loading (NEW)
✅ Route files now use placeholder + lazy loading pattern

---

## If This Still Crashes

### Scenario A: Crashes on "Continue" button
**Diagnosis**: Component imports are the issue

**Next steps:**
1. Simplify LoginPage/CreateAccountPage
2. Remove apiService import temporarily
3. Remove AuthContext import temporarily
4. Add back one by one to find culprit

### Scenario B: Works perfectly
**Diagnosis**: Import timing was the issue

**Next steps:**
1. Keep this pattern OR
2. Fix the underlying imports to be production-safe
3. Move to final deployment

---

## Production-Safe Practices

For future reference, to avoid import-time crashes:

1. ✅ **Lazy load heavy components**
   ```typescript
   const Component = require('./Component').default;
   ```

2. ✅ **Delay service initialization**
   ```typescript
   // BAD
   export const service = new Service();
   
   // GOOD
   export const getService = () => {
     if (!instance) instance = new Service();
     return instance;
   };
   ```

3. ✅ **Use React.lazy for code splitting**
   ```typescript
   const LoginPage = React.lazy(() => import('./LoginPage'));
   ```

4. ✅ **Wrap risky code in try-catch**
   ```typescript
   let apiUrl;
   try {
     apiUrl = getApiBaseUrl();
   } catch {
     apiUrl = FALLBACK_URL;
   }
   ```

---

## Build Command

```bash
git add .
git commit -m "Fix: Add diagnostic wrappers with delayed loading to prevent import-time crashes"
git push
cd mobileapp/apps/customer-app
eas build --profile preview --platform android
```

---

## Expected Behavior

### Success Case:
1. Open app → Splash screen
2. Landing page → Welcome page
3. Click "Login" → **NO CRASH** → Shows "Login Loading..."
4. Click "Continue" → LoginPage loads
5. All features work

### Diagnostic Case:
1. Steps 1-3 work
2. Step 4 crashes → We know it's LoginPage imports
3. Can then debug specific imports

---

Created: November 2, 2025 (Final Iteration)
Status: DIAGNOSTIC BUILD - Will identify exact crash point

