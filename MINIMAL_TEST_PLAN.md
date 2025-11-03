# OrderTrackingScreen - Minimal Test Strategy

## Current Status
OrderTrackingScreen.tsx crashes during navigation despite all previous fixes.

## New Approach: Minimal Build-Up

### Step 1: MINIMAL VERSION (Current)

**What's in it:**
- ✅ Basic React imports only
- ✅ SafeAreaView
- ✅ Simple state (order data, loading)
- ✅ Basic UI (back button, order info display)
- ✅ NO MapView
- ✅ NO apiService calls
- ✅ NO orderTrackingWS
- ✅ NO Dimensions.get()
- ✅ NO fontFamily
- ✅ NO complex imports

**File backed up:** `OrderTrackingScreen.FULL.tsx`

### Expected Result
**If minimal version works:**
- ✅ App navigates to order tracking
- ✅ Shows "Order Tracking (Test)" screen
- ✅ Displays order ID
- ✅ Shows test order data
- ✅ Back button works

**This proves:** Navigation and route loading work fine.

**If minimal version crashes:**
- ❌ Issue is with expo-router or _layout.tsx
- ❌ Issue is with the route file itself
- Need to investigate router configuration

---

## Step 2: Add Features Back ONE BY ONE

### Test Order (Add and test after each):

1. **Add fontFamily import**
   - Test: Does it crash with fonts?

2. **Add Dimensions.get() for responsive styles**
   - Test: Does it crash with dimensions?

3. **Add apiService + real order fetching**
   - Test: Does it crash with API calls?

4. **Add AsyncStorage**
   - Test: Does it crash with storage?

5. **Add orderTrackingWS**
   - Test: Does it crash with WebSocket?

6. **Add react-native-maps (MapView)**
   - Test: Does it crash with maps? ← Most likely culprit

7. **Add full UI components**
   - Add all modals, chat, etc.

---

## Build Command

```bash
git add .
git commit -m "Test: Minimal OrderTrackingScreen to isolate crash point"
git push
eas build --profile preview --platform android
```

---

## Testing Instructions

### After installing the build:

1. **Place an order** (prescription or cart)
2. **Click "Track Order"** or navigate to tracking
3. **Watch for:**
   - Loading spinner for 100ms (from route wrapper)
   - Then "Order Tracking (Test)" screen
   
**Success Case:**
- ✅ Screen loads showing order info
- ✅ Displays test data
- ✅ Back button works

**Report back:** 
- What you see
- If it crashes, at what point
- If it works, we proceed to add features

---

## Why This Will Work

**Minimal version has:**
- Zero heavy imports
- Zero native modules (except SafeAreaView which we know works)
- Zero service calls
- Zero complex state
- Zero dimensions calculations

**If this crashes, we know:**
- The issue is NOT in OrderTrackingScreen code
- The issue is in expo-router configuration
- OR the route file itself has problems

**If this works, we know:**
- Navigation is fine
- We can safely add features back
- We'll find the EXACT import causing the crash

---

## Files Modified

1. ✅ `screens/OrderTrackingScreen.tsx` - Minimal test version
2. ✅ `screens/OrderTrackingScreen.FULL.tsx` - Full version backup
3. ✅ `app/order-tracking/[id].tsx` - Route wrapper (already has delay)

---

## Next Steps After Testing

### If Minimal Works:
1. Add fontFamily → Build → Test
2. Add Dimensions → Build → Test  
3. Add apiService → Build → Test
4. Continue until we find what crashes

### If Minimal Crashes:
1. Check expo-router configuration
2. Check _layout.tsx for issues
3. Check app.json for route-specific settings
4. May need to restructure routing

---

Created: November 2, 2025
Strategy: Systematic elimination with minimal baseline

