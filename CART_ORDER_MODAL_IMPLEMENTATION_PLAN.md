# Cart Order Modal Implementation Plan
## PharmacyDashboard - New Modal for Non-Prescription Orders

---

## 📋 **Review Summary**

### **Current State**

#### **Existing Modal (Prescription Orders):**
```
┌─────────────────────────────────────────────────────────────┐
│  [X Close]                                                  │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   Prescription Image     │  Match Prescription Items        │
│   (Left Side)            │  (Right Side)                    │
│                          │                                  │
│   - Shows prescription   │  - Search inventory              │
│   - Or chat panel        │  - Select items                  │
│                          │  - Add items to order            │
│                          │  - Send pricing to customer      │
│                          │  - Prepare Order button          │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

#### **Order Types:**
1. **Prescription Orders** (`isPrescriptionOrder: true`)
   - Has `prescription_image_url`
   - Total starts at ₱0.00
   - Pharmacy adds items
   - Pharmacy sends pricing
   - Customer approves
   - Then pharmacy prepares

2. **Cart Orders** (`isPrescriptionOrder: false`)
   - No prescription image
   - Items already selected
   - Total already calculated
   - May have senior discount request
   - Pharmacy reviews/accepts immediately

---

## 🎯 **New Modal Requirements**

### **Cart Order Modal Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Order #ORD20251025001  [X Close]                          │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   CHAT PANEL             │  ORDER DETAILS & ACTIONS         │
│   (Left Side)            │  (Right Side)                    │
│                          │                                  │
│   [Chat with Customer]   │  📦 Order Items:                 │
│   - Message history      │  - 2x Biogesic @ ₱15.00          │
│   - Input field          │  - 1x Amoxicillin @ ₱160.00      │
│   - Send button          │                                  │
│                          │  💰 Order Summary:               │
│   ──────────────────     │  - Subtotal: ₱190.00             │
│                          │  - Service Fee: ₱19.00           │
│   SENIOR ID IMAGE        │  - Delivery: ₱45.42              │
│   (if available)         │  - Total: ₱254.42                │
│                          │                                  │
│   [Photo of ID]          │  💚 Senior Discount:             │
│   or                     │  [Approve] [Reject]              │
│   "No senior discount"   │                                  │
│                          │  ✅ Action:                      │
│                          │  [Accept Order]                  │
│                          │  [Reject Order]                  │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 🔍 **Backend Review**

### **1. Senior Discount Endpoints** ✅

#### **Approve/Reject:**
```
POST /api/orders/pharmacy-review-senior-discount/<order_id>/
{
  "pharmacy_user_id": 5,
  "action": "approve" | "reject",
  "notes": "ID verified" (optional)
}

Response:
{
  "success": true,
  "message": "Senior discount approved successfully",
  "action": "approved",
  "discount_amount": 38.00,
  "new_total": 216.42,
  "order_id": 97,
  "order_number": "ORD20251025001"
}
```

#### **Get Details:**
```
GET /api/orders/senior-discount-details/<order_id>/

Response:
{
  "success": true,
  "senior_discount_requested": true,
  "senior_citizen_id_image": "https://cloudinary.com/...",
  "senior_discount_status": "pending",
  "potential_discount": 38.00,
  "subtotal": 190.00,
  "total_amount": 254.42
}
```

### **2. Order Status Update**

#### **Method on Order Model:**
```python
order.update_status(Order.OrderStatus.ACCEPTED, notes="Order accepted by pharmacy")
```

**Status Flow:**
```
PENDING → ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
```

### **3. Order Data Structure**

```python
Order:
  - id: 97
  - order_number: "ORD20251025001"
  - order_status: "pending" | "accepted" | "preparing" | ...
  - payment_status: "unpaid" | "paid"
  - subtotal: 190.00
  - tax_amount: 19.00 (service fee)
  - delivery_fee: 45.42
  - discount_amount: 0.00 (or 38.00 if approved)
  - total_amount: 254.42
  - isPrescriptionOrder: false (frontend flag)
  - senior_discount_requested: true
  - senior_citizen_id_image: "https://..."
  - senior_discount_status: "pending" | "approved" | "rejected"
  - order_lines: [
      {inventory_item, quantity, unit_price, total_price}
    ]
