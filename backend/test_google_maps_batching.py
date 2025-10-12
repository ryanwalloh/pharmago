#!/usr/bin/env python
"""
Test script to demonstrate Google Maps enhanced order batching.
Shows comparison between Haversine and driving distance calculations.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.utils.google_maps_service import GoogleMapsService
from api.delivery.models import OrderBatchingService
from api.orders.models import Order


def test_google_maps_service():
    """Test Google Maps service with sample coordinates."""
    print("\n" + "="*70)
    print("TESTING GOOGLE MAPS SERVICE")
    print("="*70)
    
    # Sample coordinates in Iligan City
    # Brgy. San Antonio to Brgy. Tibanga
    origin_lat, origin_lng = 8.2280, 124.2452
    dest_lat, dest_lng = 8.2400, 124.2600
    
    print(f"\n📍 Origin: ({origin_lat}, {origin_lng}) - Brgy. San Antonio")
    print(f"📍 Destination: ({dest_lat}, {dest_lng}) - Brgy. Tibanga")
    
    # Test Haversine distance
    haversine_dist = GoogleMapsService._haversine_distance(
        origin_lat, origin_lng, dest_lat, dest_lng
    )
    print(f"\n✈️  Haversine (straight-line) distance: {haversine_dist:.2f} km")
    
    # Test Google Maps driving distance
    result = GoogleMapsService.get_driving_distance(
        origin_lat, origin_lng, dest_lat, dest_lng,
        fallback_to_haversine=True
    )
    
    if result:
        driving_dist, duration = result
        print(f"🚗 Google Maps driving distance: {driving_dist:.2f} km")
        if duration:
            print(f"⏱️  Estimated duration: {duration:.1f} minutes")
        
        # Calculate difference
        if driving_dist and haversine_dist:
            difference = ((driving_dist - haversine_dist) / haversine_dist) * 100
            print(f"\n📊 Driving distance is {abs(difference):.1f}% {'longer' if difference > 0 else 'shorter'} than straight-line")
    else:
        print("❌ Google Maps API unavailable, using Haversine fallback")


def test_order_batching():
    """Test order batching with actual orders from database."""
    print("\n" + "="*70)
    print("TESTING ORDER BATCHING")
    print("="*70)
    
    # Get available orders
    available_orders = Order.objects.filter(
        order_status__in=[
            Order.OrderStatus.ACCEPTED,
            Order.OrderStatus.PREPARING,
            Order.OrderStatus.READY_FOR_PICKUP
        ]
    ).select_related('delivery_address')[:5]
    
    if not available_orders.exists():
        print("\n⚠️  No available orders found for testing")
        return
    
    orders_list = list(available_orders)
    print(f"\n📦 Found {len(orders_list)} available orders")
    
    # Display order addresses
    print("\n" + "-"*70)
    for i, order in enumerate(orders_list, 1):
        addr = order.delivery_address
        print(f"{i}. Order #{order.order_number}")
        print(f"   Address: {addr.barangay}, {addr.city}")
        if addr.has_coordinates():
            print(f"   Coordinates: ({float(addr.latitude):.6f}, {float(addr.longitude):.6f})")
        else:
            print(f"   ⚠️  No coordinates available")
    
    # Test batching with Haversine
    print("\n" + "-"*70)
    print("🔍 Testing batching with HAVERSINE distance:")
    print("-"*70)
    
    haversine_batches = OrderBatchingService.find_batchable_orders(
        orders_list,
        max_batch_size=3,
        max_distance_km=2.0,
        use_driving_distance=False
    )
    
    print(f"✅ Found {len(haversine_batches)} batches using Haversine")
    for i, batch in enumerate(haversine_batches, 1):
        print(f"   Batch {i}: {len(batch)} orders")
        for order in batch:
            print(f"      - {order.order_number}")
    
    # Test batching with Google Maps
    print("\n" + "-"*70)
    print("🔍 Testing batching with GOOGLE MAPS driving distance:")
    print("-"*70)
    
    gmaps_batches = OrderBatchingService.find_batchable_orders(
        orders_list,
        max_batch_size=3,
        max_distance_km=2.0,
        use_driving_distance=True
    )
    
    print(f"✅ Found {len(gmaps_batches)} batches using Google Maps")
    for i, batch in enumerate(gmaps_batches, 1):
        print(f"   Batch {i}: {len(batch)} orders")
        for order in batch:
            print(f"      - {order.order_number}")
    
    # Compare results
    print("\n" + "="*70)
    print("📊 COMPARISON:")
    print("="*70)
    print(f"Haversine batches: {len(haversine_batches)}")
    print(f"Google Maps batches: {len(gmaps_batches)}")
    
    if len(gmaps_batches) > len(haversine_batches):
        print("\n✅ Google Maps found MORE batching opportunities (more accurate)")
    elif len(gmaps_batches) < len(haversine_batches):
        print("\n⚠️  Google Maps found FEWER batching opportunities (driving distance > straight-line)")
    else:
        print("\n📌 Both methods produced the same number of batches")


def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("GOOGLE MAPS ENHANCED ORDER BATCHING TEST")
    print("="*70)
    
    try:
        test_google_maps_service()
        test_order_batching()
        
        print("\n" + "="*70)
        print("✅ TESTS COMPLETED")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()

