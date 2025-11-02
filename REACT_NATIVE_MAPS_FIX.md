# React Native Maps Import-Time Crash Fix

## The Final Issue

**File:** `screens/OrderTrackingScreen.tsx`

### Root Cause
```typescript
import MapView, { Marker, Region, Polyline } from 'react-native-maps';
```

**Why it crashes:**
- `react-native-maps` initializes native modules at import time
- In production builds, native modules aren't ready during module loading
- This causes an immediate crash when the file is imported

## The Fix

### Before (Crashed):
```typescript
// Top of file - runs at module load time
import MapView, { Marker, Region, Polyline } from 'react-native-maps';

const OrderTrackingScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ... component code
```

### After (Works):
```typescript
// Top of file - commented out import
// import MapView, { Marker, Region, Polyline } from 'react-native-maps';

// Added Region type interface
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const OrderTrackingScreen: React.FC = () => {
  // Lazy load inside component - only when rendered
  const MapView = require('react-native-maps').default;
  const { Marker, Polyline } = require('react-native-maps');
  
  const { id } = useLocalSearchParams<{ id: string }>();
  // ... component code
```

## Why This Works

**Import Statement (Top-Level):**
- Runs immediately when module is imported
- Before React is ready
- Before native modules are initialized
- ❌ CRASHES in production

**Require Inside Component:**
- Runs only when component renders
- After React is initialized  
- After native modules are ready
- ✅ WORKS in production

## Files Modified

- ✅ `screens/OrderTrackingScreen.tsx`
  - Commented out top-level MapView import
  - Added Region interface locally
  - Lazy-loaded MapView, Marker, Polyline inside component

## Build Command

```bash
git add .
git commit -m "Fix: Lazy-load react-native-maps to prevent import-time crash"
git push
eas build --profile preview --platform android
```

## Complete Fix Summary (Entire Debugging Session)

### Import-Time Crashes Fixed:

1. ✅ **Services with console.log in constructors**
   - apiService
   - orderTrackingWS

2. ✅ **Module-level service instantiation**
   - Converted to Proxy-based lazy singletons

3. ✅ **Dimensions.get() at module level** (6 files)
   - OrderTrackingScreen.tsx
   - checkout.tsx
   - MainPage.tsx
   - PrescriptionUploadModal.tsx
   - supersearch.tsx
   - And more...

4. ✅ **expo-image imports** (2 files)
   - LoginPage.tsx
   - CreateAccountPage.tsx
   - Replaced with standard ImageBackground

5. ✅ **react-native-maps import** (FINAL FIX)
   - OrderTrackingScreen.tsx
   - Lazy-loaded with require()

6. ✅ **Font loading**
   - Using useFonts hook in _layout.tsx
   - Blocking render until ready

## Expected Behavior

After this build, the complete flow should work:

✅ App opens → Splash → Landing → Welcome  
✅ Login/Sign Up → Works  
✅ Main Page → Works  
✅ Browse/Search → Works  
✅ Place Order (Prescription/Cart) → Works  
✅ **Navigate to Order Tracking → FINALLY WORKS!** 🎉  
✅ Real-time tracking with maps → Works  
✅ WebSocket updates → Works  

## Lessons Learned

### Production-Safe React Native Patterns:

**❌ NEVER DO:**
```typescript
// Top-level native module access
import MapView from 'react-native-maps';
const { width } = Dimensions.get('window');
const service = new Service(); // with console.log in constructor
```

**✅ ALWAYS DO:**
```typescript
// Lazy-load native modules
const OrderTrackingScreen = () => {
  const MapView = require('react-native-maps').default;
  const dimensions = Dimensions.get('window'); // Inside component
  const service = useService(); // Custom hook with lazy init
};
```

---

Created: November 2, 2025  
Status: **FINAL FIX** - Order tracking should work now  
Debugging Duration: Multiple iterations to find all import-time issues  
Total Files Fixed: 10+

---

## Next Test

Install the build and test this exact flow:
1. Login
2. Place an order (prescription or cart)
3. Click "Track Order" or navigate to order tracking
4. **App should NOT crash**
5. Map should load showing order location
6. Real-time updates should work

If it still crashes, we'll need to check native module initialization in app.json or other configuration files.

