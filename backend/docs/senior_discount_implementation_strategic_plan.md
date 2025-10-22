# Senior Citizen Discount - Strategic Implementation Plan

## 🎯 Overview

**Feature:** Pharmacy-reviewed senior citizen discount system
**Discount:** 20% on medicine subtotal (Philippine RA 9994 compliance)
**Verification:** Per-order review by pharmacy

---

## 📊 Architecture Diagram

```
Customer (Mobile App)                Pharmacy (Web Dashboard)
┌─────────────────┐                 ┌──────────────────────┐
│   order.tsx     │                 │ PharmacyDashboard.js │
│                 │                 │                      │
│ 1. Toggle ON    │                 │ 4. View Order        │
│ 2. Upload ID    │──── Order ─────>│ 5. Review Senior ID  │
│ 3. Place Order  │     Created     │ 6. Approve/Reject    │
│                 │                 │ 7. Prepare Order     │
└─────────────────┘                 └──────────────────────┘
        │                                     │
        └────────── Backend API ──────────────┘
                  │
            ┌─────┴─────┐
            │   Order   │
            │   Model   │
            └───────────┘
         senior_discount_requested: bool
         senior_citizen_id_image: URL
         senior_discount_status: pending/approved/rejected
         discount_amount: Decimal
```

---

## 🗂️ Phase Breakdown

### **PHASE 1: Backend Foundation** (Estimated: 2-3 hours)
*Build the data layer first - everything else depends on this*

#### **Step 1.1: Database Migration** ⭐ START HERE
**File:** `backend/api/orders/models.py`

**New Fields to Add:**
```python
class Order(models.Model):
    # ... existing fields ...
    
    # Senior Citizen Discount Fields
    senior_discount_requested = models.BooleanField(
        default=False,
        help_text=_('Whether customer requested senior citizen discount')
    )
    
    senior_citizen_id_image = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text=_('Cloudinary URL for senior citizen ID photo')
    )
    
    senior_discount_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', _('Pending Review')),
            ('approved', _('Approved')),
            ('rejected', _('Rejected')),
            ('not_requested', _('Not Requested')),
        ],
        default='not_requested',
        help_text=_('Pharmacy approval status for senior discount')
    )
    
    senior_discount_reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='senior_discount_reviews',
        help_text=_('Pharmacy user who reviewed the senior discount')
    )
    
    senior_discount_review_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When senior discount was reviewed')
    )
    
    senior_discount_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Pharmacy notes about senior discount verification')
    )
```

**Commands:**
```bash
cd backend
python manage.py makemigrations api
python manage.py migrate api
```

**Success Criteria:**
- ✅ Migration files created
- ✅ Database updated with no errors
- ✅ Fields visible in Django admin

---

#### **Step 1.2: Backend API Endpoints**
**File:** `backend/api/orders/senior_discount_views.py` (NEW)

**Endpoint 1: Pharmacy Review Senior Discount**
```python
@csrf_exempt
def pharmacy_review_senior_discount(request, order_id):
    """
    POST /api/orders/pharmacy-review-senior-discount/<order_id>/
    
    Body:
    {
        pharmacy_user_id: int,
        action: 'approve' | 'reject',
        notes: str (optional)
    }
    
    Returns:
    {
        success: bool,
        message: str,
        discount_amount: float,
        new_total: float
    }
    """
    # 1. Validate pharmacy user
    # 2. Get order
    # 3. If approve: calculate 20% discount
    # 4. Update order.senior_discount_status
    # 5. Update order.discount_amount
    # 6. Recalculate order.total_amount
    # 7. Save and return
```

**Endpoint 2: Get Order Senior Discount Details**
```python
@csrf_exempt
def get_order_senior_discount_details(request, order_id):
    """
    GET /api/orders/senior-discount-details/<order_id>/
    
    Returns:
    {
        success: bool,
        senior_discount_requested: bool,
        senior_citizen_id_image: str,
        senior_discount_status: str,
        potential_discount: float,
        reviewed_by: str,
        review_date: str,
        notes: str
    }
    """
```

