# Smart Dispatch System - Step-by-Step Implementation Plan

## 📋 Overview

Implementation of the **Enhanced Smart Dispatch System with Dynamic Batching on Rejection**.

**Estimated Timeline:** 7-10 days  
**Approach:** Phased implementation with testing at each step

---

## 🎯 Complete Feature Set

### What We're Building:
1. ✅ Online/offline rider status
2. ✅ Automatic order dispatch to riders
3. ✅ 30-second timer with Accept/Reject
4. ✅ **Dynamic batching check on each rejection**
5. ✅ Proximity-based rider selection
6. ✅ Full-screen dispatch modal in rider app
7. ✅ Fallback to manual browsing
8. ✅ Race condition prevention
9. ✅ WebSocket real-time updates

---

## 📝 Implementation Steps

### **STEP 1: Database Foundation - Rider Status Fields**

**Duration:** 1-2 hours  
**Complexity:** ⭐ Low  
**Risk:** Low (additive changes only)

#### What to Do:
1. Add new fields to `Rider` model:
   - `activity_status` (online/offline/busy/break)
   - `current_latitude` (rider's current location)
   - `current_longitude` (rider's current location)
   - `last_seen_at` (last activity timestamp)
   - `acceptance_rate` (% of offers accepted)
   - `total_offers_received` (counter)
   - `total_offers_accepted` (counter)
   - `total_offers_rejected` (counter)
   - `total_offers_timeout` (counter)
   - `average_response_time` (in seconds)

2. Create migration file
3. Apply migration to database

#### Files to Modify:
- `backend/api/users/models.py` (Rider model)
- Generate migration: `python manage.py makemigrations`
- Apply: `python manage.py migrate`

#### Testing:
- ✅ Migration runs without errors
- ✅ Existing rider data preserved
- ✅ New fields have proper defaults
- ✅ Can query riders by activity_status

#### Acceptance Criteria:
- [x] Migration created successfully
- [x] Migration applied without errors
- [x] Can set rider.activity_status = 'online'
- [x] Can query: `Rider.objects.filter(activity_status='online')`

**READY TO PROCEED WITH STEP 1?**

---

### **STEP 2: Dispatch Models - DispatchOffer & DispatchQueue**

**Duration:** 2-3 hours  
**Complexity:** ⭐⭐ Medium  
**Risk:** Low (new models, no changes to existing)

#### What to Do:
1. Create `DispatchOffer` model:
   - Tracks each offer sent to a rider
   - Status: pending/accepted/rejected/timeout
   - Response time tracking
   - Links to Order or RiderAssignment (for batches)

2. Create `DispatchQueue` model:
   - Manages the dispatch process for each order
   - Tracks current offer
   - Counts attempts
   - Handles retry logic

3. Create migrations
4. Apply migrations

#### Files to Create/Modify:
- `backend/api/delivery/models.py` (add DispatchOffer, DispatchQueue)
- Generate migration: `python manage.py makemigrations`
- Apply: `python manage.py migrate`

#### Testing:
- ✅ Models created without errors
- ✅ Can create DispatchOffer instance
- ✅ Can create DispatchQueue instance
- ✅ Foreign key relationships work

#### Acceptance Criteria:
- [x] DispatchOffer model created
- [x] DispatchQueue model created
- [x] Migrations applied successfully
- [x] Django admin shows new models

**READY TO PROCEED WITH STEP 2?**

---

### **STEP 3: Dispatch Service - Core Logic**

**Duration:** 4-6 hours  
**Complexity:** ⭐⭐⭐ High  
**Risk:** Medium (new business logic)

#### What to Do:
1. Create `DispatchService` class in `backend/api/delivery/dispatch_service.py`
2. Implement core methods:
   - `dispatch_order(order)` - Main entry point
   - `find_eligible_riders(order)` - Get online riders, sorted by priority
   - `calculate_rider_priority(rider, order)` - Proximity + acceptance rate
   - `create_dispatch_offer(rider, order)` - Create and send offer
   - `check_for_batchable_orders(order)` - **Your dynamic batching idea!**
   - `handle_rider_response(offer_id, accepted)` - Process accept/reject
   - `handle_offer_timeout(offer_id)` - Handle timeouts
   - `offer_to_next_rider(queue)` - Move to next rider

3. Implement **dynamic batching on rejection**:
   ```python
   def offer_to_next_rider(queue):
       # Your idea: Check for batching before next offer
       compatible_orders = check_for_batchable_orders(queue.order)
       
       if len(compatible_orders) > 1:
           # Batch found! Offer batch to next rider
           offer_batch_to_rider(compatible_orders, next_rider)
       else:
           # No batch → Offer single to next rider
           offer_single_to_rider(queue.order, next_rider)
   ```

#### Files to Create:
- `backend/api/delivery/dispatch_service.py` (NEW)

#### Testing:
- ✅ Can dispatch single order
- ✅ Rider priority calculation works
- ✅ Dynamic batching check works
- ✅ Handles rejection flow
- ✅ Prevents double-assignment (race condition)

#### Acceptance Criteria:
- [x] DispatchService class created
- [x] Can call `DispatchService.dispatch_order(order)`
- [x] Dynamic batching works on rejection
- [x] Rider selection algorithm functional
- [x] Unit tests pass

**READY TO PROCEED WITH STEP 3?**

---

### **STEP 4: Backend Endpoints - API for Rider Responses**

**Duration:** 2-3 hours  
**Complexity:** ⭐⭐ Medium  
**Risk:** Low (standard REST endpoints)

#### What to Do:
1. Create endpoints in `backend/api/delivery/rider_endpoints.py`:
   - `POST /api/rider/accept-offer/` - Rider accepts offer
   - `POST /api/rider/reject-offer/` - Rider rejects offer
   - `POST /api/rider/update-status/` - Update online/offline
   - `POST /api/rider/update-location/` - Update rider location
   - `GET /api/rider/current-offer/` - Get active offer for rider

2. Add URL routes

#### Files to Modify:
- `backend/api/delivery/rider_endpoints.py` (add new endpoints)
- `backend/api/users/urls_direct.py` (add routes)

#### Testing:
- ✅ Can accept offer via API
- ✅ Can reject offer via API
- ✅ Can update rider status
- ✅ Race condition handled (atomic operations)
- ✅ Proper error responses

#### Acceptance Criteria:
- [x] All endpoints created
- [x] Routes configured
- [x] Can test with Postman/curl
- [x] Error handling works
- [x] Logging in place

**READY TO PROCEED WITH STEP 4?**

---

### **STEP 5: Signal Trigger - Auto-Dispatch on Order Acceptance**

**Duration:** 1-2 hours  
**Complexity:** ⭐⭐ Medium  
**Risk:** Medium (affects order flow)

#### What to Do:
1. Create Django signal in `backend/api/orders/signals.py`
2. Trigger dispatch when order status → 'accepted'
3. Handle edge cases (already assigned, no riders, etc.)

```python
@receiver(post_save, sender=Order)
def auto_dispatch_on_acceptance(sender, instance, created, **kwargs):
    """
    Auto-dispatch order when status changes to 'accepted'.
    """
    if instance.order_status == 'accepted':
        if not instance.is_assigned_to_rider():
            # Trigger dispatch
            from api.delivery.dispatch_service import DispatchService
            DispatchService.dispatch_order(instance)
```

#### Files to Create/Modify:
- `backend/api/orders/signals.py` (NEW)
- `backend/api/orders/apps.py` (register signals)

#### Testing:
- ✅ Signal fires when order accepted
- ✅ Dispatch triggered automatically
- ✅ Doesn't dispatch if already assigned
- ✅ Doesn't break existing order flow

#### Acceptance Criteria:
- [x] Signal registered correctly
- [x] Dispatch triggers on acceptance
- [x] No duplicate dispatches
- [x] Existing functionality unaffected

**READY TO PROCEED WITH STEP 5?**

---

### **STEP 6: WebSocket Events - Real-Time Offer Delivery**

**Duration:** 3-4 hours  
**Complexity:** ⭐⭐⭐ High  
**Risk:** Medium (requires WebSocket setup)

#### What to Do:
1. Create WebSocket consumer for dispatch offers
2. Send offers to specific rider via WebSocket
3. Handle offer expiration
4. Send cancellation if another rider accepts

```python
# backend/api/delivery/consumers.py

class DispatchConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.rider_id = self.scope['url_route']['kwargs']['rider_id']
        self.room_group_name = f'rider_dispatch_{self.rider_id}'
        # Join rider's personal dispatch channel
        
    async def dispatch_offer(self, event):
        # Send offer to rider
        await self.send(text_data=json.dumps({
            'type': 'dispatch_offer',
            'offer': event['offer_data']
        }))
    
    async def offer_cancelled(self, event):
        # Cancel offer (another rider accepted)
        await self.send(text_data=json.dumps({
            'type': 'offer_cancelled',
            'offer_id': event['offer_id']
        }))
```

#### Files to Create/Modify:
- `backend/api/delivery/consumers.py` (NEW)
- `backend/api/delivery/routing.py` (WebSocket routing)
- `backend/pharmago/asgi.py` (register consumers)

#### Testing:
- ✅ WebSocket connection established
- ✅ Offer sent to correct rider
- ✅ Multiple riders don't receive same offer
- ✅ Cancellation works

#### Acceptance Criteria:
- [x] WebSocket consumer created
- [x] Can send offers to specific rider
- [x] Rider receives offer in real-time
- [x] Cancellation works properly

**READY TO PROCEED WITH STEP 6?**

---

### **STEP 7: Rider App UI - Dispatch Modal**

**Duration:** 4-5 hours  
**Complexity:** ⭐⭐⭐ High  
**Risk:** Low (frontend only)

#### What to Do:
1. Create dispatch modal component
2. Add WebSocket listener for offers
3. Implement countdown timer (30s)
4. Add Accept/Reject handlers
5. Add vibration/sound notification
6. Handle offer cancellation

#### Component Structure:
```typescript
<DispatchOfferModal>
  <OfferHeader>
    🚨 NEW DELIVERY OFFER!
  </OfferHeader>
  
  <CountdownTimer>
    ⏱️ 00:28
  </CountdownTimer>
  
  <EarningsDisplay>
    💰 YOUR EARNINGS: ₱39.20
  </EarningsDisplay>
  
  <OrderDetails>
    📦 1 Order / 3.2 km from you
    🏪 Pickup: PharmaCare Plus
    📍 Deliver: Juan Dela Cruz
  </OrderDetails>
  
  <ActionButtons>
    [ ✓ ACCEPT ] [ ✗ REJECT ]
  </ActionButtons>
</DispatchOfferModal>
```

#### Files to Create/Modify:
- `mobileapp/apps/rider-app/components/DispatchOfferModal.tsx` (NEW)
- `mobileapp/apps/rider-app/app/home/index.tsx` (add WebSocket listener)
- `mobileapp/apps/rider-app/services/dispatchService.ts` (NEW)

#### Testing:
- ✅ Modal appears when offer received
- ✅ Countdown timer works
- ✅ Accept button works
- ✅ Reject button works
- ✅ Auto-dismisses on timeout
- ✅ Cancels properly if another rider accepts

#### Acceptance Criteria:
- [x] Modal displays correctly
- [x] Timer counts down properly
- [x] Accept/Reject sends API request
- [x] WebSocket integration works
- [x] Vibration/sound plays

**READY TO PROCEED WITH STEP 7?**

---

### **STEP 8: Online/Offline Toggle - Home Screen**

**Duration:** 1-2 hours  
**Complexity:** ⭐ Low  
**Risk:** Low (UI enhancement)

#### What to Do:
1. Update existing toggle in rider home screen
2. Connect to activity_status API
3. Persist status across sessions
4. Update status on app close/background

#### Enhancement:
```typescript
// Current: Simple UI toggle
const [isOnline, setIsOnline] = useState(true);

// New: Connected to backend
const updateStatus = async (status: 'online' | 'offline') => {
  await apiService.updateRiderStatus(status);
  setActivityStatus(status);
  
  if (status === 'online') {
    startLocationUpdates();  // Send location every 30s
    connectWebSocket();      // Listen for offers
  } else {
    stopLocationUpdates();
    disconnectWebSocket();
  }
};
```

#### Files to Modify:
- `mobileapp/apps/rider-app/app/home/index.tsx` (update toggle logic)
- `mobileapp/apps/customer-app/services/api.ts` (add status update method)

#### Testing:
- ✅ Toggle updates backend
- ✅ Status persists on app restart
- ✅ Location updates start/stop
- ✅ WebSocket connects/disconnects

#### Acceptance Criteria:
- [x] Toggle updates activity_status
- [x] Backend reflects status change
- [x] Rider can't receive offers when offline
- [x] Status persists across sessions

**READY TO PROCEED WITH STEP 8?**

---

### **STEP 9: Location Updates - Real-Time Rider Tracking**

**Duration:** 2-3 hours  
**Complexity:** ⭐⭐ Medium  
**Risk:** Low (background service)

#### What to Do:
1. Create location update service in rider app
2. Send location to backend every 30 seconds (when online)
3. Update rider's `current_latitude` and `current_longitude`
4. Use for proximity-based dispatch

```typescript
// Location update service
const startLocationUpdates = () => {
  locationInterval = setInterval(async () => {
    const location = await Location.getCurrentPositionAsync();
    
    await apiService.updateRiderLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });
  }, 30000); // Every 30 seconds
};
```

#### Files to Create/Modify:
- `mobileapp/apps/rider-app/services/locationService.ts` (NEW)
- `mobileapp/apps/rider-app/app/home/index.tsx` (start/stop location updates)
- `backend/api/delivery/rider_endpoints.py` (add update-location endpoint)

#### Testing:
- ✅ Location sent every 30 seconds
- ✅ Backend receives and stores location
- ✅ Location stops when rider goes offline
- ✅ Battery impact is minimal

#### Acceptance Criteria:
- [x] Location updates every 30s
- [x] Backend stores current location
- [x] Updates only when online
- [x] Graceful handling if location denied

**READY TO PROCEED WITH STEP 9?**

---

### **STEP 10: Core Dispatch Service - Single Order Flow**

**Duration:** 4-6 hours  
**Complexity:** ⭐⭐⭐⭐ Very High  
**Risk:** High (core business logic)

#### What to Do:
1. Create `DispatchService` class
2. Implement single order dispatch (no batching yet)
3. Implement rider selection algorithm
4. Implement offer creation and timeout
5. Implement race condition prevention (database locks)

```python
class DispatchService:
    @classmethod
    def dispatch_order(cls, order):
        """Main dispatch entry point."""
        # 1. Create dispatch queue
        # 2. Find eligible riders
        # 3. Offer to first rider
        # 4. Handle response/timeout
        
    @classmethod
    def find_eligible_riders(cls, order):
        """Find online riders, sorted by priority."""
        # Filter: online, verified, active
        # Sort: distance, acceptance_rate, rating
        
    @classmethod
    def offer_to_next_rider(cls, queue):
        """Offer to next rider in queue."""
        # Get next rider
        # Create DispatchOffer
        # Send via WebSocket
        # Schedule timeout check
        
    @classmethod
    def handle_rider_response(cls, offer_id, accepted):
        """Handle accept/reject."""
        if accepted:
            # Assign order
            # Update metrics
        else:
            # Offer to next rider
```

#### Files to Create:
- `backend/api/delivery/dispatch_service.py` (NEW - ~500 lines)

#### Testing:
- ✅ Can dispatch order
- ✅ Finds correct riders
- ✅ Offers in priority order
- ✅ Handles acceptance
- ✅ Handles rejection
- ✅ Handles timeout
- ✅ Prevents double-assignment

#### Acceptance Criteria:
- [x] Single order dispatch works end-to-end
- [x] Rider selection algorithm functional
- [x] Race conditions prevented
- [x] Timeout handling works
- [x] Logging comprehensive

**READY TO PROCEED WITH STEP 10?**

---

### **STEP 11: Dynamic Batching Logic - Your Enhancement**

**Duration:** 3-4 hours  
**Complexity:** ⭐⭐⭐ High  
**Risk:** Medium (complex logic)

#### What to Do:
1. Implement `check_for_batchable_orders()` in DispatchService
2. Call this BEFORE offering to each new rider
3. If batch found → Create batch offer
4. If no batch → Single offer

```python
@classmethod
def check_for_batchable_orders(cls, original_order):
    """
    Check if original order can now be batched with newly accepted orders.
    YOUR BRILLIANT IDEA!
    """
    # 1. Find other 'accepted' orders (not yet dispatched)
    recent_accepted = Order.objects.filter(
        order_status='accepted',
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).exclude(id=original_order.id)
    
    # 2. Check which ones can batch with original order
    compatible = []
    for other_order in recent_accepted:
        test_batch = [original_order, other_order]
        if OrderBatchingService.can_batch_orders(
            test_batch, 
            max_batch_size=3, 
            max_distance_km=2.0,
            use_driving_distance=True
        ):
            compatible.append(other_order)
    
    # 3. Return all compatible orders (including original)
    if compatible:
        all_orders = [original_order] + compatible[:2]  # Max 3 total
        return all_orders
    
    return [original_order]  # No batch possible
```

#### Files to Modify:
- `backend/api/delivery/dispatch_service.py` (add batching logic)

#### Testing:
- ✅ Detects compatible orders
- ✅ Creates batch on rejection
- ✅ Offers batch to next rider
- ✅ Batch earnings calculated correctly
- ✅ All orders in batch assigned together

#### Acceptance Criteria:
- [x] Dynamic batching works
- [x] Checks for batching on each rejection
- [x] Batch offers sent correctly
- [x] Batch assignment atomic
- [x] Google Maps used for distance checks

**READY TO PROCEED WITH STEP 11?**

---

### **STEP 12: Order Acceptance Signal - Auto-Trigger**

**Duration:** 1-2 hours  
**Complexity:** ⭐ Low  
**Risk:** Medium (affects all order acceptances)

#### What to Do:
1. Create signal listener for Order status changes
2. Trigger dispatch when status → 'accepted'
3. Add safety checks (don't dispatch if already assigned)

```python
@receiver(post_save, sender=Order)
def auto_dispatch_accepted_orders(sender, instance, **kwargs):
    """Automatically dispatch when order is accepted."""
    if instance.order_status == Order.OrderStatus.ACCEPTED:
        if not instance.is_assigned_to_rider():
            # Dispatch via Celery task (async)
            dispatch_order_task.delay(instance.id)
```

#### Files to Create/Modify:
- `backend/api/orders/signals.py` (create/modify)
- `backend/api/orders/apps.py` (register signal)
- `backend/api/orders/tasks.py` (Celery task, optional)

#### Testing:
- ✅ Approval triggers dispatch
- ✅ Only dispatches once
- ✅ Doesn't break approval flow
- ✅ Logs properly

#### Acceptance Criteria:
- [x] Signal fires on acceptance
- [x] Dispatch triggered automatically
- [x] No double-dispatch
- [x] Error handling works

**READY TO PROCEED WITH STEP 12?**

---

### **STEP 13: Rider App UI - Dispatch Offer Modal**

**Duration:** 5-6 hours  
**Complexity:** ⭐⭐⭐⭐ Very High  
**Risk:** Low (UI only)

#### What to Do:
1. Create full-screen dispatch modal component
2. Implement countdown timer with visual feedback
3. Add Accept/Reject buttons
4. Add vibration/sound notification
5. Show order/batch details
6. Handle offer cancellation
7. Auto-dismiss on timeout

#### Component Features:
- ✅ Full-screen modal (can't miss it)
- ✅ Countdown timer (⏱️ 00:28)
- ✅ Vibration on receipt
- ✅ Sound notification (optional)
- ✅ Earnings prominently displayed
- ✅ Pickup/delivery addresses
- ✅ Distance from rider
- ✅ Batch details (if applicable)
- ✅ Large, obvious buttons
- ✅ Haptic feedback on button press

#### Files to Create:
- `mobileapp/apps/rider-app/components/DispatchOfferModal.tsx` (NEW)
- `mobileapp/apps/rider-app/hooks/useDispatchOffers.ts` (NEW)

#### Files to Modify:
- `mobileapp/apps/rider-app/app/home/index.tsx` (integrate modal)

#### Testing:
- ✅ Modal appears when offer received
- ✅ Timer counts down correctly
- ✅ Accept sends request and closes
- ✅ Reject sends request and closes
- ✅ Timeout auto-dismisses
- ✅ Cancellation handled gracefully
- ✅ Works for single and batch offers

#### Acceptance Criteria:
- [x] Modal displays correctly
- [x] Timer accurate within 100ms
- [x] Accept/Reject work
- [x] Notification visible/audible
- [x] Can't dismiss accidentally
- [x] Responsive and fast

**READY TO PROCEED WITH STEP 13?**

---

### **STEP 14: Integration Testing - End-to-End**

**Duration:** 3-4 hours  
**Complexity:** ⭐⭐⭐ High  
**Risk:** Low (testing only)

#### What to Do:
1. Test complete flow with real orders
2. Simulate multiple riders
3. Test race conditions
4. Test batch formation on rejection
5. Test timeout scenarios
6. Test network failures
7. Performance testing

#### Test Scenarios:

**Scenario 1: Happy Path**
- Customer approves → Rider accepts → Assigned

**Scenario 2: Rejection Flow**
- Rider 1 rejects → Rider 2 sees offer → Accepts

**Scenario 3: Dynamic Batching**
- Order A dispatched → Rejected
- Order B accepted while rejecting
- Rider 2 sees BATCH (A+B) → Accepts

**Scenario 4: Race Condition**
- 2 riders accept simultaneously
- Only 1 gets it, other gets "already taken"

**Scenario 5: All Reject**
- 10 riders all reject/timeout
- Order returns to manual browse pool

#### Acceptance Criteria:
- [x] All scenarios pass
- [x] No errors in logs
- [x] Race conditions handled
- [x] Performance acceptable (<2s total)
- [x] UI responsive

**READY TO PROCEED WITH STEP 14?**

---

### **STEP 15: Fallback & Polish - Production Ready**

**Duration:** 2-3 hours  
**Complexity:** ⭐⭐ Medium  
**Risk:** Low (safety features)

#### What to Do:
1. Implement fallback to manual browse
2. Add retry with fee increase (10% after failed dispatch)
3. Add comprehensive logging
4. Add error notifications to pharmacy
5. Add metrics dashboard (optional)
6. Performance optimization
7. Documentation updates

#### Features:
- ✅ Failed dispatch → Manual browse pool
- ✅ Auto-retry after 5 minutes (+10% fee)
- ✅ Notify pharmacy if delays
- ✅ Track dispatch metrics
- ✅ Admin can view dispatch stats

#### Files to Modify:
- `backend/api/delivery/dispatch_service.py` (add fallback logic)
- `mobileapp/apps/rider-app/app/orders/index.tsx` (show failed dispatch orders)
- `backend/docs/dispatch_implementation_steps.md` (update this doc)

#### Testing:
- ✅ Fallback works correctly
- ✅ Fee increase applies
- ✅ Pharmacy notified
- ✅ Metrics tracked
- ✅ No memory leaks

#### Acceptance Criteria:
- [x] Fallback functional
- [x] Retry logic works
- [x] All edge cases handled
- [x] Production-ready
- [x] Documentation complete

**READY TO PROCEED WITH STEP 15?**

---

## 📊 Implementation Summary

### Timeline

| Step | Component | Duration | Complexity |
|------|-----------|----------|------------|
| 1 | Rider Status Fields | 1-2 hrs | ⭐ Low |
| 2 | Dispatch Models | 2-3 hrs | ⭐⭐ Medium |
| 3 | Core Dispatch Service | 4-6 hrs | ⭐⭐⭐⭐ Very High |
| 4 | Backend Endpoints | 2-3 hrs | ⭐⭐ Medium |
| 5 | Order Signal Trigger | 1-2 hrs | ⭐⭐ Medium |
| 6 | WebSocket Events | 3-4 hrs | ⭐⭐⭐ High |
| 7 | Rider App Modal | 5-6 hrs | ⭐⭐⭐⭐ Very High |
| 8 | Online/Offline Toggle | 1-2 hrs | ⭐ Low |
| 9 | Location Updates | 2-3 hrs | ⭐⭐ Medium |
| 10 | Testing | 3-4 hrs | ⭐⭐⭐ High |
| 11 | Fallback & Polish | 2-3 hrs | ⭐⭐ Medium |
| **TOTAL** | **28-38 hours** | **~5-7 days** |

### Dependencies

```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5
                      ↓
              Step 6 → Step 7
                      ↓
                   Step 8, 9
                      ↓
                  Step 10 → Step 11
```

## 🎯 Milestones

### Milestone 1: Foundation (Steps 1-2)
**Deliverable:** Database ready for dispatch system  
**Duration:** 3-5 hours

### Milestone 2: Backend Logic (Steps 3-6)
**Deliverable:** Dispatch system fully functional on backend  
**Duration:** 12-16 hours

### Milestone 3: Frontend UI (Steps 7-9)
**Deliverable:** Rider app can receive and respond to offers  
**Duration:** 8-11 hours

### Milestone 4: Polish (Steps 10-11)
**Deliverable:** Production-ready system  
**Duration:** 5-7 hours

## 🚀 Quick Start Guide

### For Developer:

Each step will follow this pattern:
1. **Read the step details** above
2. **Ask "Ready to proceed?"**
3. **Get approval from you**
4. **Implement the step**
5. **Test and verify**
6. **Show you the results**
7. **Move to next step**

### Your Role:

- ✅ Review each step
- ✅ Give approval to proceed
- ✅ Test functionality after implementation
- ✅ Provide feedback
- ✅ Approve moving to next step

## 📝 Notes

### Important Decisions:

**Timeout Duration:**
- Single order: 30 seconds
- Batch offer: 45 seconds
- Can be adjusted based on metrics

**Max Riders to Try:**
- Default: 10 riders
- Can be increased if needed

**Batch Wait Time:**
- NO waiting (your approach)
- Check on each rejection (dynamic)

**Fallback Strategy:**
- Return to manual browse pool
- Retry with +10% fee after 5 min

### Your Enhanced Dynamic Batching:

This is the **key innovation**:
- Don't wait for batches
- Check for batching on EACH rejection
- Maximize batch opportunities
- No customer-facing delays

**This is actually simpler AND better than waiting!** ✅

---

## ✅ Ready to Start?

**I'm ready to begin with STEP 1: Adding Rider Status Fields to the database.**

**Type "proceed with step 1" to begin, or let me know if you have any questions about the plan!** 🚀

---

**Last Updated:** October 15, 2025  
**Status:** 📋 Ready for Implementation  
**Approach:** Option C (Hybrid) with Enhanced Dynamic Batching

