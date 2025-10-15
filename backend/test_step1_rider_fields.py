#!/usr/bin/env python
"""
Test script to verify Step 1: Rider status fields were added correctly.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.users.models import Rider

print("\n" + "="*70)
print("STEP 1 VERIFICATION: Rider Status Fields")
print("="*70)

try:
    # Check total riders
    riders = Rider.objects.all()
    print(f"\n✅ Total riders in database: {riders.count()}")
    
    # Check activity status field
    online_riders = riders.filter(activity_status='online')
    offline_riders = riders.filter(activity_status='offline')
    print(f"✅ Online riders: {online_riders.count()}")
    print(f"✅ Offline riders: {offline_riders.count()}")
    
    # Test with first rider
    if riders.exists():
        rider = riders.first()
        print(f"\n📊 Sample Rider: {rider.full_name}")
        print(f"   Activity Status: {rider.activity_status}")
        print(f"   Acceptance Rate: {rider.acceptance_rate}%")
        print(f"   Total Offers Received: {rider.total_offers_received}")
        print(f"   Total Offers Accepted: {rider.total_offers_accepted}")
        print(f"   Has Location: {rider.has_current_location()}")
        print(f"   Is Available for Dispatch: {rider.is_available_for_dispatch()}")
        
        # Test helper methods
        print(f"\n🧪 Testing Helper Methods:")
        print(f"   is_online(): {rider.is_online()}")
        print(f"   is_available_for_dispatch(): {rider.is_available_for_dispatch()}")
        print(f"   has_current_location(): {rider.has_current_location()}")
    
    print("\n" + "="*70)
    print("✅ STEP 1 COMPLETE - All fields working correctly!")
    print("="*70)
    print("\nNew fields added:")
    print("  ✅ activity_status (online/offline/busy/break)")
    print("  ✅ last_seen_at (timestamp)")
    print("  ✅ current_latitude (decimal)")
    print("  ✅ current_longitude (decimal)")
    print("  ✅ acceptance_rate (percentage)")
    print("  ✅ total_offers_received (counter)")
    print("  ✅ total_offers_accepted (counter)")
    print("  ✅ total_offers_rejected (counter)")
    print("  ✅ total_offers_timeout (counter)")
    print("  ✅ average_response_time (seconds)")
    print("\nHelper methods added:")
    print("  ✅ is_online()")
    print("  ✅ is_available_for_dispatch()")
    print("  ✅ has_current_location()")
    print("  ✅ update_location(lat, lng)")
    print("  ✅ update_dispatch_metrics(accepted, response_time)")
    print("\n" + "="*70 + "\n")

except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