```

---

## 📝 **Implementation Steps** (Strategic Order)

### **PHASE 1: Backend Foundation** ✅ (Already Exists!)

- ✅ Senior discount endpoints exist
- ✅ Order status update method exists
- ⚠️ Need: Direct endpoint for accepting cart orders

### **PHASE 2: Create Accept Cart Order Endpoint** 

**File:** `backend/api/direct/views_ops.py`

**New Function:** `accept_cart_order(request, order_id)`

```python
@csrf_exempt
def accept_cart_order(request, order_id):
    """
    Pharmacy accepts a cart order
    
    POST /api/accept-cart-order/<order_id>/
    {
      "pharmacy_user_id": 5,
      "notes": "" (optional)
    }
    """
    # 1. Get order
    # 2. Verify it's a cart order (has items with prices)
    # 3. Update status to 'accepted'
    # 4. Return success
```

**Add URL Route:** `backend/api/direct/urls.py`
```python
path('accept-cart-order/<int:order_id>/', ops.accept_cart_order),
```

### **PHASE 3: Frontend Modal Component**

#### **Step 3.1: Detect Order Type**

```javascript
const isCartOrder = !order.isPrescriptionOrder && 
                    order.totalAmount > 0 &&
                    Array.isArray(order.items) && 
                    order.items.length > 0;
```

#### **Step 3.2: Create Cart Order Modal**

**Component Structure:**
```jsx
{selectedOrder && (
  <div className="modal">
    {selectedOrder.isPrescriptionOrder ? (
      // Existing prescription modal
      <PrescriptionOrderModal />
    ) : (
      // NEW: Cart order modal
      <CartOrderModal />
    )}
  </div>
)}
```

#### **Step 3.3: Cart Order Modal Layout**

**Left Side:**
- Chat panel (reuse existing chat code)
- Senior ID image (if `senior_discount_requested === true`)
- Separator line

**Right Side:**
- Order details (items list, summary)
- Senior discount actions (if requested)
- Accept/Reject order buttons

### **PHASE 4: Wire Backend Endpoints**

#### **Step 4.1: Senior Discount Functions**

```javascript
const handleApproveSeniorDiscount = async (orderId) => {
  const base = process.env.REACT_APP_BACKEND_URL;
  const response = await fetch(
    `${base}/api/orders/pharmacy-review-senior-discount/${orderId}/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacy_user_id: userInfo.id,
        action: 'approve',
        notes: 'Senior ID verified'
      })
    }
  );
  const data = await response.json();
  if (data.success) {
    // Update order display
    // Refresh orders
  }
};

const handleRejectSeniorDiscount = async (orderId) => {
  // Similar to approve, but action: 'reject'
};
```

#### **Step 4.2: Accept Order Function**

```javascript
const handleAcceptCartOrder = async (orderId) => {
  const base = process.env.REACT_APP_BACKEND_URL;
  const response = await fetch(
    `${base}/api/accept-cart-order/${orderId}/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pharmacy_user_id: userInfo.id,
        notes: ''
      })
    }
  );
  const data = await response.json();
  if (data.success) {
    // Move order to preparing
    // Close modal
    // Refresh orders
  }
};
```

### **PHASE 5: Testing**

**Test Scenarios:**
1. Cart order without senior discount
2. Cart order with senior discount (pending)
3. Approve senior discount → verify total updates
4. Reject senior discount → verify total updates
5. Accept order → verify status changes
6. Chat functionality with customer

---

## 🔧 **Detailed Step Sequence**

### **Step 1: Create Backend Endpoint** ✅
- Create `accept_cart_order` function
- Add URL route
- Test with curl/Postman

### **Step 2: Review Current Modal Code** ✅
- Understand structure
- Identify reusable components (chat)
- Plan separation

### **Step 3: Design Component Structure** ✅
- Conditional rendering based on `isPrescriptionOrder`
- Separate components for clarity

### **Step 4: Implement Cart Modal UI** ✅
- Left side: Chat + Senior ID
- Right side: Details + Actions
- Responsive layout

### **Step 5: Wire Senior Discount API** ✅
- Approve button → API call
- Reject button → API call
- Update UI on success

### **Step 6: Wire Accept Order API** ✅
- Accept button → API call
- Update order status
- Move to preparing list

### **Step 7: Test End-to-End** ✅
- Place cart order from mobile
- View in pharmacy dashboard
- Approve/reject senior discount
- Accept order
- Verify status changes

---

## 📊 **Data Flow Diagram**

```
Customer Places Cart Order (Mobile App)
          ↓
