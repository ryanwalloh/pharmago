# Place Order Implementation Plan

## 📋 **Review Summary**

### **Database Models**

#### **Order Model** (`backend/api/orders/models.py`)
```python
Order:
  - order_number: CharField (unique)
  - customer: ForeignKey(Customer)
  - delivery_address: ForeignKey(Address)
  - order_status: CharField (pending, accepted, preparing, ready_for_pickup, picked_up, delivered, cancelled, refunded)
  - payment_status: CharField (unpaid, paid, failed, refunded, partially_refunded)
  - subtotal: DecimalField
  - tax_amount: DecimalField (service fee - waived for seniors)
  - delivery_fee: DecimalField
  - discount_amount: DecimalField
  - total_amount: DecimalField
  - source: CharField (web, mobile, phone, walk_in)
  - prescription_image_url: URLField
  - senior_discount_requested: BooleanField
  - senior_citizen_id_image: URLField
  - senior_discount_status: CharField
  - created_at, updated_at: DateTimeField
```

#### **OrderLine Model**
```python
OrderLine:
  - order: ForeignKey(Order)
  - inventory_item: ForeignKey(PharmacyInventory)
  - quantity: PositiveIntegerField
  - unit_price: DecimalField
  - total_price: DecimalField
  - prescription_required: BooleanField
  - prescription_status: CharField
  - notes: TextField
```

### **Existing Order Creation**

1. **Prescription Order** (`direct_prescription_order_creation`):
   - For prescription uploads
   - Creates placeholder order line
   - Pharmacy adds items later

2. **Standard REST** (`OrderViewSet.create`):
   - Requires authentication
   - Uses OrderCreateSerializer
   - Full order with items

---

## 🎯 **Differences: Prescription Order vs Cart Order**

| Feature | Prescription Order | Cart Order (SuperSearch) |
|---------|-------------------|--------------------------|
| **Items** | Unknown (pharmacy adds later) | Known upfront (cart items) |
| **Order Lines** | Placeholder (0.00 price) | Real items with prices |
| **Subtotal** | 0.00 (calculated later) | Calculated from cart |
| **Total** | Delivery fee only | Subtotal + Service Fee + Delivery - Discount |
| **Prescription** | Required (image upload) | Optional (per item) |
| **Pharmacy** | Selected by customer | Determined by cart items |
| **Flow** | Upload → Pharmacy reviews → Adds items | Cart → Place order → Pharmacy prepares |

---

## 🔧 **Implementation Strategy**

### **Decision: Create NEW endpoint for cart-based orders**

**Why?**
- Different data structure (cart items vs prescription)
- Different business logic (immediate pricing vs pending)
- Different validation requirements
- Separate concerns for maintainability

**Endpoint:** `POST /api/create-cart-order/`

---

## 📝 **Implementation Steps** (Strategic Order)

### **Step 1: Create Direct Cart Order Endpoint** ✅
**File:** `backend/api/direct/cart_order_views.py` (NEW)

**Logic:**
```python
@csrf_exempt
@require_http_methods(["POST"])
def create_cart_order(request):
    """
    Create order from cart (SuperSearch flow)
    
    Payload:
    {
        "customer_id": 9,
        "pharmacy_id": 5,
        "delivery_address_id": 12,
        "cart_items": [
            {
                "inventory_id": 123,
                "quantity": 2,
                "price": 50.00
            }
        ],
        "delivery_fee": 45.42,
        "payment_method": "cod",
        "senior_discount_requested": false,
        "senior_id_image_url": "",
        "notes": ""
    }
    """
    # 1. Validate payload
    # 2. Get customer, pharmacy, address
    # 3. Calculate totals
    # 4. Create Order
    # 5. Create OrderLines
    # 6. Return order data for tracking
```

### **Step 2: Add URL Route** ✅
**File:** `backend/api/direct/urls.py`

```python
path('create-cart-order/', cart_order_views.create_cart_order),
```

### **Step 3: Create Test Script** ✅
**File:** `backend/test_cart_order.py` (NEW)

```python
# Test creating cart order
# Uses real customer, pharmacy, address from database
# Simulates checkout page data
```

### **Step 4: Run Test** ✅
```bash
cd backend
python test_cart_order.py
```

