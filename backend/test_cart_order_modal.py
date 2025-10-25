"""
Test script for Cart Order Modal functionality

This tests:
1. Accept cart order endpoint
2. Senior discount approval/rejection
3. Order data includes items and senior info
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pharmago.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import json
from django.test import RequestFactory
from api.orders.models import Order
from api.users.models import User, Customer, Pharmacy
from api.direct import views_ops
from api.orders import senior_discount_views

def test_accept_cart_order():
    """Test accepting a cart order"""
    print("\n" + "="*80)
    print("TEST 1: Accept Cart Order Endpoint")
    print("="*80)
    
    try:
        # Get a pending cart order (created by test_cart_order.py)
        order = Order.objects.filter(
            order_status='pending',
            prescription_image_url__isnull=True
        ).first()
        
        if not order:
            print("❌ No pending cart orders found. Please run test_cart_order.py first.")
            return False
        
        print(f"\n✅ Found pending cart order: {order.order_number}")
        print(f"   - Subtotal: ₱{order.subtotal}")
        print(f"   - Total: ₱{order.total_amount}")
        print(f"   - Status: {order.order_status}")
        
        # Get pharmacy user
        pharmacy_user = User.objects.filter(role='pharmacy').first()
        if not pharmacy_user:
            print("❌ No pharmacy user found")
            return False
        
        print(f"   - Pharmacy user: {pharmacy_user.username}")
        
        # Create request
        factory = RequestFactory()
        request_body = {
            'pharmacy_user_id': pharmacy_user.id,
            'notes': 'Test acceptance from cart order modal'
        }
        
        request = factory.post(
            f'/api/accept-cart-order/{order.id}/',
            data=json.dumps(request_body),
            content_type='application/json'
        )
        
        # Call endpoint
        print(f"\n📤 Calling accept_cart_order endpoint...")
        response = views_ops.accept_cart_order(request, order.id)
        
        # Parse response
        data = json.loads(response.content)
        
        print(f"\n📥 Response:")
        print(f"   - Success: {data.get('success')}")
        print(f"   - Message: {data.get('message')}")
        print(f"   - Order Status: {data.get('order_status')}")
        print(f"   - Total: ₱{data.get('total_amount', 0):.2f}")
        
        # Verify in database
        order.refresh_from_db()
        print(f"\n🔍 Verification:")
        print(f"   - DB Status: {order.order_status}")
        print(f"   - Expected: accepted")
        
        if order.order_status == 'accepted':
            print(f"\n✅ TEST 1 PASSED: Cart order accepted successfully!")
            return True
        else:
            print(f"\n❌ TEST 1 FAILED: Order status not updated")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST 1 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_pharmacy_orders_data():
    """Test that pharmacy orders include cart order data"""
    print("\n" + "="*80)
    print("TEST 2: Pharmacy Orders Data (Items & Senior Info)")
    print("="*80)
    
    try:
        # Get a pharmacy
        pharmacy = Pharmacy.objects.filter(status='approved').first()
        if not pharmacy:
            print("❌ No approved pharmacy found")
            return False
        
        print(f"\n✅ Testing with pharmacy: {pharmacy.name}")
        
        # Create request
        factory = RequestFactory()
        request = factory.get(f'/api/pharmacy-orders/{pharmacy.id}/')
        
        # Call endpoint
        print(f"\n📤 Calling direct_pharmacy_orders endpoint...")
        response = views_ops.direct_pharmacy_orders(request, pharmacy.id)
        
        # Parse response
        data = json.loads(response.content)
        
        if not data.get('success'):
            print(f"❌ API returned error: {data.get('error')}")
            return False
        
        # Check pending orders
        pending_orders = data.get('pending', [])
        print(f"\n📋 Found {len(pending_orders)} pending order(s)")
        
        # Look for cart orders (non-prescription)
        cart_orders = [o for o in pending_orders if not o.get('isPrescriptionOrder')]
        
        if not cart_orders:
            print("ℹ️  No cart orders in pending queue")
            return True
        
        print(f"\n🛒 Found {len(cart_orders)} cart order(s)")
        
        # Check first cart order
        cart_order = cart_orders[0]
        print(f"\n🔍 Checking cart order data:")
        print(f"   - Order Number: {cart_order.get('order_number')}")
        print(f"   - Total: ₱{cart_order.get('totalAmount', 0):.2f}")
        print(f"   - Has items: {len(cart_order.get('items', [])) > 0}")
        print(f"   - Senior discount requested: {cart_order.get('seniorDiscountRequested')}")
        print(f"   - Senior discount status: {cart_order.get('seniorDiscountStatus')}")
        
        # Verify items
        items = cart_order.get('items', [])
        print(f"\n📦 Order Items ({len(items)}):")
        for item in items[:3]:  # Show first 3
            print(f"   - {item.get('quantity')}x {item.get('name')} = ₱{item.get('total_price', 0):.2f}")
        
        # Check required fields
        required_fields = ['items', 'subtotal', 'tax_amount', 'delivery_fee', 'discount_amount']
        missing_fields = [f for f in required_fields if f not in cart_order]
        
        if missing_fields:
            print(f"\n❌ Missing fields: {missing_fields}")
            return False
        
        print(f"\n✅ TEST 2 PASSED: Cart order data complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ TEST 2 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_senior_discount_approval():
    """Test senior discount approval flow"""
    print("\n" + "="*80)
    print("TEST 3: Senior Discount Approval")
    print("="*80)
    
    try:
        # Get an order with pending senior discount
        order = Order.objects.filter(
            senior_discount_requested=True,
            senior_discount_status='pending'
        ).first()
        
        if not order:
            print("ℹ️  No orders with pending senior discount. Creating one...")
            
            # Create test order with senior discount
            customer = Customer.objects.first()
            if not customer:
                print("❌ No customer found")
                return False
            
            # This would be created by the mobile app test
            print("❌ Please create a cart order with senior discount from mobile app first")
            return False
        
        print(f"\n✅ Found order with pending senior discount: {order.order_number}")
        print(f"   - Subtotal: ₱{order.subtotal}")
        print(f"   - Current Total: ₱{order.total_amount}")
        print(f"   - Senior Status: {order.senior_discount_status}")
        
        # Get pharmacy user
        pharmacy_user = User.objects.filter(role='pharmacy').first()
        if not pharmacy_user:
            print("❌ No pharmacy user found")
            return False
        
        # Test approval
        factory = RequestFactory()
        request_body = {
            'pharmacy_user_id': pharmacy_user.id,
            'action': 'approve',
            'notes': 'Senior ID verified'
        }
        
        request = factory.post(
            f'/api/orders/pharmacy-review-senior-discount/{order.id}/',
            data=json.dumps(request_body),
            content_type='application/json'
        )
        
        print(f"\n📤 Approving senior discount...")
        response = senior_discount_views.pharmacy_review_senior_discount(request, order.id)
        
        # Parse response
        data = json.loads(response.content)
        
        print(f"\n📥 Response:")
        print(f"   - Success: {data.get('success')}")
        print(f"   - Message: {data.get('message')}")
        print(f"   - Discount Amount: ₱{data.get('discount_amount', 0):.2f}")
        print(f"   - New Total: ₱{data.get('new_total', 0):.2f}")
        
        # Verify in database
        order.refresh_from_db()
        print(f"\n🔍 Verification:")
        print(f"   - Status: {order.senior_discount_status}")
        print(f"   - Discount: ₱{order.discount_amount}")
        print(f"   - Total: ₱{order.total_amount}")
        
        # Calculate expected discount (20% of subtotal)
        expected_discount = order.subtotal * 0.20
        print(f"\n💚 Senior Discount Calculation:")
        print(f"   - Subtotal: ₱{order.subtotal}")
        print(f"   - 20% Discount: ₱{expected_discount:.2f}")
        print(f"   - Actual Discount: ₱{order.discount_amount}")
        
        if order.senior_discount_status == 'approved' and abs(order.discount_amount - expected_discount) < 0.01:
            print(f"\n✅ TEST 3 PASSED: Senior discount approved correctly!")
            return True
        else:
            print(f"\n❌ TEST 3 FAILED: Senior discount not applied correctly")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST 3 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("🧪 CART ORDER MODAL - BACKEND TESTS")
    print("="*80)
    
    results = []
    
    # Test 1: Accept cart order
    results.append(("Accept Cart Order", test_accept_cart_order()))
    
    # Test 2: Pharmacy orders data
    results.append(("Pharmacy Orders Data", test_pharmacy_orders_data()))
    
    # Test 3: Senior discount approval
    results.append(("Senior Discount Approval", test_senior_discount_approval()))
    
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
        print("\n🎉 ALL TESTS PASSED! Cart order modal backend is ready! 🎉")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review above.")
    
    print("="*80)


if __name__ == '__main__':
    main()

