#!/usr/bin/env python
"""
Direct script to apply dynamic pricing to existing orders.
No confirmation prompt - applies immediately.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.orders.models import Order
from api.orders.pricing_service import DeliveryPricingService
from decimal import Decimal


def apply_dynamic_pricing():
    """Apply dynamic pricing to existing orders."""
    print("\n" + "="*70)
    print("APPLYING DYNAMIC PRICING TO EXISTING ORDERS")
    print("="*70)
    
    # Get orders
    orders = Order.objects.filter(
        order_status__in=['accepted', 'preparing', 'ready_for_pickup']
    ).select_related(
        'customer', 'delivery_address'
    ).prefetch_related(
        'order_lines__inventory_item__pharmacy'
    )
    
    if not orders.exists():
        print("\n⚠️  No orders found")
        return
    
    print(f"\n📦 Processing {orders.count()} orders...\n")
    
    updated_count = 0
    no_change_count = 0
    
    for order in orders:
        # Get pharmacy
        pharmacy = None
        if order.order_lines.exists():
            first_line = order.order_lines.first()
            if first_line and first_line.inventory_item:
                pharmacy = first_line.inventory_item.pharmacy
        
        if not pharmacy:
            print(f"❌ {order.order_number}: No pharmacy found")
            continue
        
        # Check coordinates
        if not (pharmacy.latitude and pharmacy.longitude and
                order.delivery_address.latitude and order.delivery_address.longitude):
            print(f"⚠️  {order.order_number}: Missing coordinates")
            continue
        
        # Calculate new fee
        try:
            new_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
                float(pharmacy.latitude),
                float(pharmacy.longitude),
                float(order.delivery_address.latitude),
                float(order.delivery_address.longitude),
                use_google_maps=True
            )
            
            old_fee = order.delivery_fee
            
            if new_fee != old_fee:
                # Update in database
                order.delivery_fee = new_fee
                order.save()
                
                old_rider = float(old_fee) * 0.8
                new_rider = float(new_fee) * 0.8
                change = float(new_fee) - float(old_fee)
                
                print(f"✅ {order.order_number}: ₱{old_fee:.2f} → ₱{new_fee:.2f} ({distance_km:.2f}km)")
                print(f"   Rider earnings: ₱{old_rider:.2f} → ₱{new_rider:.2f} (+₱{new_rider-old_rider:.2f})")
                updated_count += 1
            else:
                print(f"✓  {order.order_number}: ₱{new_fee:.2f} (no change, {distance_km:.2f}km)")
                no_change_count += 1
        
        except Exception as e:
            print(f"❌ {order.order_number}: Error - {str(e)}")
    
    # Summary
    print("\n" + "="*70)
    print("RESULTS")
    print("="*70)
    print(f"✅ Updated: {updated_count} orders")
    print(f"✓  No change needed: {no_change_count} orders")
    print(f"📦 Total processed: {updated_count + no_change_count} orders")
    print("\n" + "="*70 + "\n")


if __name__ == '__main__':
    apply_dynamic_pricing()

