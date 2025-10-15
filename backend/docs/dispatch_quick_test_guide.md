# 🧪 Dispatch System - Quick Test Guide

**Purpose:** Quickly verify your dispatch system is working end-to-end

**Time Required:** 10-15 minutes

---

## ✅ Prerequisites

- [ ] Backend running (`python manage.py runserver` or deployed to Railway)
- [ ] Redis running (for WebSocket channel layer)
- [ ] PostgreSQL database populated with test data
- [ ] At least 1 rider account created and approved
- [ ] At least 1 order in "pending" status
- [ ] Rider mobile app installed on phone or emulator

---

## 📱 Quick Test Flow

### **Test 1: Login as Rider (Mobile App)**

**Steps:**
1. Open rider-app
2. Enter email: `[rider-email]`
3. Enter password: `[rider-password]`
4. Tap "Login"

**✅ Expected:**
- Successful login
- Redirect to home screen
- Console logs:
  ```
  🔐 Rider login response: { success: true, ... }
  ✅ Rider session stored successfully
  📦 Loading session data: { user: {...}, rider: {...} }
  ```

---

### **Test 2: Go Online**

**Steps:**
1. On rider home screen, find "Status" toggle
2. Tap toggle to turn it ON (green)

**✅ Expected:**
- Toggle animates to green/active state
- Status text changes from "Offline" to "Online"
- Console logs:
  ```
  ✅ Rider status updated to: online
  🔌 Connecting to dispatch WebSocket (rider going online)
  ✅ Dispatch WebSocket connected
  ```

---

### **Test 3: Accept Order as Pharmacy (Web Dashboard)**

**Preparation:**
1. Open browser: `http://localhost:8000` (or your deployed URL)
2. Login as pharmacy
3. Navigate to orders page
4. Find an order with status "Pending"

**Steps:**
1. Click "Accept Order" button
2. Confirm acceptance

**✅ Expected (Backend Logs):**
```
🚀 Auto-dispatch triggered for order ORD20251012171215
🔍 Finding eligible riders for order ORD20251012171215...
✅ Found 2 eligible riders within 10.0km
🎯 Top rider: #6 (Score: 85.5) - Distance: 2.3km
📋 Created dispatch queue DQ_ORD20251012171215
📨 Created offer OFFER_DQ_ORD20251012171215_1 for rider #6
📡 WebSocket offer sent to rider 6 (channel: rider_dispatch_6)
✅ Dispatch initiated for ORD20251012171215
```

---

### **Test 4: Receive Offer (Mobile App)**

**✅ Expected (Rider Phone):**
- Phone vibrates: `[0, 200, 100, 200]`
- Full-screen modal appears instantly (within 1 second)
- Modal displays:
  - Header: "New Delivery! ⚡" + Timer: "30s"
  - Earnings: "You'll Earn ₱23.20" (large green text)
  - Order #: `ORD20251012171215`
  - Pickup: Pharmacy name + address
  - Deliver to: Customer name
  - Buttons: "Decline" (left) | "Accept" (right)
- Countdown timer starts: 30 → 29 → 28...

**✅ Expected (Console Logs):**
```
📨 Dispatch message received: dispatch_offer
🚨 NEW DISPATCH OFFER RECEIVED! { offer_id: "OFFER_DQ_ORD20251012171215_1", ... }
```

---

### **Test 5A: Accept Offer**

**Steps:**
1. Wait for modal to appear
2. Tap "Accept" button

**✅ Expected (Mobile App):**
- Button shows "Accepting..." with loading indicator
- Modal closes
- Alert appears: "Order Accepted! 🎉" → "Head to the pharmacy to pick up this order."
- Tap "View Order" (or OK)

**✅ Expected (Backend Logs):**
```
✅ Rider 6 accepted offer OFFER_DQ_ORD20251012171215_1
🎯 Creating rider assignment for order ORD20251012171215
✅ Order ORD20251012171215 assigned to rider 6
🚫 Cancelling 0 other pending offers for this order
📊 Updated rider 6 dispatch metrics: acceptance_rate=100.00%
```

**✅ Expected (Database):**
```sql
SELECT * FROM api_riderassignment WHERE rider_id = 6;
-- Should have 1 new row

SELECT * FROM api_orderriderassignment WHERE order_id = [order-id];
-- Should have 1 new row linking order to assignment

SELECT status FROM api_dispatchoffer WHERE offer_id = 'OFFER_DQ_ORD20251012171215_1';
-- Should be 'accepted'

SELECT status FROM api_dispatchqueue WHERE queue_id = 'DQ_ORD20251012171215';
-- Should be 'assigned'
```

---

### **Test 5B: Reject Offer (Alternative to 5A)**

**Steps:**
1. Wait for modal to appear
2. Tap "Decline" button

**✅ Expected (Mobile App):**
- Button shows "Declining..." with loading indicator
- Modal closes immediately
- No alert (silent rejection)

**✅ Expected (Backend Logs):**
```
⏭️  Rider 6 rejected offer OFFER_DQ_ORD20251012171215_1 (Reason: not_interested)
📊 Updated rider 6 dispatch metrics: acceptance_rate=75.00%
🔄 Dispatching to next rider...
🎯 Next rider: #7 (Score: 82.3) - Distance: 3.1km
📨 Created offer OFFER_DQ_ORD20251012171215_2 for rider #7
📡 WebSocket offer sent to rider 7 (channel: rider_dispatch_7)
```

