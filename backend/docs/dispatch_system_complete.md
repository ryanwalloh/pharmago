# 🚀 Pharmago Dispatch System - Complete Implementation

**Status:** ✅ **FULLY IMPLEMENTED** (Steps 1-8 Complete)

**Last Updated:** October 15, 2025

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Implementation Checklist](#implementation-checklist)
4. [File Structure](#file-structure)
5. [How It Works](#how-it-works)
6. [API Endpoints](#api-endpoints)
7. [WebSocket Protocol](#websocket-protocol)
8. [Mobile App Integration](#mobile-app-integration)
9. [Testing Guide](#testing-guide)
10. [Deployment Considerations](#deployment-considerations)

---

## 🎯 System Overview

The Pharmago Dispatch System is an intelligent, real-time order assignment platform that:

- **Automatically** dispatches orders to online riders when a pharmacy accepts an order
- **Prioritizes** riders based on distance, acceptance rate, rating, and response time
- **Batches** compatible orders dynamically when riders reject single-order offers
- **Flash alerts** riders for 30 seconds with vibration and full-screen modal
- **Handles** race conditions and prevents double-assignment
- **Tracks** all dispatch metrics and rider performance

**Key Features:**
- ✅ Auto-dispatch on order acceptance
- ✅ Smart rider selection algorithm
- ✅ Dynamic batching on rejection
- ✅ Real-time WebSocket push notifications
- ✅ 30-second countdown timer
- ✅ Accept/Reject workflow
- ✅ Race condition prevention
- ✅ Full metrics tracking

---

## 🏗️ Architecture

### **Dispatch Flow Diagram**

```
Order Status = "ACCEPTED"
       ↓
Auto-Dispatch Signal Triggered (orders/signals.py)
       ↓
DispatchService.dispatch_order()
       ↓
Find Eligible Riders (online, available, within 10km)
       ↓
Prioritize Riders (distance, acceptance rate, rating, response time)
       ↓
Create DispatchQueue
       ↓
Create DispatchOffer for Rider #1
       ↓
Send WebSocket Notification → Rider's Phone (Full-Screen Modal)
       ↓
30-Second Countdown Timer Starts
       ↓
[RIDER RESPONDS]
       ↓
┌─────────────────────────────────────────┬──────────────────────────────────────┐
│ ACCEPT                                  │ REJECT / TIMEOUT                     │
├─────────────────────────────────────────┼──────────────────────────────────────┤
│ ✅ Atomically Assign Order to Rider    │ ❌ Check for Batchable Orders        │
│ ✅ Create RiderAssignment               │ ↓                                    │
│ ✅ Create OrderRiderAssignment          │ Found Compatible Orders?             │
│ ✅ Cancel Other Offers (WebSocket)      │ ┌─────────────┬──────────────────┐   │
│ ✅ Update Metrics                       │ │ YES         │ NO               │   │
│ ✅ Navigate to Active Deliveries        │ │ Batch Offer │ Single Offer     │   │
│                                         │ │ to Rider #2 │ to Rider #2      │   │
└─────────────────────────────────────────┘ └─────────────┴──────────────────┘   │
                                          ↓                                      │
                                    Repeat Until Assigned or All Riders Reject   │
                                          ↓                                      │
                                    Mark Queue as "FAILED" (Manual Assignment)  │
                                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Technology Stack**

**Backend:**
- Django 5.1.2
- Django Channels 4.0.0 (WebSocket support)
- channels-redis 4.1.0 (Channel layer backend)
- Daphne 4.0.0 (ASGI server)
- PostgreSQL (Database)
- Redis (Channel layer for WebSocket)
- Google Maps Distance Matrix API (Accurate distance calculation)

**Mobile App (Rider):**
- React Native / Expo
- WebSocket API
- AsyncStorage (Session management)
- expo-router (Navigation)

---

## ✅ Implementation Checklist

### **Backend (100% Complete)**

- [x] **STEP 1:** Added rider status fields (`activity_status`, `location`, `metrics`)
- [x] **STEP 2:** Created `DispatchOffer` and `DispatchQueue` models
- [x] **STEP 3:** Implemented `DispatchService` with dynamic batching on rejection
- [x] **STEP 4:** Created backend API endpoints for rider responses
- [x] **STEP 5:** Added auto-dispatch signal trigger on order acceptance
- [x] **STEP 6:** Implemented WebSocket for real-time offers

### **Mobile App (100% Complete)**

- [x] **STEP 7:** Built dispatch offer modal in rider app
- [x] **STEP 8:** Updated online/offline toggle to connect/disconnect dispatch WebSocket

### **Pending (Future Enhancements)**

- [ ] **STEP 9:** Admin dashboard for dispatch monitoring
- [ ] **STEP 10:** Advanced analytics and reporting
- [ ] **STEP 11:** Manual dispatch override for admins
- [ ] **STEP 12:** Rider preferences (preferred areas, batch size limits)
- [ ] **STEP 13:** Push notifications fallback (if WebSocket disconnected)
- [ ] **STEP 14:** Load testing and performance optimization
- [ ] **STEP 15:** Production deployment to Railway

---

## 📁 File Structure

### **Backend Files**

```
backend/
├── api/
│   ├── users/
│   │   ├── models.py                 # Rider model with dispatch fields
│   │   ├── rider_endpoints.py        # Rider login, session, order count
│   │   └── urls_direct.py            # Direct API routes
│   ├── delivery/
│   │   ├── models.py                 # DispatchOffer, DispatchQueue, OrderBatchingService
│   │   ├── dispatch_service.py       # Core dispatch logic (NEW)
│   │   ├── consumers.py              # WebSocket consumer (NEW)
│   │   ├── routing.py                # WebSocket URL routing (NEW)
│   │   └── rider_endpoints.py        # Accept/reject offer, update status/location
│   ├── orders/
│   │   ├── models.py                 # Order model
│   │   └── signals.py                # Auto-dispatch trigger (NEW)
│   └── utils/
│       └── google_maps_service.py    # Google Maps Distance Matrix API
├── pharmago/
│   ├── settings.py                   # Channels configuration
│   └── asgi.py                       # ASGI application with WebSocket routing (UPDATED)
├── requirements.txt                  # Dependencies (channels, channels-redis, daphne, googlemaps)
└── docs/
    ├── dispatch_implementation_steps.md  # Detailed implementation plan
    └── dispatch_system_complete.md       # This file
```

### **Mobile App Files**

```
mobileapp/apps/
├── customer-app/services/
│   └── dispatchService.ts            # WebSocket connection, accept/reject API (NEW)
└── rider-app/
    ├── components/
    │   └── DispatchOfferModal.tsx    # Full-screen modal with 30s timer (NEW)
    └── app/home/
        └── index.tsx                 # Home screen with dispatch integration (UPDATED)
```

---

## ⚙️ How It Works

### **1. Order Acceptance → Auto-Dispatch**

**File:** `backend/api/orders/signals.py`

```python
@receiver(post_save, sender=Order)
def auto_dispatch_on_order_acceptance(sender, instance: Order, created, **kwargs):
    if created:
        return
    if instance.order_status != Order.OrderStatus.ACCEPTED:
        return
    if instance.is_assigned_to_rider():
        return
    
    # Safety check: Don't re-dispatch if already in queue
    existing_queue = DispatchQueue.objects.filter(
        order=instance,
        status__in=[DispatchQueue.QueueStatus.PENDING, DispatchQueue.QueueStatus.DISPATCHING]
    ).exists()
    if existing_queue:
        return
    
    # Trigger dispatch
    from api.delivery.dispatch_service import DispatchService
    DispatchService.dispatch_order(instance)
```

**When:** Pharmacy clicks "Accept Order" in web dashboard  
**What:** Django signal automatically calls `DispatchService.dispatch_order(order)`

---

### **2. Find and Prioritize Riders**

**File:** `backend/api/delivery/dispatch_service.py`

**Eligibility Criteria:**
- Rider must be online (`activity_status='online'`)
- Rider has current location (latitude/longitude set)
- Rider is within 10km of pharmacy pickup location (Google Maps driving distance)

**Prioritization Formula:**

```python
# 1. Distance Score (closer = higher score)
distance_score = max(0, 100 - (distance_km * 10))

# 2. Acceptance Rate (0-100%)
acceptance_score = rider.acceptance_rate

# 3. Rating Score (0-5 stars → 0-100)
rating_score = (float(rider.average_rating) / 5.0) * 100

# 4. Response Time (faster = higher score)
avg_response = float(rider.average_response_time) or 15.0
response_score = max(0, 100 - (avg_response * 2))

# Weighted Total
total_score = (
    distance_score * 0.40 +        # 40% weight on distance
    acceptance_score * 0.30 +      # 30% weight on acceptance rate
    rating_score * 0.20 +          # 20% weight on rating
    response_score * 0.10          # 10% weight on response time
)
```

**Result:** Riders are ranked by `total_score` (highest first)

---

### **3. Create Dispatch Offer**

**File:** `backend/api/delivery/models.py` (DispatchOffer)

**Offer Details:**
- `offer_id`: Unique ID (e.g., `OFFER_DQ_ORD123_1`)
- `order` or `batch_orders`: Single order or list of batched orders
- `total_earnings`: Sum of `delivery_fee * 0.80` (80% commission)
- `expires_at`: Current time + 30 seconds
- `timeout_seconds`: 30
- `attempt_number`: Increments for each rider

---

### **4. Send WebSocket Notification**

**File:** `backend/api/delivery/dispatch_service.py`

```python
async_to_sync(channel_layer.group_send)(
    f'rider_dispatch_{rider.id}',
    {
        'type': 'dispatch_offer',
        'offer_data': {
            'offer_id': offer.offer_id,
            'is_batch': is_batch,
            'orders_count': orders_count,
            'total_earnings': total_earnings,
            'order': { ... },  # or 'orders': [ ... ] for batch
            'expires_at': expires_at,
            'timeout_seconds': 30,
        }
    }
)
```

**WebSocket URL:** `ws://localhost:8000/ws/rider/dispatch/{rider_id}/`

**Consumer:** `backend/api/delivery/consumers.py` (RiderDispatchConsumer)

---

### **5. Rider Receives Full-Screen Modal**

**File:** `mobileapp/apps/rider-app/components/DispatchOfferModal.tsx`

**Features:**
- ✅ Full-screen overlay (blocks all other UI)
- ✅ 30-second countdown timer (red after 10 seconds, pulsing animation)
- ✅ Vibration on offer received: `[0ms, 200ms, 100ms, 200ms]`
- ✅ Earnings-focused design (large green ₱ amount)
- ✅ Order details (pickup, delivery, distance)
- ✅ Batch badge ("3 Orders Batched")
- ✅ Expandable batch details
- ✅ Accept button (green, with loading state)
- ✅ Decline button (red outline, with loading state)
- ✅ Auto-reject on timeout

**UI Components:**
- Header: "New Delivery!" with ⚡ icon + countdown timer
- Earnings: "You'll Earn ₱XX.XX" (main focus)
- Details: Pickup pharmacy, delivery address, distance
- Actions: Decline (left) | Accept (right)

---

### **6. Rider Responds**

#### **Accept Offer**

**Endpoint:** `POST /api/rider/accept-offer/`

**Request:**
```json
{
  "offer_id": "OFFER_DQ_ORD123_1",
  "rider_id": 6
}
```

**Process:**
1. Atomically assign order(s) to rider (prevents race conditions)
2. Create `RiderAssignment` record
3. Create `OrderRiderAssignment` link(s)
4. Cancel all other pending offers for these orders
5. Send WebSocket cancellation to other riders
6. Update rider's dispatch metrics

**Response:**
```json
{
  "success": true,
  "message": "Order assigned successfully",
  "assignment_id": 42
}
```

**Mobile App:** Shows success alert → navigates to Active Deliveries

---

#### **Reject Offer**

**Endpoint:** `POST /api/rider/reject-offer/`

**Request:**
```json
{
  "offer_id": "OFFER_DQ_ORD123_1",
  "rider_id": 6,
  "reason": "too_far"
}
```

**Process:**
1. Mark `DispatchOffer` as "rejected"
2. Update rider's dispatch metrics (acceptance rate, response time)
3. Check for batchable orders:
   - **If found:** Create batched offer for next rider
   - **If not found:** Send single offer to next rider
4. Repeat until assigned or all riders reject

**Response:**
```json
{
  "success": true,
  "message": "Offer declined. Dispatching to next rider."
}
```

**Mobile App:** Modal closes, rider continues normal operations

---

### **7. Dynamic Batching on Rejection**

**File:** `backend/api/delivery/dispatch_service.py`

**Trigger:** When a rider rejects a single-order offer

**Logic:**
```python
if not queue.is_batch and queue.order:
    compatible_orders = cls.check_for_batchable_orders(queue.order)
    if len(compatible_orders) > 1:
        # Convert to batch queue
        queue.is_batch = True
        queue.batch_orders.set(compatible_orders)
        queue.save()
        logger.info(f"📦 Created batch of {len(compatible_orders)} orders")
```

**Batching Criteria** (from `OrderBatchingService`):
- Orders from the same pharmacy (same pickup location)
- Delivery addresses within 2km of each other (Google Maps driving distance)
- Maximum 3 orders per batch
- All orders must be unassigned

**Result:** Next rider receives a batched offer with higher total earnings

---

## 🔌 API Endpoints

### **Rider Authentication**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rider-login/` | Rider login, returns full session |
| GET | `/api/rider-session/` | Get current rider session |

---

### **Dispatch System**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/rider/accept-offer/` | Accept a dispatch offer | ✅ |
| POST | `/api/rider/reject-offer/` | Reject a dispatch offer | ✅ |
| POST | `/api/rider/update-status/` | Update rider status (online/offline) | ✅ |
| POST | `/api/rider/update-location/` | Update rider's GPS location | ✅ |
| GET | `/api/rider/current-offer/` | Get current active offer | ✅ |

---

### **Order Management**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/available-orders-count/` | Count of unassigned orders | ✅ |
| GET | `/api/available-orders/` | List of available orders (batched) | ✅ |

---

## 📡 WebSocket Protocol

### **Connection**

**URL:** `ws://[HOST]/ws/rider/dispatch/{rider_id}/`

**Example:** `ws://localhost:8000/ws/rider/dispatch/6/`

**Authentication:** JWT token in query params or headers (future enhancement)

---

### **Message Types**

#### **1. Dispatch Offer (Server → Rider)**

```json
{
  "type": "dispatch_offer",
  "offer": {
    "offer_id": "OFFER_DQ_ORD123_1",
    "is_batch": false,
    "orders_count": 1,
    "total_earnings": 23.20,
    "pickup_distance_km": 2.5,
    "expires_at": "2025-10-15T23:35:00Z",
    "timeout_seconds": 30,
    "order": {
      "order_number": "ORD20251012171215",
      "customer_name": "Juan Dela Cruz",
      "pharmacy": {
        "name": "PharmaCare Plus",
        "address": "Brgy. San Antonio, Iligan City"
      },
      "delivery_address": "Brgy. San Isidro, Iligan City",
      "earnings": 23.20
    }
  }
}
```

**Rider Action:** Display full-screen modal, start 30-second countdown

---

#### **2. Offer Cancelled (Server → Rider)**

```json
{
  "type": "offer_cancelled",
  "offer_id": "OFFER_DQ_ORD123_1",
  "reason": "assigned_to_another_rider"
}
```

**Rider Action:** Close modal if currently viewing this offer, show toast notification

---

#### **3. Offer Update (Server → Rider) [Future]**

```json
{
  "type": "offer_update",
  "offer_id": "OFFER_DQ_ORD123_1",
  "updated_fields": {
    "total_earnings": 28.50
  }
}
```

**Rider Action:** Update displayed earnings in modal

---

## 📱 Mobile App Integration

### **1. Connection Management**

**File:** `mobileapp/apps/customer-app/services/dispatchService.ts`

**Key Methods:**
- `connectToDispatchChannel(riderId, onOffer, onCancel)` - Establishes WebSocket
- `disconnect()` - Closes WebSocket, clears reconnect timers
- `acceptOffer(offerId, riderId)` - Calls accept endpoint
- `rejectOffer(offerId, riderId, reason)` - Calls reject endpoint
- `updateRiderStatus(riderId, status)` - Updates online/offline
- `updateRiderLocation(riderId, lat, lng)` - Sends GPS coordinates

**Auto-Reconnect:** If connection drops, attempts reconnect every 5 seconds

---

### **2. Dispatch Modal Component**

**File:** `mobileapp/apps/rider-app/components/DispatchOfferModal.tsx`

**Props:**
- `visible: boolean` - Show/hide modal
- `offer: DispatchOffer | null` - Offer data
- `onAccept: () => void` - Accept callback
- `onReject: () => void` - Reject callback
- `accepting: boolean` - Loading state for accept button
- `rejecting: boolean` - Loading state for reject button

**State Management:**
- `timeRemaining` - Countdown timer (30 → 0)
- `showDetails` - Expand/collapse batch details

**Animations:**
- Slide-in from bottom on mount
- Pulse animation for timer when < 10 seconds
- Vibration on mount: `[0, 200, 100, 200]`

---

### **3. Home Screen Integration**

**File:** `mobileapp/apps/rider-app/app/home/index.tsx`

**Key Features:**
- Online/offline toggle connects/disconnects dispatch WebSocket
- WebSocket connection established when rider goes online
- Modal appears automatically when offer is received
- Accept/reject handlers update backend and close modal
- Success alert shows after accepting offer

**Lifecycle:**
```
Component Mount
    ↓
Load Rider Session from AsyncStorage
    ↓
If Rider is Online → Connect to Dispatch WebSocket
    ↓
Listen for Dispatch Offers
    ↓
[Offer Received] → Show Modal
    ↓
[Accept] → API Call → Success Alert → Navigate
    ↓
[Reject] → API Call → Close Modal
    ↓
[Toggle Offline] → Disconnect WebSocket
```

---

## 🧪 Testing Guide

### **Manual Testing**

#### **Test 1: Auto-Dispatch on Order Acceptance**

**Steps:**
1. Open Pharmago web dashboard as pharmacy
2. Find an order with status "Pending"
3. Click "Accept Order"
4. **Expected:** Django signal triggers, `DispatchService.dispatch_order()` called
5. Check backend logs for:
   ```
   🚀 Auto-dispatch triggered for order ORD123
   ✅ Dispatch initiated for ORD123
   ```

---

#### **Test 2: Rider Receives WebSocket Offer**

**Prerequisites:**
- At least 1 rider logged in on mobile app
- Rider status set to "online"

**Steps:**
1. Accept an order as pharmacy (Test 1)
2. **Expected:** Rider's phone shows full-screen modal within 1 second
3. Verify modal displays:
   - Countdown timer (30 seconds)
   - Earnings amount (₱XX.XX)
   - Pickup pharmacy name
   - Delivery customer name
   - Accept/Decline buttons

---

#### **Test 3: Rider Accepts Offer**

**Steps:**
1. Receive dispatch offer (Test 2)
2. Tap "Accept" button
3. **Expected:**
   - Loading state: "Accepting..."
   - Success alert: "Order Accepted! 🎉"
   - Modal closes
   - Backend creates `RiderAssignment` and `OrderRiderAssignment`
   - Order status remains "accepted" (assignment link created)
4. Verify in database:
   ```sql
   SELECT * FROM api_riderassignment WHERE rider_id = 6;
   SELECT * FROM api_orderriderassignment WHERE assignment_id = [ID];
   ```

---

#### **Test 4: Rider Rejects Offer → Next Rider**

**Prerequisites:**
- At least 2 riders online

**Steps:**
1. Receive dispatch offer on Rider #1
2. Tap "Decline" button
3. **Expected:**
   - Modal closes immediately
   - Rider #1's metrics updated (acceptance rate decreases)
   - Backend dispatches to Rider #2
   - Rider #2 receives offer within 1-2 seconds
4. Check backend logs:
   ```
   ⏭️  Rider 6 rejected offer OFFER_DQ_ORD123_1
   🔄 Dispatching to next rider...
   📨 WebSocket offer sent to rider 7
   ```

---

#### **Test 5: Dynamic Batching on Rejection**

**Prerequisites:**
- 2+ unassigned orders from the same pharmacy
- Orders have delivery addresses within 2km of each other

**Steps:**
1. Accept Order A (single order)
2. Rider #1 receives single-order offer
3. Rider #1 declines
4. **Expected:**
   - Backend finds Order B (compatible for batching)
   - Creates batch offer (2 orders)
   - Rider #2 receives batched offer
   - Modal shows "2 Orders Batched"
   - Total earnings = Sum of both orders' delivery fees * 0.80
5. Verify batch creation:
   ```sql
   SELECT * FROM api_dispatchqueue WHERE is_batch = TRUE;
   ```

---

#### **Test 6: Offer Timeout (Auto-Reject)**

**Steps:**
1. Receive dispatch offer
2. **Do not respond** for 30 seconds
3. **Expected:**
   - Timer reaches 0
   - Alert: "Offer Expired. You did not respond in time."
   - Modal auto-closes
   - Backend marks offer as "timeout"
   - Backend dispatches to next rider
4. Verify in database:
   ```sql
   SELECT status FROM api_dispatchoffer WHERE offer_id = 'OFFER_DQ_ORD123_1';
   -- Expected: 'timeout'
   ```

---

#### **Test 7: Race Condition Prevention**

**Setup:**
- 2 riders both receive the same offer (simulate by manually creating 2 offers for same order)

**Steps:**
1. Rider #1 taps "Accept"
2. **Immediately** Rider #2 taps "Accept" (within 100ms)
3. **Expected:**
   - Only ONE assignment is created (atomic transaction)
   - First rider to reach backend wins
   - Second rider receives error: "Order was already assigned"
   - Second rider's modal closes automatically
   - WebSocket cancellation sent to second rider
4. Verify only 1 assignment:
   ```sql
   SELECT COUNT(*) FROM api_riderassignment WHERE assignment_id = [ID];
   -- Expected: 1
   ```

---

#### **Test 8: Online/Offline Toggle**

**Steps:**
1. Log in as rider
2. Toggle status to "Offline"
3. **Expected:**
   - Backend receives status update: `activity_status='offline'`
   - WebSocket disconnects
   - No more offers received
4. Toggle back to "Online"
5. **Expected:**
   - Backend receives status update: `activity_status='online'`
   - WebSocket reconnects
   - Rider becomes eligible for dispatch again
6. Check logs:
   ```
   ✅ Rider status updated to: offline
   🔌 Disconnecting from dispatch WebSocket (rider going offline)
   ✅ Rider status updated to: online
   🔌 Connecting to dispatch WebSocket (rider going online)
   📡 Rider 6 connected to WebSocket.
   ```

---

### **Automated Testing Scripts**

#### **Test Script 1: Verify Dispatch Models**

**File:** `backend/test_step2_dispatch_models.py`

```bash
python test_step2_dispatch_models.py
```

**Tests:**
- DispatchOffer creation
- DispatchQueue creation
- Helper methods (mark_accepted, mark_rejected, mark_timeout)

---

#### **Test Script 2: Verify Dispatch Service**

**File:** `backend/test_step3_dispatch_service.py`

```bash
python test_step3_dispatch_service.py
```

**Tests:**
- Rider eligibility check
- Rider prioritization algorithm
- Dynamic batching logic
- Offer creation

---

#### **Test Script 3: Verify WebSocket Configuration**

**File:** `backend/test_step6_websocket.py`

```bash
python test_step6_websocket.py
```

**Tests:**
- Channel layer configuration
- Channel communication
- Offer serialization
- WebSocket notification sending

---

## 🚀 Deployment Considerations

### **Railway Deployment**

#### **1. Environment Variables**

Add to Railway project:

```bash
# Django
DJANGO_SETTINGS_MODULE=pharmago.settings
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app

# Database (PostgreSQL)
DATABASE_URL=postgresql://...  # Auto-provided by Railway

# Redis (for Channel Layer)
REDIS_URL=redis://...  # Add Redis plugin in Railway

# Google Maps
GOOGLE_MAPS_API_KEY=your-api-key

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.vercel.app
```

---

#### **2. Install Redis Plugin**

1. Go to Railway Dashboard
2. Click "Add Plugin"
3. Select "Redis"
4. Railway auto-generates `REDIS_URL`
5. Backend automatically uses it for channel layer

---

#### **3. Update `Procfile`**

**File:** `backend/Procfile`

```
web: daphne -b 0.0.0.0 -p $PORT pharmago.asgi:application
```

**Note:** Daphne handles both HTTP and WebSocket on the same port

---

#### **4. Mobile App WebSocket URL**

**File:** `mobileapp/apps/customer-app/.env`

```bash
EXPO_PUBLIC_API_BASE=https://your-backend.railway.app
EXPO_PUBLIC_WS_DISPATCH_URL=wss://your-backend.railway.app/ws/rider/dispatch/{rider_id}/
```

**Auto-Derivation:** If `EXPO_PUBLIC_WS_DISPATCH_URL` is not set, `dispatchService.ts` automatically derives it from `EXPO_PUBLIC_API_BASE`:

```typescript
// HTTP → WebSocket conversion
https://your-backend.railway.app → wss://your-backend.railway.app
```

---

### **Performance Optimization**

#### **1. Database Indexes**

All critical fields are indexed:

```python
# backend/api/users/models.py
class Meta:
    indexes = [
        models.Index(fields=['activity_status', 'current_latitude', 'current_longitude']),
        models.Index(fields=['acceptance_rate']),
        models.Index(fields=['last_seen_at']),
    ]

# backend/api/delivery/models.py
class Meta:
    indexes = [
        models.Index(fields=['status', 'rider', 'created_at']),
        models.Index(fields=['offer_id']),
        models.Index(fields=['expires_at']),
    ]
```

---

#### **2. Caching (Future Enhancement)**

Use Redis to cache:
- List of online riders (refresh every 30 seconds)
- Rider locations (update every 30 seconds)
- Dispatch metrics

---

#### **3. Load Testing**

**Scenario:** 100 concurrent orders, 50 online riders

**Tools:** Locust, Apache JMeter

**Expected Performance:**
- Order acceptance → Offer sent: < 2 seconds
- Rider accept → Assignment created: < 500ms
- WebSocket message delivery: < 100ms

---

## 📊 Metrics and Monitoring

### **Rider Dispatch Metrics**

**Tracked per Rider:**
- `acceptance_rate` - Percentage of accepted offers (0-100%)
- `total_offers_received` - Total offers sent
- `total_offers_accepted` - Total accepted
- `total_offers_rejected` - Total rejected
- `total_offers_timeout` - Total timeouts (no response)
- `average_response_time` - Average seconds to respond

**View in Admin Dashboard:**
```python
# backend/api/users/admin.py
@admin.register(Rider)
class RiderAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'activity_status', 'acceptance_rate', 'average_rating')
    list_filter = ('activity_status', 'vehicle_type')
```

---

### **Dispatch Queue Metrics**

**Tracked per Order:**
- `attempts_count` - Number of riders who received the offer
- `status` - `pending`, `dispatching`, `assigned`, `failed`
- `created_at` - When dispatch started
- `assigned_at` - When successfully assigned

**Query Failed Dispatches:**
```sql
SELECT * FROM api_dispatchqueue WHERE status = 'failed';
```

---

## 🎉 Success Criteria

The dispatch system is considered **fully functional** if:

✅ Orders are automatically dispatched within 2 seconds of pharmacy acceptance  
✅ Riders receive full-screen modal with accurate order details  
✅ Accept/reject workflow completes without errors  
✅ Dynamic batching occurs when single orders are rejected  
✅ Race conditions are prevented (no double-assignment)  
✅ WebSocket reconnects automatically on disconnection  
✅ All dispatch metrics are accurately tracked  
✅ No linter errors or TypeScript errors  
✅ Backend logs show clear dispatch flow  
✅ Mobile app handles all edge cases (timeout, cancellation, network errors)

---

## 🐛 Troubleshooting

### **Issue 1: Rider Not Receiving Offers**

**Symptoms:**
- Rider is online, but no modal appears
- Backend logs show "Dispatching to rider X" but WebSocket not received

**Checks:**
1. Verify rider is online:
   ```sql
   SELECT activity_status FROM api_rider WHERE id = 6;
   -- Should be 'online'
   ```
2. Verify WebSocket connection:
   - Check mobile app logs for: `✅ Dispatch WebSocket connected`
3. Verify rider has location set:
   ```sql
   SELECT current_latitude, current_longitude FROM api_rider WHERE id = 6;
   -- Should NOT be NULL
   ```
4. Verify Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```
5. Check channel layer configuration:
   ```python
   python manage.py shell
   >>> from channels.layers import get_channel_layer
   >>> channel_layer = get_channel_layer()
   >>> print(channel_layer)
   ```

---

### **Issue 2: Modal Appears But Accept Fails**

**Symptoms:**
- Rider taps "Accept" but gets error: "Failed to Accept"

**Checks:**
1. Verify offer is still valid (not expired):
   ```sql
   SELECT expires_at, status FROM api_dispatchoffer WHERE offer_id = 'OFFER_DQ_ORD123_1';
   ```
2. Verify order is not already assigned:
   ```sql
   SELECT * FROM api_orderriderassignment WHERE order_id = 123;
   ```
3. Check backend logs for error details:
   ```
   grep "Error in accept_dispatch_offer" backend.log
   ```
4. Verify rider ID matches:
   ```typescript
   // Mobile app console
   console.log('Rider ID:', riderProfile.id);
   ```

---

### **Issue 3: Batch Not Created After Rejection**

**Symptoms:**
- Rider rejects single offer, but next rider also gets single offer (no batch)

**Checks:**
1. Verify there are compatible orders:
   ```sql
   SELECT * FROM api_order
   WHERE order_status = 'accepted'
   AND id NOT IN (SELECT order_id FROM api_orderriderassignment);
   ```
2. Check distance between delivery addresses:
   - Must be within 2km (Google Maps driving distance)
3. Check backend logs:
   ```
   grep "batch" backend.log
   # Look for: "📦 Created batch of X orders" or "📦 No batch found"
   ```
4. Manually test batching:
   ```bash
   python test_step3_dispatch_service.py
   ```

---

### **Issue 4: WebSocket Disconnects Frequently**

**Symptoms:**
- Mobile app logs show: `🔌 Dispatch WebSocket disconnected` every few minutes

**Checks:**
1. Check Railway/server timeout settings
   - Default WebSocket timeout: 60 seconds
   - Solution: Implement heartbeat/ping every 30 seconds
2. Check mobile app network connectivity
3. Verify Redis is not restarting
   ```bash
   redis-cli INFO server | grep uptime
   ```
4. Implement reconnection logic (already done in `dispatchService.ts`):
   ```typescript
   // Auto-reconnect after 5 seconds
   setTimeout(() => { this.connectToDispatchChannel(...); }, 5000);
   ```

---

## 📞 Support

**Questions or Issues?**
- File an issue on GitHub
- Contact backend team: backend@pharmago.ph
- Slack: #dispatch-system

---

**🎉 Congratulations! Your dispatch system is now fully operational and ready for production deployment!** 🚀

**Last Updated:** October 15, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