### **Step 5: Wire to Frontend** ✅
**File:** `mobileapp/apps/customer-app/services/api.ts`

```typescript
async createCartOrder(orderData: any): Promise<ApiResponse<any>> {
  return this.makeDirectRequest('/create-cart-order/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
}
```

### **Step 6: Update Checkout Page** ✅
**File:** `mobileapp/apps/customer-app/app/checkout.tsx`

```typescript
const handlePlaceOrder = async () => {
  // 1. Validate data
  // 2. Call createCartOrder API
  // 3. If success → Navigate to order tracking
  // 4. If error → Show alert
}
```

### **Step 7: Decide on Order Tracking Page** ✅
**Review:** `screens/OrderTrackingScreen.tsx` vs new page

### **Step 8: Test End-to-End** ✅
1. Add items to cart
2. Fill address
3. Select payment method
4. Place order
5. Verify database
6. Navigate to tracking

---

## 🔍 **Order Tracking Page Analysis**

### **Current OrderTrackingScreen.tsx:**
- ✅ Loads order from `AsyncStorage` ('currentOrder')
- ✅ Loads order by ID from API
- ✅ Shows order status timeline
- ✅ Shows pharmacy info
- ✅ Shows delivery map
- ✅ Chat functionality
- ✅ Prescription approval flow

### **Compatibility Check:**

| Feature | Prescription Order | Cart Order | Compatible? |
|---------|-------------------|------------|-------------|
| Order ID | ✅ | ✅ | ✅ |
| Status tracking | ✅ | ✅ | ✅ |
| Pharmacy info | ✅ | ✅ | ✅ |
| Map | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Prescription image | ✅ | ⚠️ Optional | ✅ |
| Items list | ⚠️ Added later | ✅ Immediate | ✅ |
| Price approval | ✅ Required | ❌ Not needed | ⚠️ Needs adjustment |

### **Decision: REUSE OrderTrackingScreen.tsx** ✅

**Why?**
- ✅ Already handles order status
- ✅ Already has chat
- ✅ Already has map
- ✅ Saves development time
- ✅ Consistent UX

**Adjustments Needed:**
- Hide prescription image display if no prescription
- Hide price approval prompt for cart orders (already priced)
- Show items list for cart orders

---

## 📊 **Data Flow**

### **Checkout Page → API → Database → Tracking Page**

```
1. Checkout Page (checkout.tsx)
   ├── orderData from AsyncStorage
   ├── payment_method from state
   └── userLocation from state
          ↓
2. API Call: POST /api/create-cart-order/
   {
     customer_id: 9,
     pharmacy_id: 5,
     delivery_address_id: 12,
     cart_items: [...],
     delivery_fee: 45.42,
     payment_method: "cod",
     senior_discount_requested: true,
     senior_id_image_url: "https://...",
     notes: ""
   }
          ↓
3. Backend Processing
   ├── Validate customer, pharmacy, address
   ├── Create Order record
   ├── Create OrderLine records
   ├── Calculate totals (subtotal + service_fee + delivery - senior_discount)
   ├── Save to database
   └── Return order_id
          ↓
4. Frontend Receives Response
   {
     success: true,
     order_id: 123,
     order_number: "ORD20251025001",
     ...
   }
          ↓
5. Navigate to Order Tracking
   - Save to AsyncStorage('currentOrder')
   - router.push('/order-tracking/123')
          ↓
6. OrderTrackingScreen.tsx
   - Load order from API by ID
   - Show status, map, chat
   - Track delivery
```

---

## 🧪 **Test Plan**

### **Backend Test Script** (`test_cart_order.py`)