**✅ Expected (Rider #7's Phone):**
- Receives new dispatch offer (same order)
- Modal appears with updated `attempt_number: 2`

---

### **Test 6: Go Offline**

**Steps:**
1. On rider home screen, tap status toggle to turn it OFF (gray/red)

**✅ Expected:**
- Toggle animates to gray/inactive state
- Status text changes from "Online" to "Offline"
- Console logs:
  ```
  ✅ Rider status updated to: offline
  🔌 Disconnecting from dispatch WebSocket (rider going offline)
  ```
- No more dispatch offers received

---

## 🔥 Advanced Tests

### **Test 7: Batch Offer After Rejection**

**Prerequisites:**
- 2+ unassigned orders from the same pharmacy
- Delivery addresses within 2km of each other

**Steps:**
1. Accept Order A as pharmacy (single order)
2. Rider #1 receives single-order offer
3. Rider #1 declines
4. **Expected:** Rider #2 receives batched offer (2+ orders)

**✅ Expected (Backend Logs):**
```
⏭️  Rider 6 rejected offer OFFER_DQ_ORD123_1
🔍 Checking for batchable orders...
✅ Found 2 compatible orders for batching
📦 Created batch of 2 orders
🎯 Next rider: #7
📨 Created BATCH offer OFFER_DQ_BATCH_1 for rider #7
📡 WebSocket offer sent to rider 7
```

**✅ Expected (Rider #2's Modal):**
- Badge: "2 Orders Batched" (green badge with layers icon)
- Earnings: Sum of both orders (e.g., ₱46.40)
- "View All Orders" button → expands to show both orders

---

### **Test 8: Offer Timeout**

**Steps:**
1. Accept order as pharmacy
2. Rider receives offer
3. **Do not respond** for 30 seconds

**✅ Expected (Mobile App):**
- Timer counts down: 30 → 29 → ... → 10 (turns red, starts pulsing)
- Timer reaches 0
- Alert: "Offer Expired. You did not respond in time."
- Modal auto-closes

**✅ Expected (Backend Logs):**
```
⏰ Offer OFFER_DQ_ORD123_1 timed out (no response from rider 6)
📊 Updated rider 6 dispatch metrics: total_offers_timeout=1
🔄 Dispatching to next rider...
```

---

### **Test 9: Race Condition (2 Riders Accept Same Order)**

**Setup:** Requires manual simulation or coordinated testing with 2 riders

**Steps:**
1. Manually create 2 offers for the same order (via Django admin or shell)
2. Rider #1 taps "Accept"
3. **Immediately** Rider #2 taps "Accept" (< 100ms apart)

**✅ Expected:**
- Only ONE assignment created (atomic transaction prevents double-assignment)
- First rider to reach backend wins
- Second rider gets error response: `"Order was already assigned"`
- Second rider's modal shows alert: "Failed to Accept. Order was already assigned."

**✅ Expected (Database):**
```sql
SELECT COUNT(*) FROM api_orderriderassignment WHERE order_id = [order-id];
-- Should be exactly 1
```

---

## 🐛 Common Issues

### **Issue: Modal Does Not Appear**

**Check:**
1. Is rider online? (Toggle must be green)
2. Is WebSocket connected? (Check console logs for `✅ Dispatch WebSocket connected`)
3. Is rider within 10km of pharmacy? (Check GPS coordinates)
4. Is Redis running? (`redis-cli ping` should return `PONG`)

**Fix:**
- Restart Redis: `redis-server`
- Toggle offline/online to reconnect WebSocket
- Update rider's location: POST `/api/rider/update-location/`

---

### **Issue: Accept Button Does Nothing**

**Check:**
1. Is offer expired? (Check `expires_at` in offer data)
2. Is network connected? (Check API response in Network tab)
3. Is rider ID correct? (Compare `riderProfile.id` with offer's `rider_id`)

**Fix:**
- Check backend logs for error details
- Verify API endpoint is reachable: `POST /api/rider/accept-offer/`

---

### **Issue: WebSocket Disconnects Immediately**

**Check:**
1. Is `REDIS_URL` configured? (Railway: Check environment variables)
2. Is channel layer configured? (`settings.py`: `CHANNEL_LAYERS`)
3. Is Daphne running? (Not Django's `runserver`)

**Fix:**
- Run backend with Daphne: `daphne -b 0.0.0.0 -p 8000 pharmago.asgi:application`
- Verify channel layer:
  ```python
  from channels.layers import get_channel_layer
  channel_layer = get_channel_layer()
  print(channel_layer)  # Should NOT be None
  ```

---

## ✅ Success Checklist

After completing all tests, you should have:

- [x] Rider can login and go online
- [x] WebSocket connects successfully
- [x] Modal appears within 1 second of order acceptance
- [x] Countdown timer works (30 seconds)
- [x] Accept button creates assignment
- [x] Reject button triggers next rider
- [x] Dynamic batching works
- [x] Timeout auto-rejects after 30 seconds
- [x] Race conditions prevented
- [x] All backend logs show correct flow

---

## 🎉 Next Steps

Once basic dispatch is working:

1. **Test with Multiple Riders:** Coordinate with 3-5 riders to test concurrent offers
2. **Load Testing:** Use Locust to simulate 100 orders/hour
3. **Monitor Metrics:** Check rider acceptance rates, response times
4. **Optimize Batching:** Adjust `max_distance_km` (currently 2km) based on real-world data
5. **Deploy to Production:** Railway deployment with production Redis

---

**Questions?** Check `backend/docs/dispatch_system_complete.md` for full documentation.

**Happy Dispatching! 🚀**

