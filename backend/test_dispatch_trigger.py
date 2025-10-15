"""
Test Dispatch Trigger Script
Creates an order with status "accepted" to trigger the dispatch system
and send a real-time offer to online riders.
"""

import os
import django
import sys
from decimal import Decimal
from datetime import datetime

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.orders.models import Order
from api.users.models import Customer, Pharmacy
from api.locations.models import Address

def create_test_dispatch_order():
    """
    Create a test order with status "accepted" to trigger dispatch system
    """
    print("\n" + "="*70)
    print("TEST DISPATCH TRIGGER - Create Order to Test Real-Time Dispatch")
    print("="*70)
    
    # Step 1: Find an address with coordinates
    print("\n📋 Step 1: Finding delivery address with coordinates...")
    delivery_address = Address.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False
    ).first()
    
    if not delivery_address:
        print("❌ No address with coordinates found. Please create an address first.")
        return
    
    customer = delivery_address.customer
    
    print(f"✅ Customer found: {customer.user.first_name} {customer.user.last_name} (ID: {customer.id})")
    print(f"✅ Delivery address: {delivery_address.street_address}, {delivery_address.barangay}, {delivery_address.city}")
    print(f"   Coordinates: {delivery_address.latitude}, {delivery_address.longitude}")
    
    # Step 2: Get a pharmacy
    print("\n📋 Step 2: Finding pharmacy...")
    pharmacy = Pharmacy.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False
    ).first()
    
    if not pharmacy:
        print("❌ No pharmacy with coordinates found. Please ensure pharmacies have latitude/longitude set.")
        return
    
    print(f"✅ Pharmacy found: {pharmacy.pharmacy_name} (ID: {pharmacy.id})")
    print(f"   Coordinates: {pharmacy.latitude}, {pharmacy.longitude}")
    
    # Step 3: Calculate delivery fee (dynamic pricing)
    print("\n📋 Step 3: Calculating delivery fee...")
    try:
        from api.orders.pricing_service import DeliveryPricingService
        
        delivery_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
            float(pharmacy.latitude),
            float(pharmacy.longitude),
            float(delivery_address.latitude),
            float(delivery_address.longitude),
            use_google_maps=True
        )
        
        print(f"✅ Delivery fee calculated: ₱{delivery_fee:.2f} ({distance_km:.2f}km)")
    except Exception as e:
        print(f"⚠️  Could not calculate dynamic fee: {e}")
        delivery_fee = Decimal('29.00')
        print(f"   Using default fee: ₱{delivery_fee:.2f}")
    
    # Step 4: Create the order with status 'pending'
    print("\n📋 Step 4: Creating order (status: pending)...")
    
    order_number = f"TEST{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    order = Order.objects.create(
        order_number=order_number,
        customer=customer,
        delivery_address=delivery_address,
        subtotal=Decimal('150.00'),
        delivery_fee=delivery_fee,
        total_amount=Decimal('150.00') + delivery_fee,
        order_status=Order.OrderStatus.PENDING,  # Start as pending
        notes="Test order for dispatch system"
    )
    
    print(f"✅ Order created: {order.order_number} (ID: {order.id})")
    print(f"   Status: {order.order_status}")
    print(f"   Total: ₱{order.total_amount:.2f}")
    print(f"   Delivery Fee: ₱{order.delivery_fee:.2f}")
    
    # Step 5: Update status to 'accepted' to trigger dispatch
    print("\n📋 Step 5: Updating order status to 'accepted' (TRIGGERING DISPATCH)...")
    order.order_status = Order.OrderStatus.ACCEPTED
    order.save()
    print(f"✅ Order status updated to: {order.order_status}")
    
    # Step 6: Wait for dispatch
    print("\n" + "="*70)
    print("🚀 DISPATCH TRIGGERED!")
    print("="*70)
    print("\n✅ Order created with status 'accepted'")
    print("✅ Django signal should have triggered auto-dispatch")
    print("\n📱 CHECK YOUR RIDER APP NOW:")
    print("   - Full-screen modal should appear")
    print("   - Shows earnings, pickup, delivery")
    print("   - 30-second countdown timer")
    print("\n🔍 Check Django logs for:")
    print("   🚀 Auto-dispatch triggered for order", order_number)
    print("   🎯 Top rider: #X (Score: XX.X)")
    print("   📨 WebSocket offer sent to rider X")
    print("\n" + "="*70)
    
    return order


if __name__ == '__main__':
    try:
        order = create_test_dispatch_order()
        if order:
            print(f"\n✨ SUCCESS! Order {order.order_number} created and dispatched!")
            print(f"\n💡 To cancel this test order:")
            print(f"   python manage.py shell")
            print(f"   >>> from api.orders.models import Order")
            print(f"   >>> Order.objects.get(id={order.id}).delete()")
        else:
            print("\n❌ Failed to create test order. Check the errors above.")
    except Exception as e:
        print(f"\n❌ Error creating test order: {str(e)}")
        import traceback
        traceback.print_exc()

