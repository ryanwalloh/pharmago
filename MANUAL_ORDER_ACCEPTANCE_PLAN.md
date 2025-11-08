# Manual Order Acceptance Implementation Plan

## 🎯 Goal
Wire the "Accept Order" / "Accept Batch" buttons in `orders/index.tsx` to allow riders to manually accept available orders from the list.

---

## 📊 Current State Analysis

### ✅ What Exists:
1. **Available Orders List** - Frontend displays batched orders
2. **Dispatch Offers** - Push notification system with `accept_dispatch_offer` endpoint
3. **Assignment Creation Logic** - `RiderAssignment.create_batch_assignment()` in models
4. **Delivery Tracking** - `[id].tsx` screen for active deliveries

### ❌ What's Missing:
1. **No backend endpoint** for manually accepting orders from the list
2. **No frontend service method** to call acceptance API
3. **No button handlers** wired to accept functionality

---

## 🏗️ Strategic Implementation Plan

### **Phase 1: Backend Endpoint** (Steps 1-3)

#### **Step 1: Create Manual Accept Endpoint**
**File:** `backend/api/delivery/rider_endpoints.py`

**Action:** Add new endpoint after existing dispatch endpoints

```python
@csrf_exempt
def manual_accept_orders(request):
    """
    Rider manually accepts orders from available orders list.
    
    POST /api/rider/manual-accept-orders/
    Body: {
        "rider_id": 123,
        "order_ids": [45, 46, 47]  # Array of order IDs to accept
    }
    
    Returns: {
        "success": True,
        "assignment_id": "ASG_20241108_001",
        "orders_count": 3,
        "total_earnings": 250.00
    }
    """
```

**Logic:**
- Validate rider exists and is active
- Validate all orders exist and are unassigned
- Check if orders can be batched (if multiple)
- Create `RiderAssignment` using existing logic
- Broadcast order count update via WebSocket
- Return assignment_id for navigation

---

#### **Step 2: Register Endpoint in URLs**
**File:** `backend/api/users/urls_direct.py`

**Action:** Add new URL pattern

```python
urlpatterns = [
    # ... existing patterns ...
    path('rider/manual-accept-orders/', delivery_rider_endpoints.manual_accept_orders),
]
```

---

#### **Step 3: Add WebSocket Broadcast**
Already handled in Step 1 - calls `broadcast_rider_order_count_update()` after assignment creation

---

### **Phase 2: Frontend Service** (Step 4)

#### **Step 4: Add API Method**
**File:** `mobileapp/apps/customer-app/services/api.ts`

**Action:** Add method to accept orders manually

```typescript
async acceptManualOrders(riderId: number, orderIds: number[]): Promise<ApiResponse<any>> {
  console.log('📦 Accepting orders manually:', { riderId, orderIds });
  return this.makeDirectRequest('/rider/manual-accept-orders/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rider_id: riderId,
      order_ids: orderIds
    })
  });
}
```

---

### **Phase 3: Frontend Integration** (Steps 5-7)

#### **Step 5: Add Accept Handler**
**File:** `mobileapp/apps/rider-app/app/orders/index.tsx`

**Action:** Add state and handler function

```typescript
// Add state
const [acceptingBatch, setAcceptingBatch] = useState<string | null>(null);
const [riderProfile, setRiderProfile] = useState<any>(null);

// Load rider profile on mount
useEffect(() => {
  loadRiderProfile();
}, []);

const loadRiderProfile = async () => {
  const cached = await AsyncStorage.getItem('rider_profile');
  if (cached) setRiderProfile(JSON.parse(cached));
};

// Handler function
const handleAcceptBatch = async (batch: BatchOrder) => {
  if (!riderProfile?.id) {
    Alert.alert('Error', 'Rider profile not loaded');
    return;
  }

  setAcceptingBatch(batch.batch_id);

  try {
    const orderIds = batch.orders.map(o => o.id);
    const response = await apiService.acceptManualOrders(riderProfile.id, orderIds);

    if (response.success) {
      const assignmentId = response.data.assignment_id;
      
      Alert.alert(
        'Success!',
        `${batch.is_batch ? 'Batch' : 'Order'} accepted! You'll earn ₱${batch.total_earnings.toFixed(2)}`,
        [{ 
          text: 'Start Delivery', 
          onPress: () => router.push(`/delivery/${assignmentId}` as any)
        }]
      );
    } else {
      Alert.alert('Failed', response.error || 'Could not accept order');
    }
  } catch (error) {
    console.error('❌ Error accepting batch:', error);
    Alert.alert('Error', 'Failed to accept order. Please try again.');
  } finally {
    setAcceptingBatch(null);
  }
};
```

---

#### **Step 6: Wire Accept Button**
**File:** `mobileapp/apps/rider-app/app/orders/index.tsx` (Line 218)

**Action:** Add onPress handler and loading state

```typescript
<TouchableOpacity 
  style={[
    styles.acceptBatchButton,
    acceptingBatch === batch.batch_id && styles.acceptBatchButtonDisabled
  ]}
  onPress={() => handleAcceptBatch(batch)}
  disabled={acceptingBatch === batch.batch_id}