**File:** `backend/api/orders/urls.py`
```python
from .senior_discount_views import (
    pharmacy_review_senior_discount,
    get_order_senior_discount_details
)

urlpatterns = [
    # ... existing patterns ...
    path('pharmacy-review-senior-discount/<int:order_id>/', pharmacy_review_senior_discount),
    path('senior-discount-details/<int:order_id>/', get_order_senior_discount_details),
]
```

**Success Criteria:**
- ✅ Endpoints accessible
- ✅ Can approve/reject discount
- ✅ Order total recalculates correctly

---

#### **Step 1.3: Test Backend Endpoints**
**File:** `backend/test_senior_discount_api.py` (NEW)

```python
import requests
import json

BASE_URL = "http://localhost:8000/api/orders"

def test_approve_senior_discount():
    order_id = 1  # Replace with actual order ID
    response = requests.post(
        f"{BASE_URL}/pharmacy-review-senior-discount/{order_id}/",
        json={
            'pharmacy_user_id': 2,  # Replace with actual pharmacy user ID
            'action': 'approve',
            'notes': 'Valid senior citizen ID verified'
        }
    )
    print(f"Approve Response: {response.json()}")

def test_reject_senior_discount():
    order_id = 1
    response = requests.post(
        f"{BASE_URL}/pharmacy-review-senior-discount/{order_id}/",
        json={
            'pharmacy_user_id': 2,
            'action': 'reject',
            'notes': 'ID appears expired'
        }
    )
    print(f"Reject Response: {response.json()}")

if __name__ == '__main__':
    test_approve_senior_discount()
    # test_reject_senior_discount()
```

**Success Criteria:**
- ✅ Approve action works
- ✅ Reject action works
- ✅ Discount calculation correct (20%)
- ✅ Total amount updates

---

### **PHASE 2: Customer App (order.tsx)** (Estimated: 2-3 hours)
*Build the customer-facing UI*

#### **Step 2.1: Add Senior Discount UI Section**
**File:** `mobileapp/apps/customer-app/app/order.tsx`

**Add State Variables:**
```typescript
const [applySeniorDiscount, setApplySeniorDiscount] = useState(false);
const [seniorIdImage, setSeniorIdImage] = useState<string | null>(null);
const [uploadingSeniorId, setUploadingSeniorId] = useState(false);
```

**Add UI Section (after Search Field, before Products):**
```typescript
{/* Senior Citizen Discount Section */}
<View style={styles.seniorDiscountSection}>
  <View style={styles.seniorDiscountHeader}>
    <View>
      <Text style={styles.seniorDiscountTitle}>Senior Citizen Discount</Text>
      <Text style={styles.seniorDiscountSubtitle}>Get 20% off on medicines</Text>
    </View>
    <Switch
      value={applySeniorDiscount}
      onValueChange={setApplySeniorDiscount}
      trackColor={{ false: '#E0E0E0', true: '#00bf63' }}
      thumbColor={applySeniorDiscount ? '#FFFFFF' : '#F4F4F4'}
    />
  </View>
  
  {applySeniorDiscount && (
    <View style={styles.seniorIdUploadSection}>
      {!seniorIdImage ? (
        <TouchableOpacity 
          style={styles.uploadSeniorIdButton}
          onPress={handleUploadSeniorId}
          disabled={uploadingSeniorId}
        >
          {uploadingSeniorId ? (
            <ActivityIndicator color="#00bf63" />
          ) : (
            <>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text style={styles.uploadButtonText}>Upload Senior Citizen ID</Text>
              <Text style={styles.uploadSubtext}>Required for discount verification</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.seniorIdPreview}>
          <Image source={{ uri: seniorIdImage }} style={styles.seniorIdThumbnail} />
          <View style={styles.seniorIdInfo}>
            <Text style={styles.seniorIdUploadedText}>✓ Senior ID Uploaded</Text>
            <TouchableOpacity onPress={() => setSeniorIdImage(null)}>
              <Text style={styles.changeIdText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.seniorDiscountNote}>
        <Text style={styles.noteText}>
          ⓘ Discount subject to pharmacy verification
        </Text>
      </View>
    </View>
  )}
</View>
```

