# Order Tracking Crash Fix

## Issue
App crashes when navigating to order tracking screen after placing an order (both prescription and cart orders).

## Root Cause
Same pattern as the login crash: `orderTrackingWS` service was being instantiated at import time with `console.log()` in constructor.

### File: `services/orderTrackingWebSocket.ts`

**Line 18 (constructor):**
```typescript
constructor() {
  console.log('🔌 OrderTrackingWebSocket service initialized'); // ❌ CRASHES
}
```

**Line 213 (module-level instantiation):**
```typescript
export const orderTrackingWS = new OrderTrackingWebSocketService(); // ❌ RUNS AT IMPORT
```

## The Fix

### 1. Removed console.log from constructor
```typescript
constructor() {
  // Removed console.log to prevent import-time crashes in production builds
}
```

### 2. Applied lazy loading with Proxy pattern
```typescript
// Lazy singleton - only create instance when first accessed
let orderTrackingWSInstance: OrderTrackingWebSocketService | null = null;

export const orderTrackingWS = new Proxy({} as OrderTrackingWebSocketService, {
  get(target, prop) {
    if (!orderTrackingWSInstance) {
      orderTrackingWSInstance = new OrderTrackingWebSocketService();
    }
    const value = (orderTrackingWSInstance as any)[prop];
    return typeof value === 'function' ? value.bind(orderTrackingWSInstance) : value;
  }
});
```

## Files Modified

- ✅ `services/orderTrackingWebSocket.ts` - Removed console.log and added lazy initialization

## Navigation Flow

**Prescription Order:**
1. AddressSelectionScreen → Place Order
2. Success modal → Click "Track Order"
3. Navigate to `/order-tracking/${orderId}` ✅ (should work now)

**Cart Order:**
1. CheckoutScreen → Place Order
2. Navigate to `/order-tracking/${orderId}` ✅ (should work now)

## Build Command

```bash
git add .
git commit -m "Fix: Lazy initialization of orderTrackingWS service"
git push
eas build --profile preview --platform android
```

## Expected Behavior

After this fix:
- ✅ Login/Signup works
- ✅ Order placement works  
- ✅ Order tracking screen loads
- ✅ WebSocket connection for real-time updates
- ✅ Full app functionality restored

## Pattern Applied

This is the third service we've fixed with the same pattern:
1. ✅ `apiService` - Fixed with lazy Proxy
2. ✅ `orderTrackingWS` - Fixed with lazy Proxy
3. ✅ Future services should follow this pattern

---

Created: November 2, 2025
Status: Ready for build and test

