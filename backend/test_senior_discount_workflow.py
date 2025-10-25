"""
Comprehensive test script for Senior Discount Workflow

Tests:
1. Accept cart order with auto-approve senior discount
2. Reject senior discount with total recalculation
3. Cancel order
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pharmago.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import json
from decimal import Decimal
from django.test import RequestFactory
from api.orders.models import Order, OrderLine
from api.users.models import User, Customer, Pharmacy
from api.inventory.models import PharmacyInventory
from api.direct import views_ops
from api.orders import views as order_views
from api.orders import senior_discount_views

def test_accept_cart_order_with_senior_discount():
    """Test accepting cart order with auto-approval of senior discount"""
    print("\n" + "="*80)
    print("TEST 1: Accept Cart Order with Auto-Approve Senior Discount")
    print("="*80)
    
    try:
        # Get or create test data
        pharmacy = Pharmacy.objects.filter(status='approved').first()
        if not pharmacy:
            print("❌ No approved pharmacy found")
            return False
        
        print(f"\n✅ Using pharmacy: {pharmacy.pharmacy_name}")
        
        pharmacy_user = pharmacy.user if hasattr(pharmacy, 'user') else User.objects.filter(role='pharmacy').first()
        
        # Create a test cart order with senior discount
        customer = Customer.objects.first()
        if not customer:
            print("❌ No customer found")
            return False
        
        # Get delivery address
        from api.locations.models import Address
        delivery_address = Address.objects.filter(customer=customer).first()
        if not delivery_address:
            print("❌ No delivery address found for customer")
            return False
        
        # Get inventory item
        inventory_item = PharmacyInventory.objects.filter(
            pharmacy=pharmacy,
            is_available=True
        ).first()
        
        if not inventory_item:
            print("❌ No inventory items found")
            return False
        
        # Create order with senior discount requested
        order = Order.objects.create(
            customer=customer,
            delivery_address=delivery_address,
            order_status='pending',
            payment_status='unpaid',
            delivery_type='standard',
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('0.00'),  # Waived for seniors
            delivery_fee=Decimal('45.00'),
            discount_amount=Decimal('20.00'),  # 20% pending
            total_amount=Decimal('125.00'),  # 100 - 20 + 45
            senior_discount_requested=True,
            senior_discount_status='pending',
            senior_citizen_id_image='test.jpg'
        )
        
        # Create order line
        OrderLine.objects.create(
            order=order,
            inventory_item=inventory_item,
            quantity=1,
            unit_price=Decimal('100.00'),
            total_price=Decimal('100.00')
        )
        
        print(f"\n📦 Created test order: {order.order_number}")
        print(f"   - Subtotal: ₱{order.subtotal}")
        print(f"   - Senior Discount (pending): ₱{order.discount_amount}")
        print(f"   - Total: ₱{order.total_amount}")
        print(f"   - Senior Status: {order.senior_discount_status}")
        
        # Create request to accept order
        factory = RequestFactory()
        request_body = {
            'pharmacy_user_id': pharmacy_user.id,
            'notes': 'Test order acceptance'
        }
        
        request = factory.post(
            f'/api/accept-cart-order/{order.id}/',
            data=json.dumps(request_body),
            content_type='application/json'
        )
        
        # Call endpoint
        print(f"\n📤 Accepting cart order...")
        response = views_ops.accept_cart_order(request, order.id)
        data = json.loads(response.content)
        
        print(f"\n📥 Response:")
        print(f"   - Success: {data.get('success')}")
        print(f"   - Message: {data.get('message')}")
        print(f"   - Order Status: {data.get('order_status')}")
        print(f"   - Senior Discount Auto-Approved: {data.get('senior_discount_auto_approved')}")
        
        if data.get('senior_discount_auto_approved'):
            print(f"   - Discount Amount: ₱{data.get('discount_amount')}")
            print(f"   - New Total: ₱{data.get('total_amount')}")
            print(f"   - Message: {data.get('senior_discount_message')}")
        
        # Verify in database
        order.refresh_from_db()
        print(f"\n🔍 Database Verification:")
        print(f"   - Order Status: {order.order_status}")
        print(f"   - Senior Discount Status: {order.senior_discount_status}")
        print(f"   - Discount Amount: ₱{order.discount_amount}")
        print(f"   - Service Fee (should be ₱0 for seniors): ₱{order.tax_amount}")
        print(f"   - Total: ₱{order.total_amount}")
        
        # Verify results
        expected_discount = order.subtotal * Decimal('0.20')
        
        if (order.order_status == 'accepted' and 
            order.senior_discount_status == 'approved' and
            abs(order.discount_amount - expected_discount) < Decimal('0.01') and
            order.tax_amount == Decimal('0.00')):
            print(f"\n✅ TEST 1 PASSED: Order accepted with auto-approved senior discount!")
            return True
        else:
            print(f"\n❌ TEST 1 FAILED:")
            print(f"   Expected: accepted, approved, ₱{expected_discount}, ₱0.00")
            print(f"   Got: {order.order_status}, {order.senior_discount_status}, ₱{order.discount_amount}, ₱{order.tax_amount}")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST 1 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_reject_senior_discount():
    """Test rejecting senior discount with total recalculation"""
    print("\n" + "="*80)
    print("TEST 2: Reject Senior Discount with Total Recalculation")
    print("="*80)
    
    try:
        import time
        time.sleep(1)  # Ensure unique order number
        
        # Get pharmacy
        pharmacy = Pharmacy.objects.filter(status='approved').first()
        if not pharmacy:
            print("❌ No approved pharmacy found")
            return False
        
        pharmacy_user = pharmacy.user if hasattr(pharmacy, 'user') else User.objects.filter(role='pharmacy').first()
        customer = Customer.objects.first()
        
        if not customer:
            print("❌ No customer found")
            return False
        
        # Get delivery address
        from api.locations.models import Address
        delivery_address = Address.objects.filter(customer=customer).first()
        if not delivery_address:
            print("❌ No delivery address found")
            return False
        
        # Get inventory item
        inventory_item = PharmacyInventory.objects.filter(
            pharmacy=pharmacy,
            is_available=True
        ).first()
        
        # Create order with pending senior discount
        order = Order.objects.create(
            customer=customer,
            delivery_address=delivery_address,
            order_status='pending',
            payment_status='unpaid',
            delivery_type='standard',
            subtotal=Decimal('200.00'),
            tax_amount=Decimal('0.00'),  # Waived for seniors (pending)
            delivery_fee=Decimal('50.00'),
            discount_amount=Decimal('40.00'),  # 20% pending
            total_amount=Decimal('210.00'),  # 200 - 40 + 50
            senior_discount_requested=True,
            senior_discount_status='pending',
            senior_citizen_id_image='test.jpg'
        )
        
        # Create order line
        OrderLine.objects.create(
            order=order,
            inventory_item=inventory_item,
            quantity=2,
            unit_price=Decimal('100.00'),
            total_price=Decimal('200.00')
        )
        
        print(f"\n📦 Created test order: {order.order_number}")
        print(f"   - Subtotal: ₱{order.subtotal}")
        print(f"   - Service Fee (waived): ₱{order.tax_amount}")
        print(f"   - Senior Discount (pending): ₱{order.discount_amount}")
        print(f"   - Total (with discount): ₱{order.total_amount}")
        
        # Create request to reject senior discount
        factory = RequestFactory()
        request_body = {
            'pharmacy_user_id': pharmacy_user.id,
            'action': 'reject',
            'notes': 'ID image is unclear'
        }
        
        request = factory.post(
            f'/api/orders/pharmacy-review-senior-discount/{order.id}/',
            data=json.dumps(request_body),
            content_type='application/json'
        )
        
        # Call endpoint
        print(f"\n📤 Rejecting senior discount...")
        response = senior_discount_views.pharmacy_review_senior_discount(request, order.id)
        data = json.loads(response.content)
        
        print(f"\n📥 Response:")
        print(f"   - Success: {data.get('success')}")
        print(f"   - Action: {data.get('action')}")
        print(f"   - Discount Amount: ₱{data.get('discount_amount')}")
        print(f"   - New Total: ₱{data.get('new_total')}")
        
        # Verify in database
        order.refresh_from_db()
        print(f"\n🔍 Database Verification:")
        print(f"   - Senior Discount Status: {order.senior_discount_status}")
        print(f"   - Discount Amount: ₱{order.discount_amount}")
        print(f"   - Service Fee (should be ₱19.00 now): ₱{order.tax_amount}")
        print(f"   - Total: ₱{order.total_amount}")
        
        # Calculate expected total
        expected_total = order.subtotal + Decimal('19.00') + order.delivery_fee
        print(f"\n💰 Total Calculation:")
        print(f"   - Subtotal: ₱{order.subtotal}")
        print(f"   - Service Fee: ₱19.00 (restored)")
        print(f"   - Delivery Fee: ₱{order.delivery_fee}")
        print(f"   - Expected Total: ₱{expected_total}")
        print(f"   - Actual Total: ₱{order.total_amount}")
        
        # Verify results
        if (order.senior_discount_status == 'rejected' and
            order.discount_amount == Decimal('0.00') and
            order.tax_amount == Decimal('19.00') and
            abs(order.total_amount - expected_total) < Decimal('0.01')):
            print(f"\n✅ TEST 2 PASSED: Senior discount rejected and totals recalculated correctly!")
            return True
        else:
            print(f"\n❌ TEST 2 FAILED:")
            print(f"   Expected: rejected, ₱0.00, ₱19.00, ₱{expected_total}")
            print(f"   Got: {order.senior_discount_status}, ₱{order.discount_amount}, ₱{order.tax_amount}, ₱{order.total_amount}")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST 2 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_cancel_order():
    """Test cancelling an order"""
    print("\n" + "="*80)
    print("TEST 3: Cancel Order")
    print("="*80)
    
    try:
        import time
        time.sleep(1)  # Ensure unique order number
        
        # Get test data
        customer = Customer.objects.first()
        pharmacy = Pharmacy.objects.filter(status='approved').first()
        
        if not customer or not pharmacy:
            print("❌ No customer or pharmacy found")
            return False
        
        # Get delivery address
        from api.locations.models import Address
        delivery_address = Address.objects.filter(customer=customer).first()
        if not delivery_address:
            print("❌ No delivery address found")
            return False
        
        # Get inventory item
        inventory_item = PharmacyInventory.objects.filter(
            pharmacy=pharmacy,
            is_available=True
        ).first()
        
        # Create order
        order = Order.objects.create(
            customer=customer,
            delivery_address=delivery_address,
            order_status='pending',
            payment_status='unpaid',
            delivery_type='standard',
            subtotal=Decimal('150.00'),
            tax_amount=Decimal('19.00'),
            delivery_fee=Decimal('40.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('209.00')
        )
        
        # Create order line
        OrderLine.objects.create(
            order=order,
            inventory_item=inventory_item,
            quantity=1,
            unit_price=Decimal('150.00'),
            total_price=Decimal('150.00')
        )
        
        print(f"\n📦 Created test order: {order.order_number}")
        print(f"   - Status: {order.order_status}")
        print(f"   - Total: ₱{order.total_amount}")
        
        # Create request to cancel order
        factory = RequestFactory()
        request_body = {
            'customer_id': customer.id,
            'reason': 'Senior discount rejected, customer cancelled'
        }
        
        request = factory.post(
            f'/api/orders/cancel/{order.id}/',
            data=json.dumps(request_body),
            content_type='application/json'
        )
        
        # Call endpoint
        print(f"\n📤 Cancelling order...")
        response = order_views.cancel_order(request, order.id)
        data = json.loads(response.content)
        
        print(f"\n📥 Response:")
        print(f"   - Success: {data.get('success')}")
        print(f"   - Message: {data.get('message')}")
        print(f"   - Order Status: {data.get('order_status')}")
        print(f"   - Cancellation Reason: {data.get('cancellation_reason')}")
        
        # Verify in database
        order.refresh_from_db()
        print(f"\n🔍 Database Verification:")
        print(f"   - Order Status: {order.order_status}")
        print(f"   - Expected: cancelled")
        
        if order.order_status == 'cancelled':
            print(f"\n✅ TEST 3 PASSED: Order cancelled successfully!")
            return True
        else:
            print(f"\n❌ TEST 3 FAILED: Order status is {order.order_status}, expected cancelled")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST 3 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("🧪 SENIOR DISCOUNT WORKFLOW - BACKEND TESTS")
    print("="*80)
    
    results = []
    
    # Test 1: Accept cart order with auto-approve
    results.append(("Accept Order with Auto-Approve Senior Discount", test_accept_cart_order_with_senior_discount()))
    
    # Test 2: Reject senior discount
    results.append(("Reject Senior Discount with Total Recalculation", test_reject_senior_discount()))
    
    # Test 3: Cancel order
    results.append(("Cancel Order", test_cancel_order()))
    
    # Summary
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Senior discount workflow backend is ready! 🎉")
        print("\n📋 Next Steps:")
        print("   1. ✅ Backend endpoints working")
        print("   2. ⏭️  Proceed to frontend implementation")
        print("   3. ⏭️  Then mobile app implementation")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review above.")
    
    print("="*80)


if __name__ == '__main__':
    main()