**Success Criteria:**
- ✅ Toggle switch works
- ✅ UI expands/collapses correctly
- ✅ Looks professional

---

#### **Step 2.2: Cloudinary Upload Integration**
**File:** `mobileapp/apps/customer-app/app/order.tsx`

**Add Upload Function:**
```typescript
const handleUploadSeniorId = async () => {
  try {
    setUploadingSeniorId(true);
    
    // Request permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access camera roll is required!');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imageUri, 'senior-citizen-ids');
      
      if (cloudinaryUrl) {
        setSeniorIdImage(cloudinaryUrl);
        console.log('✅ Senior ID uploaded:', cloudinaryUrl);
      }
    }
  } catch (error) {
    console.error('Failed to upload Senior ID:', error);
    alert('Failed to upload image. Please try again.');
  } finally {
    setUploadingSeniorId(false);
  }
};

const uploadToCloudinary = async (imageUri: string, folder: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'senior_id.jpg',
    } as any);
    formData.append('upload_preset', 'pharmago_uploads'); // Your Cloudinary preset
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
};
```

**Add Import:**
```typescript
import * as ImagePicker from 'expo-image-picker';
```

**Success Criteria:**
- ✅ Image picker opens
- ✅ Image uploads to Cloudinary
- ✅ URL is saved in state
- ✅ Thumbnail displays

---

#### **Step 2.3: Update Order Summary**
**File:** `mobileapp/apps/customer-app/app/order.tsx`

**Modify `calculateTotal()` function:**
```typescript
const calculateTotal = () => {
  const subtotal = calculateSubtotal();
  const deliveryFee = deliveryInfo?.delivery_fee || 0;
  
  // Calculate pending senior discount
  let seniorDiscount = 0;
  if (applySeniorDiscount && seniorIdImage) {
    seniorDiscount = subtotal * 0.20; // 20% discount
  }
  
  return subtotal + deliveryFee - seniorDiscount;
};
```

**Update Order Summary UI:**
```typescript
{/* Order Summary */}
<View style={styles.summaryContainer}>
  <Text style={styles.summaryTitle}>Order Summary</Text>
  
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>Subtotal</Text>
    <Text style={styles.summaryValue}>₱{calculateSubtotal().toFixed(2)}</Text>
  </View>
  
  {applySeniorDiscount && seniorIdImage && (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Senior Discount (20%)*</Text>
      <Text style={[styles.summaryValue, styles.discountValue]}>
        -₱{(calculateSubtotal() * 0.20).toFixed(2)}
      </Text>
    </View>
  )}
  
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>Delivery Fee</Text>
    <Text style={styles.summaryValue}>
      ₱{deliveryInfo?.delivery_fee?.toFixed(2) || '0.00'}
    </Text>
  </View>
  
  <View style={[styles.summaryRow, styles.totalRow]}>
    <Text style={styles.totalLabel}>Total</Text>
    <Text style={styles.totalValue}>
      ₱{calculateTotal().toFixed(2)}
      {applySeniorDiscount && seniorIdImage && '*'}
    </Text>
  </View>
  
  {applySeniorDiscount && seniorIdImage && (
    <Text style={styles.pendingNote}>
      * Pending pharmacy approval
    </Text>
  )}
</View>
```

**Success Criteria:**
- ✅ Discount shows in summary
- ✅ Total calculates correctly
- ✅ Pending note displays

---

#### **Step 2.4: Update Place Order Function**
**File:** `mobileapp/apps/customer-app/app/order.tsx`

