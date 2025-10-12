# Rider Order Acceptance Implementation Plan

## 📋 Project Overview

**Goal**: Implement rider order acceptance feature allowing riders to view and accept available delivery orders.

**Approach**: Rider Self-Selection with optional batching (Hybrid system ready for Phase 2 admin assignment)

**Timeline**: Phased implementation
- Phase 1: Single order acceptance (Priority)
- Phase 2: Manual batching
- Phase 3: Smart batch suggestions
- Phase 4: Admin assignment

---

## 🎯 Phase 1: Single Order Acceptance (Current Focus)

### **User Story:**
```
As a Rider,
I want to view available delivery orders near me,
So that I can choose orders to deliver and earn money.
```

### **Acceptance Criteria:**
1. ✅ Rider can see a list of available orders (unassigned, ready for pickup)
2. ✅ Each order shows: pharmacy name, delivery address, distance, earnings, items
3. ✅ Rider can tap on an order to view full details
4. ✅ Rider can accept an order
5. ✅ Accepted order moves to "Active Deliveries"
6. ✅ Rider receives confirmation of acceptance
7. ✅ Order count on home page updates in real-time

---

## 🏗️ Architecture Overview

### **Data Flow:**
```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP (Rider)                    │
├─────────────────────────────────────────────────────────┤
│  Home Screen                                             │
│    └─ "3 delivery orders found!" [LIVE badge]          │
│    └─ Tap "View details >" button                       │
│         ↓                                                │
│  Available Orders Screen (NEW)                           │
│    └─ List of unassigned orders                         │
│    └─ Tap order → Order Details Screen                  │
│         ↓                                                │
│  Order Details Screen (NEW)                              │
│    └─ Full order information                            │
│    └─ "Accept Order" button                             │
│         ↓                                                │
│  API Call: Accept Order                                  │
│         ↓                                                │
│  Active Deliveries Screen (NEW)                          │
│    └─ Shows accepted order                              │
│    └─ Navigation, pickup/delivery actions               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Django)                      │
├─────────────────────────────────────────────────────────┤
│  Endpoints:                                              │
│  1. GET  /api/available-orders/                         │
│     → Returns unassigned orders for rider               │
│                                                          │
│  2. GET  /api/available-orders/{id}/                    │
│     → Returns detailed order information                │
│                                                          │
│  3. POST /api/available-orders/{id}/accept/             │
│     → Creates RiderAssignment                           │
│     → Updates order status                              │
│     → Returns assignment details                        │
│                                                          │
│  4. GET  /api/my-deliveries/active/                     │
│     → Returns rider's active assignments                │
│                                                          │
│  5. POST /api/my-deliveries/{id}/mark-picked-up/        │
│     → Updates assignment status to PICKED_UP            │
│                                                          │
│  6. POST /api/my-deliveries/{id}/mark-delivered/        │
│     → Completes delivery                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Implementation

### **1. New Endpoint: Get Available Orders**

**File**: `backend/api/delivery/rider_endpoints.py` (NEW)

```python
@csrf_exempt
def get_available_orders(request):
    """
    Get list of available orders for riders to accept.
    Returns orders that are:
    - Status: ACCEPTED, PREPARING, or READY_FOR_PICKUP
    - Not yet assigned to any rider
    - Optionally filtered by distance from rider's location
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        # Get rider from request (auth token)
        # Get available orders
        available_orders = Order.objects.filter(
            order_status__in=[
                Order.OrderStatus.ACCEPTED,
                Order.OrderStatus.PREPARING,
                Order.OrderStatus.READY_FOR_PICKUP
            ]
        ).select_related(
            'customer', 'delivery_address'
        ).prefetch_related(
            'order_lines__inventory_item__medicine', 
            'order_lines__inventory_item__pharmacy'
        )
        
        # Filter out already assigned orders
        unassigned_orders = [
            order for order in available_orders 
            if not order.is_assigned_to_rider()
        ]
        
        # Optional: Filter by distance from rider's location
        rider_lat = request.GET.get('latitude')
        rider_lng = request.GET.get('longitude')
        max_distance_km = float(request.GET.get('max_distance', 10.0))
        
        if rider_lat and rider_lng:
            # Filter by distance
            nearby_orders = []
            for order in unassigned_orders:
                if order.delivery_address.has_coordinates():
                    distance = calculate_distance(
                        float(rider_lat), float(rider_lng),
                        float(order.delivery_address.latitude),
                        float(order.delivery_address.longitude)
                    )
                    if distance <= max_distance_km:
                        nearby_orders.append({
                            'order': order,
                            'distance': distance
                        })
            
            # Sort by distance
            nearby_orders.sort(key=lambda x: x['distance'])
            unassigned_orders = [item['order'] for item in nearby_orders]
        
        # Serialize orders
        orders_data = []
        for order in unassigned_orders[:20]:  # Limit to 20 orders
            pharmacy = order.order_lines.first().inventory_item.pharmacy if order.order_lines.exists() else None
            
            orders_data.append({
                'id': order.id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'total_amount': float(order.total_amount),
                'delivery_fee': float(order.delivery_fee),
                'rider_earnings': float(order.delivery_fee * 0.8),  # 80% to rider
                'items_count': order.order_lines.count(),
                'pharmacy': {
                    'id': pharmacy.id if pharmacy else None,
                    'name': pharmacy.pharmacy_name if pharmacy else 'Unknown',
                    'address': pharmacy.full_address if pharmacy else '',
                    'latitude': float(pharmacy.latitude) if pharmacy and pharmacy.latitude else None,
                    'longitude': float(pharmacy.longitude) if pharmacy and pharmacy.longitude else None,
                } if pharmacy else None,
                'delivery_address': {
                    'full_address': order.delivery_address.full_address,
                    'barangay': order.delivery_address.barangay,
                    'city': order.delivery_address.city,
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None,
                },
                'customer_name': f"{order.customer.first_name} {order.customer.last_name}",
                'created_at': order.created_at.isoformat(),
                'estimated_pickup_time': '10-15 minutes',  # Can be calculated
            })
        
        return JsonResponse({
            'success': True,
            'count': len(orders_data),
            'orders': orders_data
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error fetching available orders: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'Failed to fetch orders'}, status=500)
```

### **2. New Endpoint: Accept Order**

```python
@csrf_exempt
def accept_order(request, order_id):
    """
    Rider accepts an available order.
    Creates a RiderAssignment with status ACCEPTED.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        # Get authenticated rider
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse({'success': False, 'error': 'Missing authorization'}, status=401)
        
        token = auth_header[7:]
        token_info = token_manager.validate_token(token)
        user = User.objects.get(id=token_info['user_id'])
        rider = Rider.objects.get(user=user)
        
        # Get order
        order = Order.objects.get(id=order_id)
        
        # Validate order is available
        if order.is_assigned_to_rider():
            return JsonResponse({'success': False, 'error': 'Order already assigned'}, status=400)
        
        if order.order_status not in ['accepted', 'preparing', 'ready_for_pickup']:
            return JsonResponse({'success': False, 'error': 'Order not available for pickup'}, status=400)
        
        # Create rider assignment
        assignment = RiderAssignment.objects.create(
            rider=rider,
            assignment_type='single',
            status='accepted',  # Directly to accepted (rider self-selection)
            batch_size=1,
            max_batch_size=1,
            total_delivery_fee=order.delivery_fee,
            rider_earnings=order.delivery_fee * Decimal('0.8'),  # 80% to rider
            accepted_at=timezone.now(),
            estimated_completion=timezone.now() + timedelta(hours=1)
        )
        
        # Link order to assignment
        OrderRiderAssignment.objects.create(
            order=order,
            assignment=assignment,
            pickup_sequence=1,
            delivery_sequence=1
        )
        
        # Update order status
        order.order_status = 'picked_up'  # Or keep as ready_for_pickup
        order.save()
        
        logger.info(f"✅ Order {order.order_number} accepted by rider {rider.full_name}")
        
        # Broadcast WebSocket update (order count decreased)
        # ... broadcast logic ...
        
        return JsonResponse({
            'success': True,
            'assignment': {
                'id': assignment.id,
                'assignment_id': assignment.assignment_id,
                'status': assignment.status,
                'rider_earnings': float(assignment.rider_earnings),
                'estimated_completion': assignment.estimated_completion.isoformat(),
            }
        }, status=201)
        
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)
    except Rider.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Rider not found'}, status=404)
    except Exception as e:
        logger.error(f"❌ Error accepting order: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'Failed to accept order'}, status=500)
```

### **3. New Endpoint: Get Active Deliveries**

```python
@csrf_exempt
def get_active_deliveries(request):
    """
    Get rider's active delivery assignments.
    """
    # ... implementation similar to get_available_orders but filtered by rider ...
```

### **4. URL Routes**

**File**: `backend/api/users/urls_direct.py`

```python
urlpatterns = [
    # ... existing routes ...
    path('available-orders/', rider_endpoints.get_available_orders),
    path('available-orders/<int:order_id>/accept/', rider_endpoints.accept_order),
    path('my-deliveries/active/', rider_endpoints.get_active_deliveries),
]
```

---

## 📱 Frontend Implementation

### **1. Available Orders Screen**

**File**: `mobileapp/apps/rider-app/app/orders/available.tsx` (NEW)

**Features:**
- List of available orders
- Pull-to-refresh
- Filter by distance
- Sort by earnings/distance
- Search by pharmacy/area

**UI Components:**
```typescript
<AvailableOrdersScreen>
  <Header>
    <BackButton />
    <Title>Available Orders</Title>
    <FilterIcon />
  </Header>
  
  <FilterBar>
    <DistanceFilter: "Within 5km" />
    <SortBy: "Nearest First" />
  </FilterBar>
  
  <OrderList>
    <OrderCard order={order}>
      <PharmacyInfo>
        <PharmacyIcon />
        <Name>MediCare Pharmacy</Name>
        <Distance>1.2 km away</Distance>
      </PharmacyInfo>
      
      <DeliveryInfo>
        <CustomerIcon />
        <Address>123 Main St, Barangay 1</Address>
        <Distance>2.5 km from pharmacy</Distance>
      </DeliveryInfo>
      
      <OrderDetails>
        <ItemsCount>5 items</ItemsCount>
        <Separator />
        <OrderNumber>#PH-2025-001</OrderNumber>
      </OrderDetails>
      
      <EarningsInfo>
        <Label>Your Earnings</Label>
        <Amount>₱23.20</Amount>
        <DeliveryFee>(80% of ₱29)</DeliveryFee>
      </EarningsInfo>
      
      <AcceptButton onPress={() => handleViewDetails(order)}>
        View Details
      </AcceptButton>
    </OrderCard>
  </OrderList>
</AvailableOrdersScreen>
```

### **2. Order Details Screen**

**File**: `mobileapp/apps/rider-app/app/orders/[id].tsx` (NEW)

**Features:**
- Full order information
- Pharmacy location map
- Delivery location map
- Items list
- Earnings breakdown
- Accept/Cancel buttons

**UI Components:**
```typescript
<OrderDetailsScreen>
  <Header>
    <BackButton />
    <Title>Order Details</Title>
  </Header>
  
  <ScrollView>
    <OrderHeader>
      <OrderNumber>#PH-2025-001</OrderNumber>
      <Status>Ready for Pickup</Status>
      <CreatedTime>Created 15 minutes ago</CreatedTime>
    </OrderHeader>
    
    <PharmacySection>
      <SectionTitle>Pickup Location</SectionTitle>
      <PharmacyCard>
        <Name>MediCare Pharmacy</Name>
        <Address>456 Oak Ave, Barangay 2</Address>
        <Distance>1.2 km from you</Distance>
        <MapPreview />
        <NavigateButton>Get Directions</NavigateButton>
      </PharmacyCard>
    </PharmacySection>
    
    <DeliverySection>
      <SectionTitle>Delivery Location</SectionTitle>
      <CustomerCard>
        <Name>Juan Dela Cruz</Name>
        <Phone>0917 123 4567</Phone>
        <Address>123 Main St, Barangay 1</Address>
        <Distance>2.5 km from pharmacy</Distance>
        <MapPreview />
      </CustomerCard>
    </DeliverySection>
    
    <ItemsSection>
      <SectionTitle>Order Items (5)</SectionTitle>
      <ItemsList>
        <Item>Biogesic 500mg - x2</Item>
        <Item>Vitamin C 1000mg - x1</Item>
        <Item>Face Mask - x3</Item>
      </ItemsList>
    </ItemsSection>
    
    <EarningsSection>
      <SectionTitle>Earnings Breakdown</SectionTitle>
      <EarningsCard>
        <Row>
          <Label>Delivery Fee</Label>
          <Amount>₱29.00</Amount>
        </Row>
        <Row>
          <Label>Your Share (80%)</Label>
          <Amount bold>₱23.20</Amount>
        </Row>
        <Divider />
        <Row>
          <Label>Estimated Time</Label>
          <Time>30-45 minutes</Time>
        </Row>
      </EarningsCard>
    </EarningsSection>
  </ScrollView>
  
  <BottomActions>
    <CancelButton>Cancel</CancelButton>
    <AcceptButton onPress={handleAcceptOrder}>
      Accept Order
    </AcceptButton>
  </BottomActions>
</OrderDetailsScreen>
```

### **3. Active Deliveries Screen**

**File**: `mobileapp/apps/rider-app/app/deliveries/active.tsx` (NEW)

**Features:**
- Current active delivery
- Navigation to pharmacy/customer
- Mark picked up / Mark delivered buttons
- Real-time location tracking
- Customer contact button

### **4. API Service Methods**

**File**: `mobileapp/apps/customer-app/services/api.ts`

```typescript
// Get available orders
async getAvailableOrders(latitude?: number, longitude?: number, maxDistance?: number): Promise<ApiResponse<{orders: Order[], count: number}>> {
  const params = new URLSearchParams();
  if (latitude) params.append('latitude', latitude.toString());
  if (longitude) params.append('longitude', longitude.toString());
  if (maxDistance) params.append('max_distance', maxDistance.toString());
  
  return this.makeDirectRequest(`/available-orders/?${params.toString()}`, {
    method: 'GET',
  });
}

// Get order details
async getOrderDetails(orderId: number): Promise<ApiResponse<Order>> {
  return this.makeDirectRequest(`/available-orders/${orderId}/`, {
    method: 'GET',
  });
}

// Accept order
async acceptOrder(orderId: number): Promise<ApiResponse<{assignment: Assignment}>> {
  return this.makeDirectRequest(`/available-orders/${orderId}/accept/`, {
    method: 'POST',
  });
}

// Get active deliveries
async getActiveDeliveries(): Promise<ApiResponse<{deliveries: Assignment[]}>> {
  return this.makeDirectRequest('/my-deliveries/active/', {
    method: 'GET',
  });
}

// Mark picked up
async markOrderPickedUp(assignmentId: number): Promise<ApiResponse<any>> {
  return this.makeDirectRequest(`/my-deliveries/${assignmentId}/mark-picked-up/`, {
    method: 'POST',
  });
}

// Mark delivered
async markOrderDelivered(assignmentId: number): Promise<ApiResponse<any>> {
  return this.makeDirectRequest(`/my-deliveries/${assignmentId}/mark-delivered/`, {
    method: 'POST',
  });
}
```

### **5. Update Home Screen**

**File**: `mobileapp/apps/rider-app/app/home/index.tsx`

Update "View details >" button to navigate to Available Orders screen:

```typescript
<TouchableOpacity onPress={() => router.push('/orders/available')}>
  <Text style={styles.viewDetailsLink}>View details &gt;</Text>
</TouchableOpacity>
```

---

## 🎨 UI/UX Design Specifications

### **Color Scheme:**
- Primary Green: `#00BF63`
- Earnings Gold: `#FFA500`
- Background: `#F5F5F5`
- Card Background: `#FFFFFF`
- Text Primary: `#222222`
- Text Secondary: `#666666`

### **Typography:**
- Order Number: 16px, Bold
- Pharmacy Name: 18px, Semi-Bold
- Address: 14px, Regular
- Earnings: 24px, Bold
- Distance: 12px, Regular

### **Spacing:**
- Card Padding: 16px
- Card Margin: 12px
- Section Spacing: 24px
- Button Height: 48px

### **Components:**
- Order Cards: Elevated (shadow), rounded corners (12px)
- Buttons: Rounded (8px), 48px height
- Maps: 200px height
- Icons: 24px × 24px

---

## 🧪 Testing Plan

### **Unit Tests:**
1. Backend endpoint: Get available orders
2. Backend endpoint: Accept order
3. Validate order assignment creation
4. Check order status updates
5. Verify rider earnings calculation

### **Integration Tests:**
1. Complete flow: View → Accept → Mark Picked Up → Mark Delivered
2. Test with multiple riders accepting different orders
3. Test order count real-time updates
4. Test with batched orders (Phase 2)

### **Manual Testing:**
1. Create test orders in admin
2. Login as rider
3. View available orders
4. Accept an order
5. Verify order disappears from available list
6. Verify order appears in active deliveries
7. Complete delivery flow
8. Check earnings update

---

## 📊 Success Metrics

1. **Time to Accept**: Average time from order creation to rider acceptance
2. **Acceptance Rate**: % of orders accepted within 5 minutes
3. **Completion Rate**: % of accepted orders successfully delivered
4. **Rider Earnings**: Average earnings per hour
5. **Order Fulfillment Time**: Total time from order creation to delivery

---

## 🚀 Implementation Timeline

### **Week 1: Backend**
- Day 1-2: Create new endpoints
- Day 3: Add authentication
- Day 4: Add validation and error handling
- Day 5: Testing and documentation

### **Week 2: Frontend**
- Day 1-2: Available Orders screen
- Day 3: Order Details screen
- Day 4: Active Deliveries screen
- Day 5: Integration and bug fixes

### **Week 3: Testing & Polish**
- Day 1-2: End-to-end testing
- Day 3: Bug fixes
- Day 4: UI polish and optimization
- Day 5: Deployment preparation

---

## 🎯 Phase 2 Preview: Manual Batching

After Phase 1 is complete, Phase 2 will add:

1. **Multi-select on Available Orders screen**
2. **Batch validation** (distance, pharmacy, etc.)
3. **Batch earnings preview** (combined earnings)
4. **Batch acceptance** (creates batch assignment)
5. **Batch delivery flow** (sequence management)

---

## ✅ Checklist

**Backend:**
- [ ] Create `rider_endpoints.py`
- [ ] Implement `get_available_orders()`
- [ ] Implement `accept_order()`
- [ ] Implement `get_active_deliveries()`
- [ ] Add URL routes
- [ ] Add authentication
- [ ] Add validation
- [ ] Write tests
- [ ] Document API

**Frontend:**
- [ ] Create Available Orders screen
- [ ] Create Order Details screen
- [ ] Create Active Deliveries screen
- [ ] Update Home screen navigation
- [ ] Add API service methods
- [ ] Implement state management
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test on iOS
- [ ] Test on Android

**Testing:**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] Performance testing
- [ ] Security review

**Documentation:**
- [ ] API documentation
- [ ] User guide for riders
- [ ] Admin guide for management

**Deployment:**
- [ ] Code review
- [ ] QA approval
- [ ] Production deployment
- [ ] Monitor metrics

---

## 📝 Notes

- All endpoints require authentication (JWT token)
- Distance calculations use Haversine formula
- Rider earnings are 80% of delivery fee (configurable)
- Order status updates trigger WebSocket broadcasts
- Real-time location tracking for active deliveries
- Push notifications for assignment updates (Phase 2)

---

## 🎉 Ready to Implement!

**Review this plan and confirm:**
1. ✅ Backend approach (rider self-selection)
2. ✅ UI/UX design specifications
3. ✅ Timeline and phasing
4. ✅ Success metrics

**Once approved, we'll start with:**
1. Backend endpoint implementation
2. Mobile app screens
3. Integration and testing

Let's build this! 🚀

