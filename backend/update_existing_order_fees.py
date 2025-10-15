#!/usr/bin/env python
"""
Safe migration script to update existing orders with dynamic distance-based pricing.

This script:
1. Fetches existing orders with fixed ₱29.00 delivery fee
2. Calculates actual driving distance (pharmacy → customer)
3. Applies new pricing formula
4. Shows before/after comparison
5. Updates database with new fees

Formula:
- Base: ₱29.00
- Threshold: 5km
- Rate: ₱8/km over threshold
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.orders.models import Order
from api.orders.pricing_service import DeliveryPricingService
from decimal import Decimal


def update_order_delivery_fees(dry_run=True):
    """
    Update delivery fees for existing orders based on actual distance.
    
    Args:
        dry_run: If True, shows changes without applying them
    """
    print("\n" + "="*70)
    print("EXISTING ORDER DELIVERY FEE UPDATE")
    print("="*70)
    
    # Get orders with old pricing (₱29.00)
    orders = Order.objects.filter(
        order_status__in=['accepted', 'preparing', 'ready_for_pickup']
    ).select_related(
        'customer', 'delivery_address'
    ).prefetch_related(
        'order_lines__inventory_item__pharmacy'
    )
    
    if not orders.exists():
        print("\n⚠️  No orders found to update")
        return
    
    print(f"\n📦 Found {orders.count()} orders to process\n")
    
    updates = []
    no_coordinates = []
    errors = []
    
    for order in orders:
        print("-" * 70)
        print(f"Order: {order.order_number}")
        print(f"Current delivery_fee: ₱{order.delivery_fee:.2f}")
        
        # Get pharmacy from first order line
        pharmacy = None
        if order.order_lines.exists():
            first_line = order.order_lines.first()
            if first_line and first_line.inventory_item:
                pharmacy = first_line.inventory_item.pharmacy
        
        if not pharmacy:
            print("  ❌ No pharmacy found for this order")
            errors.append(order.order_number)
            continue
        
        # Check if coordinates are available
        if not (pharmacy.latitude and pharmacy.longitude and
                order.delivery_address.latitude and order.delivery_address.longitude):
            print(f"  ⚠️  Missing coordinates")
            print(f"     Pharmacy: ({pharmacy.latitude}, {pharmacy.longitude})")
            print(f"     Customer: ({order.delivery_address.latitude}, {order.delivery_address.longitude})")
            no_coordinates.append(order.order_number)
            continue
        
        # Calculate new delivery fee
        try:
            new_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
                float(pharmacy.latitude),
                float(pharmacy.longitude),
                float(order.delivery_address.latitude),
                float(order.delivery_address.longitude),
                use_google_maps=True
            )
            
            old_fee = order.delivery_fee
            old_rider_earnings = float(old_fee) * 0.8
            new_rider_earnings = float(new_fee) * 0.8
            
            print(f"  📍 Distance: {distance_km:.2f} km")
            print(f"  💰 OLD: ₱{old_fee:.2f} → Rider gets ₱{old_rider_earnings:.2f}")
            print(f"  💰 NEW: ₱{new_fee:.2f} → Rider gets ₱{new_rider_earnings:.2f}")
            
            if new_fee != old_fee:
                difference = float(new_fee) - float(old_fee)
                percentage = (difference / float(old_fee)) * 100
                print(f"  📊 Change: {'+'if difference > 0 else ''}{difference:.2f} ({percentage:+.1f}%)")
                
                updates.append({
                    'order': order,
                    'old_fee': old_fee,
                    'new_fee': new_fee,
                    'distance': distance_km,
                    'change': difference
                })
            else:
                print(f"  ✅ No change needed (already optimal)")
        
        except Exception as e:
            print(f"  ❌ Error calculating fee: {str(e)}")
            errors.append(order.order_number)
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total orders processed: {orders.count()}")
    print(f"Orders to update: {len(updates)}")
    print(f"Orders with missing coordinates: {len(no_coordinates)}")
    print(f"Orders with errors: {len(errors)}")
    
    if updates:
        print("\n" + "-"*70)
        print("CHANGES TO BE APPLIED:")
        print("-"*70)
        
        total_old = sum(float(u['old_fee']) for u in updates)
        total_new = sum(float(u['new_fee']) for u in updates)
        total_change = total_new - total_old
        
        for update in updates:
            print(f"{update['order'].order_number}: ₱{update['old_fee']:.2f} → ₱{update['new_fee']:.2f} ({update['distance']:.2f}km)")
        
        print(f"\nTotal old fees: ₱{total_old:.2f}")
        print(f"Total new fees: ₱{total_new:.2f}")
        print(f"Total change: {'+'if total_change > 0 else ''}₱{total_change:.2f}")
    
    # Apply updates if not dry run
    if not dry_run and updates:
        print("\n" + "="*70)
        print("APPLYING UPDATES...")
        print("="*70)
        
        for update in updates:
            order = update['order']
            order.delivery_fee = update['new_fee']
            order.save()
            print(f"✅ Updated {order.order_number}")
        
        print(f"\n🎉 Successfully updated {len(updates)} orders!")
    elif dry_run and updates:
        print("\n" + "="*70)
        print("DRY RUN MODE - NO CHANGES APPLIED")
        print("="*70)
        print("\nTo apply these changes, run:")
        print("  python update_existing_order_fees.py --apply")
    
    print("\n" + "="*70 + "\n")


if __name__ == '__main__':
    import sys
    
    # Check if --apply flag is passed
    apply_changes = '--apply' in sys.argv
    
    if apply_changes:
        print("\n⚠️  APPLYING CHANGES TO DATABASE\n")
        response = input("Are you sure you want to update existing orders? (yes/no): ")
        if response.lower() == 'yes':
            update_order_delivery_fees(dry_run=False)
        else:
            print("\n❌ Cancelled by user\n")
    else:
        print("\n🔍 DRY RUN MODE - Preview changes without applying\n")
        update_order_delivery_fees(dry_run=True)