>
  {acceptingBatch === batch.batch_id ? (
    <ActivityIndicator size="small" color="#FFFFFF" />
  ) : (
    <>
      <Text style={styles.acceptBatchButtonText}>
        {batch.is_batch ? 'Accept Batch' : 'Accept Order'}
      </Text>
      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
    </>
  )}
</TouchableOpacity>
```

---

#### **Step 7: Add Button Disabled Style**
**File:** `mobileapp/apps/rider-app/app/orders/index.tsx`

**Action:** Add disabled style to StyleSheet

```typescript
acceptBatchButtonDisabled: {
  backgroundColor: '#CCCCCC',
  opacity: 0.6,
},
```

---

## 📝 Implementation Sequence

### **Order of Execution:**

1. ✅ **Backend First** (Steps 1-3)
   - Create endpoint logic
   - Register URL
   - Test with Postman/curl

2. ✅ **Frontend Service** (Step 4)
   - Add API method
   - Test connection

3. ✅ **Frontend Integration** (Steps 5-7)
   - Add handler and state
   - Wire button
   - Test end-to-end

---

## 🧪 Testing Strategy

### Backend Testing:
```bash
curl -X POST http://localhost:8000/api/rider/manual-accept-orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "rider_id": 1,
    "order_ids": [45]
  }'
```

### Frontend Testing:
1. Open rider app orders screen
2. Expand batch details
3. Click "Accept Batch" button
4. Verify:
   - Loading state shows
   - Success alert appears
   - Navigates to delivery screen
   - Order count updates (WebSocket)

---

## 🔄 Data Flow

```
User clicks "Accept Batch"
  ↓
handleAcceptBatch() called
  ↓
apiService.acceptManualOrders(riderId, orderIds)
  ↓
POST /api/rider/manual-accept-orders/
  ↓
Backend validates orders
  ↓
RiderAssignment.create_batch_assignment()
  ↓
broadcast_rider_order_count_update() ← WebSocket update
  ↓
Returns { assignment_id, orders_count, total_earnings }
  ↓
Frontend navigates to /delivery/{assignment_id}
  ↓
Delivery tracking screen loads
```

---

## 🚨 Error Handling

### Backend Validation:
- Rider doesn't exist → 404 error
- Orders already assigned → 400 error
- Orders can't be batched → 400 error
- Database error → 500 error

### Frontend Handling:
- Show alert with error message
- Reset loading state
- Allow retry
- Log error for debugging

---

## ✅ Success Criteria

1. ✅ Backend endpoint accepts orders and creates assignments
2. ✅ Frontend button triggers acceptance flow
3. ✅ Loading state shows during processing
4. ✅ Success alert shows earnings
5. ✅ Navigates to delivery tracking screen
6. ✅ Order count updates in real-time (WebSocket)
7. ✅ Other riders see count decrease immediately

---

## 📌 Key Implementation Notes

### Reuse Existing Logic:
- Use `RiderAssignment.create_batch_assignment()` - already tested
- Use `broadcast_rider_order_count_update()` - already wired
- Follow same pattern as `accept_dispatch_offer` endpoint

### Differences from Dispatch Offers:
- **No DispatchOffer record** - manual acceptance doesn't need tracking
- **No timeout** - rider makes decision immediately
- **No rejection handling** - if they don't want it, they don't click

### Safety Checks:
- Verify orders aren't already assigned
- Validate rider is active and approved
- Check orders can be batched (if multiple)
- Use database transactions for atomicity

---

**Ready to implement! 🚀**

