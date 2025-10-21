"""
Script to set all pharmacy inventory items to maximum stock level.

This script updates all existing pharmacy inventory items to have the maximum 
possible stock quantity (max_stock_level). This is useful for pharmacies that 
don't track individual stock counts and instead use the availability toggle.

Usage:
    python set_max_stock_all_inventory.py

What it does:
- Sets stock_quantity = max_stock_level for all inventory items
- Only updates items where stock_quantity < max_stock_level
- Preserves the max_stock_level settings
- Shows progress and statistics
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.inventory.models import PharmacyInventory
from django.db.models import F


def set_all_inventory_to_max_stock():
    """Set all inventory items to their maximum stock level"""
    
    print("\n" + "=" * 80)
    print(" PHARMACY INVENTORY STOCK UPDATE")
    print("=" * 80)
    
    # Get all inventory items
    all_items = PharmacyInventory.objects.all()
    total_count = all_items.count()
    
    print(f"\n📊 Total inventory items: {total_count}")
    
    # Get items that need updating (stock_quantity < max_stock_level)
    items_to_update = PharmacyInventory.objects.filter(
        stock_quantity__lt=F('max_stock_level')
    )
    update_count = items_to_update.count()
    
    print(f"📦 Items needing update: {update_count}")
    print(f"✅ Items already at max: {total_count - update_count}")
    
    if update_count == 0:
        print("\n✅ All inventory items are already at maximum stock!")
        return
    
    # Show some examples of what will be updated
    print("\n📋 Sample items to update:")
    for item in items_to_update[:5]:
        print(f"   - {item.pharmacy.pharmacy_name}: {item.display_name}")
        print(f"     Current: {item.stock_quantity} → New: {item.max_stock_level}")
    
    if update_count > 5:
        print(f"   ... and {update_count - 5} more items")
    
    # Confirm before proceeding
    response = input(f"\n⚠️  Update {update_count} items to maximum stock? (yes/no): ")
    
    if response.lower() != 'yes':
        print("\n❌ Update cancelled")
        return
    
    print("\n🔄 Updating inventory...")
    
    # Bulk update - set stock_quantity = max_stock_level
    updated = items_to_update.update(stock_quantity=F('max_stock_level'))
    
    print(f"\n✅ Successfully updated {updated} inventory items!")
    
    # Show statistics by pharmacy
    print("\n📊 Updated items by pharmacy:")
    from django.db.models import Count
    pharmacy_stats = PharmacyInventory.objects.values(
        'pharmacy__pharmacy_name'
    ).annotate(
        total_items=Count('id')
    ).order_by('-total_items')[:10]
    
    for stat in pharmacy_stats:
        print(f"   - {stat['pharmacy__pharmacy_name']}: {stat['total_items']} items")
    
    # Verify the update
    remaining = PharmacyInventory.objects.filter(
        stock_quantity__lt=F('max_stock_level')
    ).count()
    
    print(f"\n🔍 Verification:")
    print(f"   Items still needing update: {remaining}")
    print(f"   Items at max stock: {PharmacyInventory.objects.filter(stock_quantity=F('max_stock_level')).count()}")
    
    if remaining == 0:
        print("\n✅ All inventory items are now at maximum stock level!")
    else:
        print(f"\n⚠️  {remaining} items still need updating (check for errors)")
    
    print("\n" + "=" * 80)
    print(" UPDATE COMPLETED")
    print("=" * 80 + "\n")


def show_current_stats():
    """Show current inventory statistics"""
    print("\n📊 Current Inventory Statistics:")
    
    total = PharmacyInventory.objects.count()
    at_max = PharmacyInventory.objects.filter(stock_quantity=F('max_stock_level')).count()
    below_max = PharmacyInventory.objects.filter(stock_quantity__lt=F('max_stock_level')).count()
    zero_stock = PharmacyInventory.objects.filter(stock_quantity=0).count()
    
    print(f"   Total items: {total}")
    print(f"   At max stock: {at_max} ({at_max/total*100:.1f}%)")
    print(f"   Below max: {below_max} ({below_max/total*100:.1f}%)")
    print(f"   Zero stock: {zero_stock} ({zero_stock/total*100:.1f}%)")


if __name__ == "__main__":
    print("\n🚀 Pharmacy Inventory Stock Management Script")
    print("=" * 80)
    
    show_current_stats()
    
    print("\n" + "=" * 80)
    print("\nThis script will set all inventory items to their maximum stock level.")
    print("This is useful for pharmacies that use the availability toggle instead")
    print("of tracking exact stock counts.")
    print("\n" + "=" * 80)
    
    set_all_inventory_to_max_stock()
    
    show_current_stats()

