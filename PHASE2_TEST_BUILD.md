# Phase 2: OrderTrackingScreen with Real Data

## What's in This Build

### ✅ Features Added (from Phase 1):
1. **Custom Fonts** - fontFamily from utils/fonts
2. **Responsive Layout** - Dimensions.get() for SCREEN_WIDTH
3. **Real Order Fetching** - apiService.getOrderStatus() (lazy-loaded)
4. **AsyncStorage** - Persistent order data
5. **Pull-to-Refresh** - Reload order data
6. **Error Handling** - Network errors, invalid IDs
7. **Loading States** - Proper UX feedback

### ❌ Still NOT Added (Next Phases):
- MapView / react-native-maps (Phase 4)
- orderTrackingWS / Real-time updates (Phase 3)
- Chat features (Phase 5)
- Modals and complex interactions (Phase 5)

## Key Safety Features

### 1. Lazy-Loaded apiService
```typescript
const getApiService = () => require('../services/api').apiService;
```
- Only loads when called
- Not at import time
- Prevents initialization crashes

### 2. Two-Layer Protection
**Layer 1:** Route wrapper (`[id].tsx`) with 100ms delay  
**Layer 2:** Lazy apiService loading in component

### 3. Robust Error Handling
- Network errors caught
- Invalid order IDs handled
- Retry functionality
- Home button fallback

## Build Command

```bash
git add .
git commit -m "Phase 2: Real order fetching with lazy-loaded apiService"
git push
eas build --profile preview --platform android
```

## Testing Checklist

### Test 1: Navigation
- [ ] Place an order (prescription or cart)
- [ ] Click "Track Order" button
- [ ] **Expected:** Loading spinner (100ms)
- [ ] **Expected:** Order tracking screen loads

### Test 2: Real Data Display
- [ ] **Expected:** Shows REAL order number (e.g., ORD20251102...)
- [ ] **Expected:** Shows actual order status
- [ ] **Expected:** Shows actual pharmacy name
- [ ] **Expected:** Shows actual delivery address
- [ ] **Expected:** Shows actual total amount

### Test 3: Interactions
- [ ] Pull down to refresh
- [ ] **Expected:** Reloads order data
- [ ] Click back button
- [ ] **Expected:** Returns to previous screen

### Test 4: Error Handling
- [ ] Try navigating with invalid order ID
- [ ] **Expected:** Shows error screen with retry button

## Expected Result

**If Phase 2 Works:**
✅ All basic order tracking functionality works  
✅ Real data from backend displays correctly  
✅ No crashes  
**Next:** Add Phase 3 (WebSocket) and Phase 4 (MapView)

**If Phase 2 Crashes:**
❌ Issue is in:
- apiService initialization (unlikely - we fixed this)
- AsyncStorage access (unlikely - works elsewhere)
- Dimensions.get() (possible - but should work with 100ms delay)
- fontFamily (unlikely - works elsewhere)

**Report:** Exactly when it crashes (during loading? after data loads? etc.)

## UI Preview (What You'll See)

```
┌─────────────────────────────┐
│  ← Back   Order Tracking    │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │ ORD20251102151624   │   │
│  │ Nov 2, 2025, 3:16PM │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Order Status        │   │
│  │ [PENDING]           │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Pharmacy            │   │
│  │ Mercury Drugs       │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Delivery Address    │   │
│  │ 123 Main St...      │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Order Summary       │   │
│  │ Subtotal:    ₱450   │   │
│  │ Delivery:     ₱39   │   │
│  │ Total:       ₱489   │   │
│  └─────────────────────┘   │
│                             │
│  [Step 1 Complete note]    │
└─────────────────────────────┘
```

Clean, functional, and shows real data!

---

Created: November 2, 2025  
Phase: 2 of 5  
Confidence: HIGH - Minimal imports, proven patterns