Order Created in Database
  - order_status: "pending"
  - senior_discount_status: "pending" (if requested)
  - items: [...with prices]
  - total: calculated
          ↓
Pharmacy Dashboard Fetches Orders
  - GET /api/pharmacy-orders/{pharmacy_id}/
  - Receives order with isPrescriptionOrder: false
          ↓
Pharmacy Clicks "View" on Cart Order
          ↓
NEW Cart Order Modal Opens
  - Left: Chat + Senior ID
  - Right: Details + Actions
          ↓
Pharmacy Reviews Senior ID (if requested)
          ↓
Option 1: Approve Senior Discount
  - POST /api/orders/pharmacy-review-senior-discount/{order_id}/
  - action: "approve"
  - Order recalculates: total -= discount
  - UI updates to show new total
          ↓
Option 2: Reject Senior Discount
  - POST /api/orders/pharmacy-review-senior-discount/{order_id}/
  - action: "reject"
  - Order stays at full price
  - Customer notified (optional)
          ↓
Pharmacy Accepts Order
  - POST /api/accept-cart-order/{order_id}/
  - Order status: "pending" → "accepted"
  - Order moves to "Preparing" list
  - Auto-dispatch triggered (signal)
          ↓
Order Now in Preparing Queue
  - Pharmacy prepares items
  - Marks as "Ready" when done
```

---

## 🎨 **UI Components Breakdown**

### **1. CartOrderModal Component**

```jsx
<div className="modal-container">
  <div className="modal-header">
    <h2>Order #{order.order_number}</h2>
    <button onClick={handleClose}>×</button>
  </div>
  
  <div className="modal-body-grid">
    {/* Left Side */}
    <div className="left-panel">
      <ChatPanel order={order} />
      {order.senior_discount_requested && (
        <SeniorIDSection order={order} />
      )}
    </div>
    
    {/* Right Side */}
    <div className="right-panel">
      <OrderItemsList items={order.items} />
      <OrderSummary order={order} />
      {order.senior_discount_requested && order.senior_discount_status === 'pending' && (
        <SeniorDiscountActions 
          orderId={order.id}
          onApprove={handleApproveSeniorDiscount}
          onReject={handleRejectSeniorDiscount}
        />
      )}
      <OrderActions 
        orderId={order.id}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
      />
    </div>
  </div>
</div>
```

### **2. Component Details**

#### **ChatPanel** (Reuse existing)
- Message list
- Input field
- Send button
- Typing indicator

#### **SeniorIDSection** (NEW)
```jsx
<div className="senior-id-section">
  <h3>Senior Citizen ID</h3>
  {order.senior_citizen_id_image ? (
    <img 
      src={order.senior_citizen_id_image} 
      alt="Senior ID"
      onClick={() => openFullscreen()}
    />
  ) : (
    <p>No senior ID uploaded</p>
  )}
  <div className="status-badge">
    Status: {order.senior_discount_status}
  </div>
</div>
```

#### **OrderItemsList** (NEW)
```jsx
<div className="order-items">
  <h3>Order Items</h3>
  {order.items.map(item => (
    <div key={item.id} className="item-row">
      <span>{item.quantity}x {item.name}</span>
      <span>₱{item.total_price.toFixed(2)}</span>
    </div>
  ))}
</div>
```

#### **OrderSummary** (NEW)
```jsx
<div className="order-summary">
  <div className="summary-row">
    <span>Subtotal:</span>
    <span>₱{order.subtotal.toFixed(2)}</span>
  </div>
  <div className="summary-row">
    <span>Service Fee:</span>
    <span>₱{order.tax_amount.toFixed(2)}</span>
  </div>
  <div className="summary-row">
    <span>Delivery Fee:</span>
    <span>₱{order.delivery_fee.toFixed(2)}</span>
  </div>
  {order.discount_amount > 0 && (
    <div className="summary-row discount">
      <span>Senior Discount:</span>
      <span>-₱{order.discount_amount.toFixed(2)}</span>
    </div>
  )}
  <div className="summary-row total">
    <span>Total:</span>
    <span>₱{order.total_amount.toFixed(2)}</span>
  </div>