```python
#!/usr/bin/env python
"""
Test cart order creation
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.orders.models import Order, OrderLine
from api.users.models import Customer
from api.pharmacies.models import Pharmacy
from api.inventory.models import PharmacyInventory
from api.locations.models import Address

def test_create_cart_order():
    print("🧪 Testing Cart Order Creation")
    print("=" * 50)
    
    # Step 1: Get test data
    customer = Customer.objects.first()
    pharmacy = Pharmacy.objects.first()
    address = Address.objects.filter(customer=customer).first()
    inventory_items = PharmacyInventory.objects.filter(
        pharmacy=pharmacy,
        is_available=True
    )[:3]  # Get 3 items
    
    print(f"✅ Customer: {customer.full_name} (ID: {customer.id})")
    print(f"✅ Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy.id})")
    print(f"✅ Address: {address.full_address if address else 'None'}")
    print(f"✅ Items: {inventory_items.count()} items")
    
    if not address:
        print("❌ No address found for customer - creating one...")
        address = Address.objects.create(
            customer=customer,
            label='home',
            street_address='123 Test Street',
            barangay='Test Barangay',
            city='Iligan City',
            province='Lanao del Norte',
            latitude=8.2275,
            longitude=124.2456,
            is_default=True
        )
        print(f"✅ Created test address: {address.id}")
    
    # Step 2: Prepare order data
    cart_items = []
    subtotal = 0
    
    for item in inventory_items:
        quantity = 2
        price = float(item.price)
        total = price * quantity
        subtotal += total
        
        cart_items.append({
            'inventory_id': item.id,
            'name': item.name,
            'quantity': quantity,
            'price': price,
            'total': total
        })
    
    service_fee = 19.00
    delivery_fee = 45.42
    senior_discount = 0.00
    total = subtotal + service_fee + delivery_fee - senior_discount
    
    print(f"\n💰 Order Calculations:")
    print(f"  - Subtotal: ₱{subtotal:.2f}")
    print(f"  - Service Fee: ₱{service_fee:.2f}")
    print(f"  - Delivery Fee: ₱{delivery_fee:.2f}")
    print(f"  - Senior Discount: ₱{senior_discount:.2f}")
    print(f"  - Total: ₱{total:.2f}")
    
    # Step 3: Create order
    from decimal import Decimal
    from django.db import transaction
    
    with transaction.atomic():
        order = Order.objects.create(
            customer=customer,
            delivery_address=address,
            order_status=Order.OrderStatus.PENDING,
            payment_status=Order.PaymentStatus.UNPAID,
            delivery_type=Order.DeliveryType.STANDARD,
            subtotal=Decimal(str(subtotal)),
            tax_amount=Decimal(str(service_fee)),
            delivery_fee=Decimal(str(delivery_fee)),
            discount_amount=Decimal(str(senior_discount)),
            total_amount=Decimal(str(total)),
            source='mobile',
            notes='Test cart order',
            senior_discount_requested=False,
            senior_discount_status='not_requested'
        )
        
        # Create order lines
        for item_data in cart_items:
            inventory_item = PharmacyInventory.objects.get(id=item_data['inventory_id'])
            
            OrderLine.objects.create(
                order=order,
                inventory_item=inventory_item,
                quantity=item_data['quantity'],
                unit_price=Decimal(str(item_data['price'])),
                total_price=Decimal(str(item_data['total'])),
                prescription_required=inventory_item.prescription_required,
                prescription_status='pending' if inventory_item.prescription_required else None
            )
    
    print(f"\n✅ Order Created Successfully!")
    print(f"  - Order Number: {order.order_number}")
    print(f"  - Order ID: {order.id}")
    print(f"  - Status: {order.order_status}")
    print(f"  - Total: ₱{order.total_amount}")
    print(f"  - Order Lines: {order.order_lines.count()}")
    
    # Step 4: Verify
    saved_order = Order.objects.get(id=order.id)
    print(f"\n🔍 Verification:")
    print(f"  - Found in DB: ✅")
    print(f"  - Order Lines: {saved_order.order_lines.count()}")
    print(f"  - Calculated Total: ₱{saved_order.total_amount}")
    
    for line in saved_order.order_lines.all():
        print(f"  - {line.quantity}x {line.inventory_item.name} @ ₱{line.unit_price} = ₱{line.total_price}")
    
    return order

if __name__ == '__main__':
    order = test_create_cart_order()
    print(f"\n🎉 Test completed! Order ID: {order.id}")
```

---

## 📂 **Files to Create/Modify**

### **STEP 1: Backend Endpoint**
1. ✅ `backend/api/direct/cart_order_views.py` (NEW)
2. ✅ `backend/api/direct/urls.py` (MODIFY - add route)

### **STEP 2: Test Script**
3. ✅ `backend/test_cart_order.py` (NEW)

