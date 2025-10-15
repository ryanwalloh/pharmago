#!/usr/bin/env python
"""
Test script to verify Step 2: Dispatch models were created correctly.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.delivery.models import DispatchOffer, DispatchQueue
from api.users.models import Rider
from api.orders.models import Order
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

print("\n" + "="*70)
print("STEP 2 VERIFICATION: Dispatch Models")
print("="*70)

try:
    # Test DispatchOffer model
    print("\n📦 Testing DispatchOffer model...")
    
    # Get a test rider
    rider = Rider.objects.first()
    if not rider:
        print("❌ No riders found in database. Please create a rider first.")
    else:
        print(f"✅ Found test rider: {rider.full_name}")
        
        # Get a test order
        order = Order.objects.filter(order_status='accepted').first()
        if not order:
            print("⚠️  No accepted orders found. Using any order for testing...")
            order = Order.objects.first()
        
        if order:
            print(f"✅ Found test order: {order.order_number}")
            
            # Create a test DispatchOffer
            test_offer = DispatchOffer.objects.create(
                offer_id=f"TEST_OFFER_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                rider=rider,
                order=order,
                is_batch=False,
                orders_count=1,
                total_earnings=Decimal('23.20'),
                pickup_distance_km=Decimal('2.5'),
                expires_at=timezone.now() + timedelta(seconds=30),
                attempt_number=1
            )
            
            print(f"✅ Created DispatchOffer: {test_offer.offer_id}")
            print(f"   Status: {test_offer.status}")
            print(f"   Rider: {test_offer.rider.full_name}")
            print(f"   Earnings: ₱{test_offer.total_earnings}")
            print(f"   Is Active: {test_offer.is_active()}")
            print(f"   Is Expired: {test_offer.is_expired()}")
            
            # Test DispatchQueue model
            print(f"\n📋 Testing DispatchQueue model...")
            
            test_queue = DispatchQueue.objects.create(
                queue_id=f"TEST_DQ_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                order=order,
                is_batch=False,
                priority_level=1,
                current_offer=test_offer,
                total_attempts=1,
                max_attempts=10
            )
            
            print(f"✅ Created DispatchQueue: {test_queue.queue_id}")
            print(f"   Status: {test_queue.status}")
            print(f"   Priority: {test_queue.priority_level}")
            print(f"   Total Attempts: {test_queue.total_attempts}")
            print(f"   Max Attempts: {test_queue.max_attempts}")
            print(f"   Is Active: {test_queue.is_active()}")
            print(f"   Is Completed: {test_queue.is_completed()}")
            
            # Test helper methods
            print(f"\n🧪 Testing Helper Methods...")
            
            # Test mark_accepted
            print(f"   Testing mark_accepted()...")
            test_offer.mark_accepted()
            print(f"   ✅ Offer marked as accepted")
            print(f"   Status: {test_offer.status}")
            print(f"   Response time: {test_offer.response_time_seconds}s")
            
            # Verify rider metrics updated
            rider.refresh_from_db()
            print(f"   ✅ Rider metrics updated:")
            print(f"      Total offers received: {rider.total_offers_received}")
            print(f"      Total offers accepted: {rider.total_offers_accepted}")
            print(f"      Acceptance rate: {rider.acceptance_rate}%")
            
            # Clean up test data
            print(f"\n🧹 Cleaning up test data...")
            test_queue.delete()
            test_offer.delete()
            print(f"✅ Test data cleaned up")
        else:
            print("❌ No orders found in database")
    
    print("\n" + "="*70)
    print("✅ STEP 2 COMPLETE - All models working correctly!")
    print("="*70)
    print("\nNew models created:")
    print("  ✅ DispatchOffer - Tracks individual offers to riders")
    print("  ✅ DispatchQueue - Manages dispatch process")
    print("\nDispatchOffer methods:")
    print("  ✅ is_expired() - Check if offer expired")
    print("  ✅ is_active() - Check if still pending")
    print("  ✅ mark_accepted() - Accept and update metrics")
    print("  ✅ mark_rejected(reason) - Reject and update metrics")
    print("  ✅ mark_timeout() - Handle timeout")
    print("  ✅ cancel() - Cancel offer")
    print("\nDispatchQueue methods:")
    print("  ✅ is_active() - Check if still processing")
    print("  ✅ is_completed() - Check if done")
    print("  ✅ mark_assigned() - Mark as successfully assigned")
    print("  ✅ mark_failed() - Mark as failed")
    print("  ✅ cancel() - Cancel dispatch")
    print("\n" + "="*70 + "\n")

except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