</div>
```

#### **SeniorDiscountActions** (NEW)
```jsx
<div className="senior-actions">
  <h3>Senior Citizen Discount Review</h3>
  <p>Potential Discount: ₱{potentialDiscount.toFixed(2)} (20%)</p>
  
  {order.senior_discount_status === 'pending' && (
    <div className="action-buttons">
      <button 
        onClick={() => onApprove(order.id)}
        className="approve-btn"
      >
        ✓ Approve Discount
      </button>
      <button 
        onClick={() => onReject(order.id)}
        className="reject-btn"
      >
        ✗ Reject Discount
      </button>
    </div>
  )}
  
  {order.senior_discount_status === 'approved' && (
    <div className="status-approved">
      ✓ Senior discount approved
    </div>
  )}
  
  {order.senior_discount_status === 'rejected' && (
    <div className="status-rejected">
      ✗ Senior discount rejected
    </div>
  )}
</div>
```

#### **OrderActions** (NEW)
```jsx
<div className="order-actions">
  <button 
    onClick={() => onAccept(order.id)}
    className="accept-order-btn"
    disabled={order.order_status !== 'pending'}
  >
    ✓ Accept & Start Preparing
  </button>
  
  <button 
    onClick={() => onReject(order.id)}
    className="reject-order-btn"
  >
    ✗ Reject Order
  </button>
</div>
```

---

## 📂 **Files to Create/Modify**

### **Backend:**
1. ✅ `backend/api/direct/views_ops.py` - Add `accept_cart_order` function
2. ✅ `backend/api/direct/urls.py` - Add route
3. ⚠️ Already exists: Senior discount endpoints

### **Frontend:**
1. ✅ `web-frontend/src/components/PharmacyDashboard.js` - Add cart order modal

---

## 🔧 **Strategic Implementation Order**

```
STEP 1: Backend Endpoint [15 min]
├── Create accept_cart_order function
├── Add URL route
└── Test with script

STEP 2: Review Current Code [10 min]
├── Understand modal structure
├── Identify reusable chat code
└── Plan component separation

STEP 3: Design Modal Logic [10 min]
├── Add order type detection
├── Add conditional rendering
└── Plan state management

STEP 4: Implement Left Panel [30 min]
├── Reuse chat panel code
├── Add senior ID image display
└── Style layout

STEP 5: Implement Right Panel [30 min]
├── Create order items list
├── Create order summary
├── Add senior discount UI
└── Add action buttons

STEP 6: Wire Senior Discount [20 min]
├── Approve button → API
├── Reject button → API
└── Update order display

STEP 7: Wire Accept Order [20 min]
├── Accept button → API
├── Update order status
└── Move to preparing

STEP 8: Testing [30 min]
├── Test prescription orders (ensure no regression)
├── Test cart orders without senior discount
├── Test cart orders with senior discount
└── Test status transitions

Total: ~2.5 hours
```

---

## 🧪 **Test Plan**

### **Test Script:** `backend/test_accept_cart_order.py`

```python
# Test accepting cart order
# Test senior discount approval
# Test order status change
```

### **Manual Testing:**

#### **Test 1: Cart Order (No Senior Discount)**
1. Place order from mobile (no senior ID)
2. View in pharmacy dashboard
3. See cart modal (not prescription modal)
4. No senior discount section
5. Click "Accept Order"
6. Verify order moves to preparing

#### **Test 2: Cart Order (With Senior Discount - Approve)**
1. Place order from mobile (with senior ID)
2. View in pharmacy dashboard
3. See senior ID image
4. Click "Approve Discount"
5. See total update (reduced)
6. Click "Accept Order"
7. Verify order moves to preparing

#### **Test 3: Cart Order (With Senior Discount - Reject)**
1. Place order from mobile (with senior ID)
2. View in pharmacy dashboard
3. See senior ID image
4. Click "Reject Discount"
5. See total update (full price)
6. Click "Accept Order"
7. Verify order moves to preparing

#### **Test 4: Prescription Order (Regression)**
1. Place prescription order from mobile
2. View in pharmacy dashboard
3. See prescription modal (existing)
4. Verify no regression
5. Add items, send pricing
6. Verify workflow unchanged

---

## 📋 **Detailed Implementation Tasks**

### **Task 1: Create Backend Accept Endpoint** 
**File:** `backend/api/direct/views_ops.py`
```python
@csrf_exempt  
def accept_cart_order(request, order_id):
    # Implementation
