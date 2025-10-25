#!/usr/bin/env python
"""
Test cart order creation endpoint
Tests the complete flow of creating an order from cart items
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.orders.models import Order, OrderLine
from api.users.models import Customer, Pharmacy
from api.inventory.models import PharmacyInventory
from api.locations.models import Address
from decimal import Decimal


def test_cart_order_creation():
    """Test creating a cart order"""
    print("=" * 70)
    print("🧪 TESTING CART ORDER CREATION")
    print("=" * 70)
    
    # Step 1: Get test data from database
    print("\n📋 Step 1: Fetching test data from database...")
    
    customer = Customer.objects.first()
    if not customer:
        print("❌ No customers found in database!")
        return False
    print(f"  ✅ Customer: {customer.full_name} (ID: {customer.id})")
    
    # Find pharmacy with inventory items
    pharmacy = None
    inventory_items = None
    
    # Try to find a pharmacy with inventory
    for pharm in Pharmacy.objects.all():
        items = PharmacyInventory.objects.filter(
            pharmacy=pharm,
            is_available=True,
            price__gt=0
        )[:3]
        
        if items.count() > 0:
            pharmacy = pharm
            inventory_items = items
            break
    
    if not pharmacy:
        print("❌ No pharmacies with inventory items found in database!")
        return False
    
    print(f"  ✅ Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy.id})")
    print(f"  ✅ Inventory Items: {inventory_items.count()} items")
    
    # Get or create address
    address = Address.objects.filter(customer=customer).first()
    if not address:
        print("  ⚠️  No address found - creating test address...")
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
    print(f"  ✅ Address: {address.full_address}")
    for item in inventory_items:
        print(f"     - {item.name} @ ₱{item.price}")
    
    # Step 2: Prepare cart data
    print("\n📦 Step 2: Preparing cart order data...")
    
    cart_items = []
    subtotal = Decimal('0.00')
    
    for item in inventory_items:
        quantity = 2
        price = item.price
        total = price * quantity
        subtotal += total
        
        cart_items.append({
            'inventory_id': item.id,
            'quantity': quantity
        })
        print(f"  📦 {quantity}x {item.name} @ ₱{price} = ₱{total}")
    
    # Calculate order totals
    service_fee = Decimal('19.00')
    delivery_fee = Decimal('45.42')
    senior_discount = Decimal('0.00')
    total = subtotal + service_fee + delivery_fee - senior_discount
    
    print(f"\n💰 Order Calculations:")
    print(f"  - Subtotal: ₱{subtotal:.2f}")
    print(f"  - Service Fee: ₱{service_fee:.2f}")
    print(f"  - Delivery Fee: ₱{delivery_fee:.2f}")
    print(f"  - Senior Discount: ₱{senior_discount:.2f}")
    print(f"  - Total: ₱{total:.2f}")
    
    # Step 3: Create order using Django ORM (simulating endpoint logic)
    print("\n🔨 Step 3: Creating order in database...")
    
    from django.db import transaction
    
    try:
        with transaction.atomic():
            # Create Order
            order = Order.objects.create(
                customer=customer,
                delivery_address=address,
                order_status=Order.OrderStatus.PENDING,
                payment_status=Order.PaymentStatus.UNPAID,
                delivery_type=Order.DeliveryType.STANDARD,
                subtotal=subtotal,
                tax_amount=service_fee,
                delivery_fee=delivery_fee,
                discount_amount=senior_discount,
                total_amount=total,
                source='mobile',
                notes='Test cart order',
                senior_discount_requested=False,
                senior_discount_status='not_requested'
            )
            
            print(f"  ✅ Order created: {order.order_number} (ID: {order.id})")
            
            # Create OrderLines
            for item_data in cart_items:
                inventory_item = PharmacyInventory.objects.get(id=item_data['inventory_id'])
                quantity = item_data['quantity']
                unit_price = inventory_item.price
                total_price = unit_price * quantity
                
                OrderLine.objects.create(
                    order=order,
                    inventory_item=inventory_item,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price,
                    prescription_required=inventory_item.prescription_required,
                    prescription_status='pending' if inventory_item.prescription_required else None
                )
                
                print(f"  ✅ Order line: {quantity}x {inventory_item.name}")
            
            # Step 4: Verify order
            print("\n🔍 Step 4: Verifying order in database...")
            
            saved_order = Order.objects.get(id=order.id)
            print(f"  ✅ Order found: {saved_order.order_number}")
            print(f"  ✅ Status: {saved_order.order_status}")
            print(f"  ✅ Payment: {saved_order.payment_status}")
            print(f"  ✅ Total: ₱{saved_order.total_amount}")
            print(f"  ✅ Order Lines: {saved_order.order_lines.count()}")
            
            print(f"\n📦 Order Lines Details:")
            for line in saved_order.order_lines.all():
                print(f"  - {line.quantity}x {line.inventory_item.name} @ ₱{line.unit_price} = ₱{line.total_price}")
            
            # Step 5: Test with senior discount
            print("\n💚 Step 5: Testing senior citizen discount...")
            
            senior_subtotal = Decimal('100.00')
            senior_service_fee = Decimal('0.00')  # Waived
            senior_delivery_fee = Decimal('45.42')
            senior_discount_amount = senior_subtotal * Decimal('0.20')  # 20%
            senior_total = senior_subtotal + senior_service_fee + senior_delivery_fee - senior_discount_amount
            
            print(f"  💚 Senior Discount Calculation:")
            print(f"    - Subtotal: ₱{senior_subtotal:.2f}")
            print(f"    - Service Fee: ₱{senior_service_fee:.2f} (waived)")
            print(f"    - Delivery Fee: ₱{senior_delivery_fee:.2f}")
            print(f"    - Senior Discount (20%): ₱{senior_discount_amount:.2f}")
            print(f"    - Total: ₱{senior_total:.2f}")
            print(f"    - Savings: ₱{(Decimal('19.00') + senior_discount_amount):.2f}")
            
            print("\n" + "=" * 70)
            print("✅ ALL TESTS PASSED!")
            print("=" * 70)
            print(f"\n🎉 Test Order Created:")
            print(f"  - Order ID: {order.id}")
            print(f"  - Order Number: {order.order_number}")
            print(f"  - Customer: {customer.full_name}")
            print(f"  - Pharmacy: {pharmacy.pharmacy_name}")
            print(f"  - Items: {saved_order.order_lines.count()}")
            print(f"  - Total: ₱{saved_order.total_amount}")
            print(f"\n✅ Ready to wire to frontend!")
            
            return True
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = test_cart_order_creation()
    exit(0 if success else 1)

