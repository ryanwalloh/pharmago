# 🎯 Senior Discount Workflow - Implementation Plan

## 📋 **Feature Overview**

Implement a complete senior citizen discount approval/rejection workflow with excellent UX for both pharmacy and customer.

---

## 🔍 **Current State Review**

### **Backend Endpoints (Existing ✅):**
```
POST /api/orders/pharmacy-review-senior-discount/<order_id>/
  - Actions: approve | reject
  - Updates order totals
  - Records review date and user

POST /api/accept-cart-order/<order_id>/
  - Accepts cart order
  - Changes status: pending → accepted

POST /api/order-chat-send/
  - Sends chat messages
```

### **Frontend Handlers (Existing ✅):**
```javascript
- handleApproveSeniorDiscount(orderId)
- handleRejectSeniorDiscount(orderId)  
- handleAcceptCartOrder(orderId)
```

---

## 🎨 **Proposed UX Flow**

### **FLOW 1: Accept Order with Senior Discount**
```
Pharmacy clicks "Accept & Start Preparing Order"
  ↓
IF senior discount is pending:
  ├─ Auto-approve senior discount
  ├─ Update order status → accepted
  ├─ Send chat message: "Your order has been accepted! Your senior discount of ₱X has been approved. Total: ₱Y"
  └─ Close modal, move to preparing
  
ELSE (no senior discount or already reviewed):
  ├─ Update order status → accepted
  ├─ Send chat message: "Your order has been accepted and is being prepared!"
  └─ Close modal, move to preparing
```

**UI Changes:**
- ✅ Remove separate "Approve Discount" button
- ✅ "Accept Order" button handles both actions
- ✅ Auto-send confirmation message via chat

---

### **FLOW 2: Reject Senior Discount**
```
Pharmacy clicks "Reject Discount"
  ↓
Show reason selection modal:
  ┌────────────────────────────────────────────┐
  │  Reason for Rejecting Senior Discount     │
  ├────────────────────────────────────────────┤
  │  ○ ID image is unclear/unreadable         │
  │  ○ ID appears to be expired                │
  │  ○ ID does not match customer info         │
  │  ○ Customer does not appear to be 60+      │
  │  ○ Other reason                            │
  │                                            │
  │  [Text area for custom reason if "Other"]  │
  │                                            │
  │  [Cancel]  [Submit Rejection]             │
  └────────────────────────────────────────────┘
  ↓
Pharmacy selects reason & clicks "Submit Rejection"
  ↓
Backend updates senior_discount_status → rejected
  ↓
Auto-send friendly message to customer:
  "We're sorry, but we couldn't verify your senior citizen ID. 
   Reason: [selected reason]
   
   Would you like to proceed with your order at the regular price?"
  ↓
Customer receives message with action buttons:
  [Cancel Order]  [Proceed with Order]
```

**Customer Actions (Mobile App):**
- **Cancel Order:**
  - Updates order_status → cancelled
  - Sends message to pharmacy: "Customer cancelled the order."
  - Shows cancellation in pharmacy modal

- **Proceed with Order:**
  - Keeps order active with no discount
  - Sends message to pharmacy: "Customer will proceed with the order at regular price."
  - Pharmacy can then accept the order

---

## 📝 **Implementation Tasks**

### **Step 1: Backend - Update Accept Cart Order Endpoint**
**File:** `backend/api/direct/views_ops.py`

- [x] Modify `accept_cart_order()` function
- [x] Check if order has pending senior discount
- [x] If yes, auto-approve it
- [x] Calculate new totals
- [x] Return discount info for chat message