**Modify `handlePlaceOrder()`:**
```typescript
const handlePlaceOrder = async () => {
  if (cartItems.length === 0) {
    alert('Please add at least one item to your order');
    return;
  }
  
  // Validate senior discount requirements
  if (applySeniorDiscount && !seniorIdImage) {
    alert('Please upload your Senior Citizen ID to apply the discount');
    return;
  }
  
  try {
    const orderData = {
      pharmacy_id: pharmacy.pharmacy_id,
      customer_id: customer.id,
      delivery_address_id: customer.primary_address_id,
      items: cartItems.map(item => ({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.price,
      })),
      
      // Senior discount data
      apply_senior_discount: applySeniorDiscount,
      senior_id_image_url: seniorIdImage,
      senior_discount_status: applySeniorDiscount && seniorIdImage ? 'pending' : 'not_requested',
      
      delivery_fee: deliveryInfo?.delivery_fee || 0,
      subtotal: calculateSubtotal(),
      total: calculateTotal(),
    };
    
    console.log('📦 Creating order with senior discount:', orderData);
    
    // TODO: Call API to create order
    const response = await apiService.createOrder(orderData);
    
    if (response.success) {
      // Clear cart and AsyncStorage
      setCartItems([]);
      await AsyncStorage.removeItem('temp_cart_items');
      
      alert('Order placed successfully!');
      router.push('/orders'); // Navigate to orders list
    }
  } catch (error: any) {
    console.error('Failed to place order:', error);
    alert('Failed to place order. Please try again.');
  }
};
```

**Success Criteria:**
- ✅ Validation works
- ✅ Senior discount data sent to backend
- ✅ Order created successfully

---

### **PHASE 3: Pharmacy Dashboard** (Estimated: 3-4 hours)
*Build the pharmacy review interface*

#### **Step 3.1: Create ViewOrderSupersearch Component**
**File:** `web-frontend/src/components/ViewOrderSupersearch.jsx` (NEW)

**Component Structure:**
```jsx
import React, { useState, useEffect } from 'react';
import './ViewOrderSupersearch.css';

const ViewOrderSupersearch = ({ order, onClose, onPrepareOrder }) => {
  const [seniorDiscountDetails, setSeniorDiscountDetails] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (order.senior_discount_requested) {
      fetchSeniorDiscountDetails();
    }
  }, [order.id]);

  const fetchSeniorDiscountDetails = async () => {
    // Fetch senior discount details from backend
  };

  const handleSeniorDiscountReview = async (action) => {
    // Call pharmacy_review_senior_discount endpoint
  };

  return (
    <div className="view-order-supersearch-modal">
      <div className="modal-header">
        <h2>Order #{order.order_number}</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="modal-body">
        {/* Left Side: Chat + Senior ID */}
        <div className="left-panel">
          {/* Chat Panel */}
          <div className="chat-panel">
            <h3>Customer Chat</h3>
            {/* Chat implementation */}
          </div>
          
          {/* Senior ID Viewer */}
          {order.senior_discount_requested && (
            <div className="senior-id-panel">
              <h3>Senior Citizen Discount Request</h3>
              {/* Senior ID viewer + approve/reject */}
            </div>
          )}
        </div>
        
        {/* Right Side: Order Details */}
        <div className="right-panel">
          <div className="order-details">
            <h3>Order Details</h3>
            {/* Order items, totals, etc. */}
          </div>
          
          <button className="prepare-order-btn" onClick={onPrepareOrder}>
            Prepare Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderSupersearch;
```

**Success Criteria:**
- ✅ Component renders
- ✅ Layout matches design (left/right split)
- ✅ Modal closes properly

---

#### **Step 3.2: Build Chat Panel (Left Side)**
**File:** `web-frontend/src/components/ViewOrderSupersearch.jsx`