```

### **Task 2: Add URL Route**
**File:** `backend/api/direct/urls.py`
```python
path('accept-cart-order/<int:order_id>/', ops.accept_cart_order),
```

### **Task 3: Modify PharmacyDashboard.js**
- Add order type detection
- Add cart modal rendering
- Add senior discount handlers
- Add accept order handler

### **Task 4: Test Everything**
- Backend script test
- Manual frontend test
- End-to-end test

---

## 🚀 **API Endpoints Summary**

### **Existing (Ready to Use):**
```
✅ GET  /api/pharmacy-orders/{pharmacy_id}/
✅ POST /api/orders/pharmacy-review-senior-discount/{order_id}/
✅ GET  /api/orders/senior-discount-details/{order_id}/
✅ GET  /api/order-chat-room/ (existing chat)
✅ POST /api/order-chat-send/
✅ GET  /api/order-chat-messages/
```

### **To Create:**
```
⚠️ POST /api/accept-cart-order/{order_id}/
⚠️ POST /api/reject-cart-order/{order_id}/ (optional)
```

---

## 💡 **Additional Features (Optional)**

### **Nice-to-Have:**
1. **Order Rejection**
   - Reject button for cart orders
   - Send reason to customer
   - Refund if paid

2. **Bulk Actions**
   - Accept multiple orders at once
   - Approve all pending senior discounts

3. **Notifications**
   - Notify customer when order accepted
   - Notify customer when senior discount approved/rejected

4. **Analytics**
   - Track senior discount approval rate
   - Track cart vs prescription order ratio

---

## 📸 **Visual Mockup**

### **Cart Order Modal (With Senior Discount):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Order #ORD20251025153740                              [X Close] │
├──────────────────────────────┬───────────────────────────────────┤
│                              │                                   │
│  💬 Chat with Customer       │  📦 Order Items (3)               │
│  ─────────────────────────   │  ───────────────────────────────  │
│                              │  • 2x Biogesic        ₱30.00     │
│  Customer: Hi, when will     │  • 2x Accebact        ₱320.00    │
│  you deliver?                │  • 2x Farmaxillin     ₱120.00    │
│                              │                                   │
│  You: We'll prepare now!     │  💰 Order Summary                │
│                              │  ───────────────────────────────  │
│  [Type a message...]  [Send] │  Subtotal:     ₱470.00           │
│                              │  Service Fee:  ₱0.00 (waived)    │
│  ─────────────────────────   │  Delivery Fee: ₱45.42            │
│                              │  Discount:     -₱94.00 (pending) │
│  💚 Senior Citizen ID        │  ─────────────────────────────────│
│  ─────────────────────────   │  Total:        ₱421.42*          │
│                              │  * Pending approval               │
│  [Photo of Senior ID]        │                                   │
│  Click to enlarge            │  💚 Senior Discount Review       │
│                              │  ───────────────────────────────  │
│  Status: Pending Review      │  Potential: ₱94.00 (20%)         │
│                              │  [✓ Approve] [✗ Reject]          │
│                              │                                   │
│                              │  🎯 Order Actions                │
│                              │  ───────────────────────────────  │
│                              │  [✓ Accept & Prepare Order]      │
│                              │  [✗ Reject Order]                │
│                              │                                   │
└──────────────────────────────┴───────────────────────────────────┘
```

---

## ✅ **Checklist**

### **Backend:**
- [ ] Create `accept_cart_order` endpoint
- [ ] Add URL route
- [ ] Test endpoint
- [x] Senior discount endpoints (already exist)

### **Frontend:**
- [ ] Add order type detection logic
- [ ] Create cart modal component
- [ ] Implement chat panel (reuse)
- [ ] Implement senior ID display
- [ ] Implement order items list
- [ ] Implement order summary
- [ ] Wire approve senior discount
- [ ] Wire reject senior discount
- [ ] Wire accept order
- [ ] Handle UI updates
- [ ] Test all flows

---

## 🚀 **Ready to Implement!**

**Estimated Time:** 2-3 hours
**Complexity:** Medium-High
**Impact:** High (enables cart order management)

---

**Shall I proceed with implementation?** ✅