### **STEP 3: Frontend API Service**
4. ✅ `mobileapp/apps/customer-app/services/api.ts` (MODIFY - add method)

### **STEP 4: Checkout Page**
5. ✅ `mobileapp/apps/customer-app/app/checkout.tsx` (MODIFY - wire button)

### **STEP 5: Order Tracking (Optional Adjustments)**
6. ⚠️ `mobileapp/apps/customer-app/screens/OrderTrackingScreen.tsx` (MODIFY - hide price approval for cart orders)

---

## 🎯 **Strategic Step Order**

```
Priority 1: Backend Foundation
├── Step 1.1: Create cart_order_views.py
├── Step 1.2: Add URL route
└── Step 1.3: Create test script

Priority 2: Testing
├── Step 2.1: Run test script
├── Step 2.2: Verify database
└── Step 2.3: Fix any issues

Priority 3: Frontend Integration
├── Step 3.1: Add API method
├── Step 3.2: Wire checkout button
└── Step 3.3: Handle navigation

Priority 4: Order Tracking
├── Step 4.1: Test with existing screen
├── Step 4.2: Hide price approval for cart orders
└── Step 4.3: Display items list

Priority 5: End-to-End Testing
├── Step 5.1: Place test order
├── Step 5.2: Verify tracking page
├── Step 5.3: Test chat
└── Step 5.4: Test status updates
```

---

## 📋 **Detailed API Endpoint Specification**

### **Request:**
```json
POST /api/create-cart-order/
{
  "customer_id": 9,
  "pharmacy_id": 5,
  "delivery_address_id": 12,
  "cart_items": [
    {
      "inventory_id": 123,
      "quantity": 2
    },
    {
      "inventory_id": 456,
      "quantity": 1
    }
  ],
  "delivery_fee": 45.42,
  "payment_method": "cod",
  "senior_discount_requested": true,
  "senior_id_image_url": "https://cloudinary.com/...",
  "notes": "Please deliver before 5pm"
}
```

### **Response (Success):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "order_id": 123,
    "order_number": "ORD20251025001",
    "order_status": "pending",
    "payment_status": "unpaid",
    "subtotal": 150.00,
    "service_fee": 0.00,
    "delivery_fee": 45.42,
    "senior_discount": 30.00,
    "total_amount": 165.42,
    "pharmacy_name": "Mercury Drug",
    "pharmacy_id": 5,
    "items": [
      {
        "name": "Paracetamol 500mg",
        "quantity": 2,
        "unit_price": 25.00,
        "total": 50.00
      }
    ],
    "created_at": "2025-10-25T15:30:00Z"
  }
}
```

### **Response (Error):**
```json
{
  "success": false,
  "error": "Customer not found",
  "message": "Customer with ID 9 does not exist"
}
```

---

## 🔄 **Cart Order vs Prescription Order Tracking**

### **Both Use Same OrderTrackingScreen.tsx**

**Automatic Differentiation:**
```typescript
// In OrderTrackingScreen.tsx

// Check if prescription-based order
const isPrescriptionOrder = orderData?.prescription_image_url && 
                            orderData?.total_amount === 0;

// Show price approval only for prescription orders
const showPriceApproval = isPrescriptionOrder && 
                          orderData?.order_status === 'pending' &&
                          orderData?.total_amount > 0;

// Show items list for cart orders
const showItemsList = !isPrescriptionOrder || orderData?.items?.length > 0;
```

---

## ✅ **Advantages of Reusing OrderTrackingScreen**

1. ✅ **Single source of truth** - One tracking interface
2. ✅ **Consistent UX** - Same experience for all orders
3. ✅ **Code reuse** - Chat, map, status already built
4. ✅ **Maintainability** - One file to update
5. ✅ **Feature parity** - All orders get full features

---

## 🚀 **Next Actions**

1. **Create** `backend/api/direct/cart_order_views.py`
2. **Update** `backend/api/direct/urls.py`
3. **Create** `backend/test_cart_order.py`
4. **Test** backend endpoint
5. **Wire** to frontend
6. **Test** end-to-end

---

**Ready to implement? I'll start with Step 1: Backend Endpoint Creation** ✅