**Chat Panel Section:**
```jsx
<div className="chat-panel">
  <div className="chat-header">
    <h3>Chat with Customer</h3>
    <span className="customer-name">{order.customer_name}</span>
  </div>
  
  <div className="chat-messages">
    {messages.map((msg, index) => (
      <div key={index} className={`message ${msg.sender}`}>
        <div className="message-content">{msg.text}</div>
        <div className="message-time">{msg.timestamp}</div>
      </div>
    ))}
  </div>
  
  <div className="chat-input">
    <input 
      type="text" 
      placeholder="Type a message..."
      value={chatMessage}
      onChange={(e) => setChatMessage(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
    />
    <button onClick={handleSendMessage}>Send</button>
  </div>
</div>
```

**Success Criteria:**
- ✅ Chat messages display
- ✅ Can send messages
- ✅ Real-time updates work

---

#### **Step 3.3: Build Senior ID Viewer (Left Side)**
**File:** `web-frontend/src/components/ViewOrderSupersearch.jsx`

**Senior ID Section:**
```jsx
{order.senior_discount_requested && (
  <div className="senior-id-panel">
    <div className="senior-id-header">
      <h3>🎟️ Senior Citizen Discount Request</h3>
      <span className={`status-badge ${order.senior_discount_status}`}>
        {order.senior_discount_status}
      </span>
    </div>
    
    {/* ID Image Viewer */}
    <div className="senior-id-viewer">
      <img 
        src={order.senior_citizen_id_image} 
        alt="Senior Citizen ID"
        className="senior-id-image"
        onClick={() => window.open(order.senior_citizen_id_image, '_blank')}
      />
      <p className="click-to-enlarge">Click image to enlarge</p>
    </div>
    
    {/* Discount Information */}
    <div className="discount-info">
      <div className="info-row">
        <span>Subtotal:</span>
        <span>₱{order.subtotal?.toFixed(2)}</span>
      </div>
      <div className="info-row discount-amount">
        <span>Senior Discount (20%):</span>
        <span>-₱{(order.subtotal * 0.20).toFixed(2)}</span>
      </div>
      <div className="info-row total">
        <span>New Total:</span>
        <span>₱{(order.subtotal - order.subtotal * 0.20 + order.delivery_fee).toFixed(2)}</span>
      </div>
    </div>
    
    {/* Review Actions - Only show if pending */}
    {order.senior_discount_status === 'pending' && (
      <>
        <div className="review-notes">
          <textarea 
            placeholder="Add notes (optional)"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="review-actions">
          <button 
            className="approve-btn"
            onClick={() => handleSeniorDiscountReview('approve')}
            disabled={processing}
          >
            {processing ? 'Processing...' : '✅ Approve Discount'}
          </button>
          
          <button 
            className="reject-btn"
            onClick={() => handleSeniorDiscountReview('reject')}
            disabled={processing}
          >
            {processing ? 'Processing...' : '❌ Reject Discount'}
          </button>
        </div>
      </>
    )}
    
    {/* Show approval/rejection status */}
    {order.senior_discount_status === 'approved' && (
      <div className="review-result approved">
        ✅ Discount Approved
        {order.senior_discount_notes && (
          <p className="review-notes-display">{order.senior_discount_notes}</p>
        )}
      </div>
    )}
    
    {order.senior_discount_status === 'rejected' && (
      <div className="review-result rejected">
        ❌ Discount Rejected
        {order.senior_discount_notes && (
          <p className="review-notes-display">Reason: {order.senior_discount_notes}</p>
        )}
      </div>
    )}
  </div>
)}
```

