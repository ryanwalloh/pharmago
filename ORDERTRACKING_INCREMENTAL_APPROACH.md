# OrderTrackingScreen - Incremental Build-Up Approach

## ✅ Phase 1: Minimal Version (TESTED - WORKS!)
- Basic UI
- Simple state
- No imports
- **Result:** ✅ Navigation works, screen loads

---

## ✅ Phase 2: Real Data + API (CURRENT BUILD)

### Added Features:
1. ✅ `fontFamily` - Custom fonts
2. ✅ `Dimensions.get('window')` - Responsive layouts
3. ✅ `apiService` - **Lazy-loaded with getApiService()**
4. ✅ Real order fetching from backend
5. ✅ AsyncStorage - Order data persistence
6. ✅ Pull-to-refresh
7. ✅ Error handling
8. ✅ Loading states

### NOT Added Yet (Potential Crash Sources):
- ❌ MapView (react-native-maps) - Native module
- ❌ orderTrackingWS - WebSocket service
- ❌ Chat features
- ❌ Complex modals
- ❌ Rider tracking

### Key Implementation:

**Lazy ApiService:**
```typescript
// Don't import directly - use lazy loader
const getApiService = () => require('../services/api').apiService;

// Use in component
const apiService = getApiService();
const response = await apiService.getOrderStatus(id);
```

### Build Command:
```bash
git add .
git commit -m "Phase 2: Add real order fetching with lazy-loaded apiService"
git push
eas build --profile preview --platform android
```

### Expected Behavior:
- ✅ Navigate to order tracking
- ✅ Shows loading spinner
- ✅ Fetches REAL order data from backend
- ✅ Displays order number, status, pharmacy, delivery address
- ✅ Shows order total and breakdown
- ✅ Pull-to-refresh works
- ✅ Back button works

### Test This:
1. Place an order (prescription or cart)
2. Navigate to tracking
3. **Should show real order data** (not test data)
4. **Pull down to refresh** → Should reload data
5. **Click back** → Should return

**If this works → Proceed to Phase 3**  
**If this crashes → The issue is in apiService initialization (unlikely but possible)**

---

## 🔜 Phase 3: WebSocket Real-Time Updates (NEXT)

Will add:
- orderTrackingWS service
- Real-time order status updates
- WebSocket connection management

---

## 🔜 Phase 4: MapView Integration (MOST RISKY)

Will add:
- react-native-maps with proper lazy loading
- Rider location tracking
- Route polylines
- Map markers

---

## 🔜 Phase 5: Full Features (FINAL)

Will add:
- Chat functionality
- Senior discount approval
- Cancel order
- All modals and interactions

---

## Strategy

### Incremental Testing:
1. Test Phase 2 → If works, add Phase 3
2. Test Phase 3 → If works, add Phase 4
3. Test Phase 4 → If works, add Phase 5
4. **Stop at first crash** → Fix that specific feature

### Benefits:
- ✅ Know exactly what causes crash
- ✅ No guesswork
- ✅ Can fix specific issue
- ✅ Build robust solution

---

Created: November 2, 2025  
Current Phase: **Phase 2 - Real Data Fetching**  
Status: Ready for build and test

