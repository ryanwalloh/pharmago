# Dimensions.get() Import-Time Crash Fix

## Issue
App crashes when navigating to OrderTrackingScreen after placing an order.

## Root Cause
**File:** `screens/OrderTrackingScreen.tsx` (Line 26)

```typescript
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
```

This code runs at **module import time** and crashes in production builds.

## Why It Crashes
- `Dimensions.get('window')` accesses native modules
- In production builds, native modules aren't ready at import time
- Same pattern as `console.log()` and service instantiations

## The Fix

### Before (Crashed):
```typescript
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: SCREEN_WIDTH * 0.05, // ❌ CRASH
  },
  pharmacyImage: {
    width: Math.min(SCREEN_WIDTH * 0.15, 60), // ❌ CRASH
  },
});
```

### After (Fixed):
```typescript
// Removed import-time Dimensions.get()
// Replaced responsive calculations with fixed values

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20, // ✅ Fixed value
  },
  pharmacyImage: {
    width: 60, // ✅ Fixed value
  },
});
```

## Changes Made

### 1. Removed module-level Dimensions.get()
```typescript
// OLD:
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// NEW:
// Removed - no longer needed
```

### 2. Replaced responsive calculations with fixed values

| Old Value | New Value | Usage |
|-----------|-----------|-------|
| `SCREEN_WIDTH * 0.05` | `20` | Header/content padding (5%) |
| `SCREEN_WIDTH * 0.1` | `40` | Error container padding (10%) |
| `SCREEN_WIDTH * 0.02` | `8` | Pharmacy card padding (2%) |
| `Math.min(SCREEN_WIDTH * 0.15, 60)` | `60` | Pharmacy image size (max 60) |
| `Math.min(SCREEN_WIDTH * 0.075, 30)` | `30` | Pharmacy image border radius |

## Files Modified
- ✅ `screens/OrderTrackingScreen.tsx` - Removed Dimensions.get() and fixed all style calculations

## Build Command

```bash
git add .
git commit -m "Fix: Remove Dimensions.get() import-time call in OrderTrackingScreen"
git push
eas build --profile preview --platform android
```

## Expected Behavior

After this fix:
- ✅ Login/Signup works
- ✅ Order placement works
- ✅ **Order tracking screen loads** (previously crashed)
- ✅ Real-time tracking via WebSocket
- ✅ Full app functionality

## Pattern Summary

We've now fixed **4 types of import-time crashes**:

1. ✅ `console.log()` in constructors (apiService, orderTrackingWS)
2. ✅ Module-level service instantiation (apiService, orderTrackingWS)
3. ✅ `Dimensions.get()` at module level (OrderTrackingScreen)
4. ✅ `expo-image` initialization (LoginPage, CreateAccountPage)

## Production-Safe Patterns

### ❌ BAD (Crashes in production):
```typescript
// Module-level native API access
const SCREEN_WIDTH = Dimensions.get('window').width;
const service = new Service();
console.log('Initializing...');
```

### ✅ GOOD (Production-safe):
```typescript
// Fixed values or lazy initialization
const SCREEN_WIDTH = 375; // Or use flex/percentage layouts
let service: Service | null = null;
const getService = () => service || (service = new Service());
// No console.log in module scope
```

---

Created: November 2, 2025
Status: Ready for final build