**Implement Review Function:**
```jsx
const handleSeniorDiscountReview = async (action) => {
  if (!window.confirm(`Are you sure you want to ${action} this senior discount?`)) {
    return;
  }
  
  setProcessing(true);
  try {
    const response = await fetch(
      `http://localhost:8000/api/orders/pharmacy-review-senior-discount/${order.id}/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_user_id: currentUser.id,
          action: action,
          notes: reviewNotes,
        }),
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      alert(`Senior discount ${action}d successfully!`);
      // Refresh order details
      window.location.reload(); // Or better: re-fetch order
    } else {
      alert(`Failed to ${action} discount: ${data.error}`);
    }
  } catch (error) {
    console.error('Review error:', error);
    alert('An error occurred. Please try again.');
  } finally {
    setProcessing(false);
  }
};
```

**Success Criteria:**
- ✅ Senior ID image displays
- ✅ Discount calculation shown
- ✅ Approve/reject buttons work
- ✅ Notes can be added
- ✅ Status updates after review

---

#### **Step 3.4: Build Order Details Panel (Right Side)**
**File:** `web-frontend/src/components/ViewOrderSupersearch.jsx`

**Order Details Section:**
```jsx
<div className="right-panel">
  <div className="order-details">
    <h3>Order Details</h3>
    
    {/* Customer Info */}
    <div className="customer-info-box">
      <h4>Customer Information</h4>
      <p><strong>Name:</strong> {order.customer_name}</p>
      <p><strong>Phone:</strong> {order.customer_phone}</p>
      <p><strong>Address:</strong> {order.delivery_address}</p>
    </div>
    
    {/* Order Items */}
    <div className="order-items-box">
      <h4>Order Items</h4>
      <table className="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.order_lines?.map((line, index) => (
            <tr key={index}>
              <td>{line.item_name}</td>
              <td>{line.quantity}</td>
              <td>₱{line.unit_price.toFixed(2)}</td>
              <td>₱{line.total_price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {/* Order Summary */}
    <div className="order-summary-box">
      <div className="summary-row">
        <span>Subtotal:</span>
        <span>₱{order.subtotal?.toFixed(2)}</span>
      </div>
      
      {order.discount_amount > 0 && (
        <div className="summary-row discount">
          <span>Senior Discount:</span>
          <span>-₱{order.discount_amount.toFixed(2)}</span>
        </div>
      )}
      
      <div className="summary-row">
        <span>Delivery Fee:</span>
        <span>₱{order.delivery_fee?.toFixed(2)}</span>
      </div>
      
      <div className="summary-row total">
        <span>TOTAL:</span>
        <span>₱{order.total_amount?.toFixed(2)}</span>
      </div>
    </div>
    
    {/* Order Status */}
    <div className="order-status-box">
      <h4>Order Status</h4>
      <span className={`status-badge ${order.order_status}`}>
        {order.order_status}
      </span>
    </div>
  </div>
  
  {/* Prepare Order Button */}
  <button 
    className="prepare-order-btn"
    onClick={handlePrepareOrder}
    disabled={order.senior_discount_status === 'pending'}
  >
    {order.senior_discount_status === 'pending' 
      ? 'Review Senior Discount First' 
      : 'Prepare Order'}
  </button>
</div>
```

**Success Criteria:**
- ✅ Order details display correctly
- ✅ Discount shows if approved
- ✅ Prepare button enabled/disabled based on review status
- ✅ Layout looks professional

---

#### **Step 3.5: Integrate into PharmacyDashboard**
**File:** `web-frontend/src/components/PharmacyDashboard.js`

**Add Import:**
```jsx
import ViewOrderSupersearch from './ViewOrderSupersearch';
```

**Add State:**
```jsx
const [showSupersearchOrderModal, setShowSupersearchOrderModal] = useState(false);
const [selectedSupersearchOrder, setSelectedSupersearchOrder] = useState(null);
```

**Add Handler:**
```jsx
const handleViewSupersearchOrder = (order) => {
  setSelectedSupersearchOrder(order);
  setShowSupersearchOrderModal(true);
};
```

**Add Modal Render:**
```jsx
{showSupersearchOrderModal && selectedSupersearchOrder && (
  <ViewOrderSupersearch
    order={selectedSupersearchOrder}
    onClose={() => setShowSupersearchOrderModal(false)}
    onPrepareOrder={() => handlePrepareOrder(selectedSupersearchOrder.id)}
  />
)}
```

**Update Orders Table:**
```jsx
// In orders table, add conditional rendering for View button
<button 
  onClick={() => {
    if (order.is_prescription_order) {
      handleViewPrescriptionOrder(order); // Existing function
    } else {
      handleViewSupersearchOrder(order); // New function
    }
  }}
>
  View Order
</button>
```

**Success Criteria:**
- ✅ Modal opens on click
- ✅ Correct order data loads
- ✅ Can distinguish prescription vs supersearch orders
- ✅ Modal closes properly

---

### **PHASE 4: Integration & Testing** (Estimated: 1-2 hours)
*Test the complete flow end-to-end*

#### **Step 4.1: End-to-End Testing**

**Test Case 1: Happy Path (Discount Approved)**
```
1. Customer App:
   - Add items to cart
   - Toggle Senior Discount ON
   - Upload Senior Citizen ID
   - Verify discount shows in summary (-20%)
   - Place Order
   - Verify order created

2. Pharmacy Dashboard:
   - View new order
   - See Senior ID image
   - Review ID (looks valid)
   - Click "Approve Discount"
   - Verify total updated
   - Verify discount applied

3. Verify Database:
   - Order.senior_discount_status = 'approved'
   - Order.discount_amount = 20% of subtotal
   - Order.total_amount reflects discount
```

**Test Case 2: Discount Rejected**
```
1. Customer App:
   - Create order with senior discount

2. Pharmacy Dashboard:
   - View order
   - Review ID (expired/invalid)
   - Click "Reject Discount"
   - Add notes: "ID appears expired"
   - Verify total remains full price

3. Verify Database:
   - Order.senior_discount_status = 'rejected'
   - Order.discount_amount = 0
   - Order.senior_discount_notes populated
```

**Test Case 3: No Discount Requested**
```
1. Customer App:
   - Create order WITHOUT senior discount

2. Pharmacy Dashboard:
   - View order
   - Verify no senior discount section shown
   - Can prepare order immediately
```

**Success Criteria:**
- ✅ All test cases pass
- ✅ No console errors
- ✅ Database updates correctly
- ✅ UI reflects changes in real-time

---

## 📊 Progress Tracking

### Phase 1: Backend Foundation
- [ ] Step 1.1: Database Migration
- [ ] Step 1.2: Backend API Endpoints
- [ ] Step 1.3: Test Backend Endpoints

### Phase 2: Customer App (order.tsx)
- [ ] Step 2.1: Add Senior Discount UI Section
- [ ] Step 2.2: Cloudinary Upload Integration
- [ ] Step 2.3: Update Order Summary
- [ ] Step 2.4: Update Place Order Function

### Phase 3: Pharmacy Dashboard
- [ ] Step 3.1: Create ViewOrderSupersearch Component
- [ ] Step 3.2: Build Chat Panel (Left Side)
- [ ] Step 3.3: Build Senior ID Viewer (Left Side)
- [ ] Step 3.4: Build Order Details Panel (Right Side)
- [ ] Step 3.5: Integrate into PharmacyDashboard

### Phase 4: Integration & Testing
- [ ] Step 4.1: End-to-End Testing

---

## 🚀 Next Action

**START HERE:** Phase 1, Step 1.1 - Database Migration

Run these commands:
```bash
cd backend
# Edit backend/api/orders/models.py (add fields)
python manage.py makemigrations api
python manage.py migrate api
python manage.py runserver
```

---

## ⏱️ Estimated Total Time

- **Phase 1:** 2-3 hours
- **Phase 2:** 2-3 hours
- **Phase 3:** 3-4 hours
- **Phase 4:** 1-2 hours

**Total: 8-12 hours**

---

## 🎯 Success Metrics

1. ✅ Customer can request senior discount
2. ✅ Senior ID uploads to Cloudinary
3. ✅ Pharmacy can view Senior ID
4. ✅ Pharmacy can approve/reject discount
5. ✅ Order total recalculates correctly
6. ✅ 20% discount applies when approved
7. ✅ UI is professional and intuitive
8. ✅ No bugs or console errors