**Expected JSON Response:**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "order_status": "accepted",
  "senior_discount_auto_approved": true,
  "discount_amount": 94.00,
  "new_total": 421.42,
  "senior_discount_message": "Your order has been accepted! Your senior discount of ₱94.00 has been approved."
}
```

---

### **Step 2: Backend - Create Cancel Order Endpoint**
**File:** `backend/api/orders/views.py` (or new file)

- [x] Create `cancel_order()` endpoint
- [x] POST `/api/orders/cancel/<order_id>/`
- [x] Updates order_status → cancelled
- [x] Returns success

**Expected JSON:**
```json
{
  "order_id": 5,
  "customer_id": 10,
  "reason": "Senior discount rejected, customer cancelled"
}
```

---

### **Step 3: Frontend - Update Accept Order Handler**
**File:** `web-frontend/src/components/PharmacyDashboard.js`

- [x] Modify `handleAcceptCartOrder()`
- [x] Check if response includes `senior_discount_auto_approved`
- [x] If yes, send chat message with discount confirmation
- [x] Update UI to reflect approved status

**Code Changes:**
```javascript
const handleAcceptCartOrder = async (orderId) => {
  // ... existing code ...
  
  if (data.success) {
    // If senior discount was auto-approved, send confirmation message
    if (data.senior_discount_auto_approved && chatRoom) {
      const confirmMsg = data.senior_discount_message || 
        `Your order has been accepted! Your senior discount of ₱${data.discount_amount.toFixed(2)} has been approved. Total: ₱${data.new_total.toFixed(2)}`;
      
      await fetch(`${base}/api/order-chat-send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room_id: chatRoom.id, 
          pharmacy_id: pharmacy?.id, 
          content: confirmMsg 
        })
      });
    } else if (chatRoom) {
      // Regular acceptance message
      await fetch(`${base}/api/order-chat-send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room_id: chatRoom.id, 
          pharmacy_id: pharmacy?.id, 
          content: "Your order has been accepted and is being prepared!" 
        })
      });
    }
    
    // Move order to preparing...
  }
};
```

---

### **Step 4: Frontend - Implement Rejection Reason Modal**
**File:** `web-frontend/src/components/PharmacyDashboard.js`

- [x] Create state for rejection modal
- [x] Create rejection reason options
- [x] Implement modal UI
- [x] Handle reason selection
- [x] Submit rejection with reason

**Rejection Reasons:**
```javascript
const REJECTION_REASONS = [
  { value: 'unclear_image', label: 'ID image is unclear or unreadable' },
  { value: 'expired_id', label: 'ID appears to be expired' },
  { value: 'mismatch_info', label: 'ID does not match customer information' },
  { value: 'age_verification', label: 'Customer does not appear to be 60 years or older' },
  { value: 'other', label: 'Other reason (please specify)' }
];
```

**UI Component:**
```jsx
{showRejectModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg max-w-md">
      <h3 className="text-lg font-semibold mb-4">Reason for Rejecting Senior Discount</h3>
      
      <div className="space-y-2 mb-4">
        {REJECTION_REASONS.map(reason => (
          <label key={reason.value} className="flex items-center">
            <input 
              type="radio" 
              name="rejectReason"
              value={reason.value}
              checked={selectedRejectReason === reason.value}
              onChange={(e) => setSelectedRejectReason(e.target.value)}
              className="mr-2"
            />
            {reason.label}
          </label>
        ))}
      </div>
      
      {selectedRejectReason === 'other' && (
        <textarea
          className="w-full border p-2 rounded mb-4"
          placeholder="Please specify the reason..."
          value={customRejectReason}
          onChange={(e) => setCustomRejectReason(e.target.value)}
        />
      )}
      
      <div className="flex gap-2">
        <button 
          onClick={() => setShowRejectModal(false)}
          className="flex-1 bg-gray-300 px-4 py-2 rounded"
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmitRejection}
          className="flex-1 bg-red-600 text-white px-4 py-2 rounded"
        >
          Submit Rejection
        </button>
      </div>
    </div>
  </div>
)}
```

---

### **Step 5: Frontend - Update Reject Handler**
**File:** `web-frontend/src/components/PharmacyDashboard.js`

- [x] Modify `handleRejectSeniorDiscount()`
- [x] Show modal instead of prompt
- [x] After rejection, update order totals in UI
- [x] Display new total to customer in rejection message
- [x] Send friendly message to customer
- [x] Include action buttons in message (if possible via chat system)

**IMPORTANT:** Backend automatically:
- ✅ Removes senior discount (₱0.00)
- ✅ Restores service fee (₱19.00)
- ✅ Recalculates total to full price

**Rejection Message Template:**
```javascript
const getRejectionMessage = (reason, newTotal) => {
  const baseMessages = {
    'unclear_image': "We're sorry, but we couldn't verify your senior citizen ID because the image is unclear.",
    'expired_id': "We're sorry, but the senior citizen ID appears to be expired.",
    'mismatch_info': "We're sorry, but the ID information doesn't match your order details.",
    'age_verification': "We're sorry, but we couldn't verify senior citizen eligibility.",
    'other': `We're sorry, but we couldn't verify your senior citizen ID. ${customReason}.`
  };
  
  const message = baseMessages[reason] || baseMessages['other'];
  return `${message}\n\nYour order total is now ₱${newTotal.toFixed(2)} (regular price).\n\nWould you like to proceed with your order at the regular price?`;
};
```

---

### **Step 6: Mobile App - Add Action Buttons to Chat**
**File:** `mobileapp/apps/customer-app/screens/OrderTrackingScreen.tsx`

- [x] Detect rejection message pattern
- [x] Show action buttons: [Cancel Order] [Proceed with Order]
- [x] Wire "Cancel Order" button → `/api/orders/cancel/<order_id>/`
- [x] Wire "Proceed" button → Send chat message

**UI for Customer:**
```tsx
{message.content.includes('proceed with your order') && (
  <View style={styles.actionButtons}>
    <TouchableOpacity 
      style={styles.cancelButton}
      onPress={() => handleCancelOrder()}
    >
      <Text>Cancel Order</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={styles.proceedButton}
      onPress={() => handleProceedWithOrder()}
    >
      <Text>Proceed with Order</Text>
    </TouchableOpacity>
  </View>
)}
```

---

### **Step 7: Mobile App - Handle Customer Actions**
**File:** `mobileapp/apps/customer-app/screens/OrderTrackingScreen.tsx`

**Cancel Order:**
```typescript
const handleCancelOrder = async () => {
  try {
    const response = await apiService.cancelOrder(orderId, {
      customer_id: customerId,
      reason: 'Senior discount rejected, customer cancelled'
    });
    
    if (response.success) {
      // Send cancellation message to pharmacy
      await apiService.sendOrderChatMessage(chatRoomId, {
        customer_id: customerId,
        content: "I have cancelled this order."
      });
      
      // Navigate back or show cancellation screen
      Alert.alert('Order Cancelled', 'Your order has been cancelled.');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to cancel order');
  }
};
```

**Proceed with Order:**
```typescript
const handleProceedWithOrder = async () => {
  try {
    // Just send a message to pharmacy
    await apiService.sendOrderChatMessage(chatRoomId, {
      customer_id: customerId,
      content: "I will proceed with the order at the regular price."
    });
    
    Alert.alert('Message Sent', 'The pharmacy has been notified.');
  } catch (error) {
    Alert.alert('Error', 'Failed to send message');
  }
};
```

---

### **Step 8: Pharmacy Dashboard - Handle Cancelled Orders**
**File:** `web-frontend/src/components/PharmacyDashboard.js`

- [x] Listen for order status updates
- [x] If order status → cancelled, show in modal
- [x] Display cancellation message
- [x] Provide option to remove from list

**UI Update:**
```jsx
{selectedOrder.order_status === 'cancelled' && (
  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
    <p className="text-red-700 font-medium">
      This order has been cancelled by the customer.
    </p>
    <button 
      onClick={handleCloseModal}
      className="mt-2 bg-red-600 text-white px-4 py-2 rounded"
    >
      Close
    </button>
  </div>
)}
```

---

## 🗂️ **Files to Modify**

### **Backend:**
1. ✅ `backend/api/direct/views_ops.py` - Update `accept_cart_order()`
2. ✅ `backend/api/orders/views.py` - Add `cancel_order()` endpoint
3. ✅ `backend/api/orders/urls.py` - Add cancel endpoint route

### **Frontend (Pharmacy Dashboard):**
4. ✅ `web-frontend/src/components/PharmacyDashboard.js`
   - Update `handleAcceptCartOrder()`
   - Update `handleRejectSeniorDiscount()`
   - Add rejection modal UI
   - Add state management
   - Handle cancelled orders

### **Mobile App:**
5. ✅ `mobileapp/apps/customer-app/screens/OrderTrackingScreen.tsx`
   - Add action button detection
   - Implement `handleCancelOrder()`
   - Implement `handleProceedWithOrder()`

6. ✅ `mobileapp/apps/customer-app/services/api.ts`
   - Add `cancelOrder()` method

---

## 🧪 **Testing Checklist**

### **Test 1: Accept Order with Senior Discount**
- [ ] Create cart order with senior ID
- [ ] Pharmacy views order
- [ ] Click "Accept & Start Preparing Order"
- [ ] ✅ Senior discount auto-approved
- [ ] ✅ Confirmation message sent to customer
- [ ] ✅ Order moves to preparing
- [ ] ✅ Customer sees message in chat

### **Test 2: Reject Senior Discount**
- [ ] Create cart order with senior ID
- [ ] Pharmacy views order
- [ ] Click "Reject Discount"
- [ ] ✅ Modal shows with reasons
- [ ] Select reason
- [ ] Click "Submit Rejection"
- [ ] ✅ Discount rejected in backend
- [ ] ✅ Friendly message sent to customer
- [ ] ✅ Customer sees action buttons

### **Test 3: Customer Cancels Order**
- [ ] Customer receives rejection message
- [ ] Click "Cancel Order"
- [ ] ✅ Order status → cancelled
- [ ] ✅ Pharmacy sees cancellation message
- [ ] ✅ Pharmacy modal shows cancelled status

### **Test 4: Customer Proceeds with Order**
- [ ] Customer receives rejection message
- [ ] Click "Proceed with Order"
- [ ] ✅ Message sent to pharmacy
- [ ] ✅ Pharmacy can accept order
- [ ] ✅ Order continues normally

---

## 🎯 **Success Criteria**

✅ Pharmacy can accept order and auto-approve senior discount  
✅ Confirmation message sent automatically  
✅ Pharmacy can reject discount with reason selection  
✅ Customer receives friendly rejection message  
✅ Customer can cancel or proceed with order  
✅ All actions update database correctly  
✅ Chat messages flow smoothly  
✅ UX is intuitive and professional  

---

## 📊 **Implementation Sequence**

### **Phase 1: Backend Foundation** (30 min)
1. Update accept cart order endpoint
2. Create cancel order endpoint
3. Test endpoints

### **Phase 2: Pharmacy Dashboard** (45 min)
4. Update accept order handler
5. Create rejection modal UI
6. Wire rejection flow
7. Handle cancellation display

### **Phase 3: Mobile App** (45 min)
8. Add action button detection
9. Implement cancel handler
10. Implement proceed handler
11. Update API service

### **Phase 4: Testing** (30 min)
12. End-to-end testing
13. Edge case testing
14. UX refinement

**Total Estimated Time:** ~2.5 hours

---

**Ready to implement! This will provide an excellent user experience for both pharmacy and customers.** 🎉

