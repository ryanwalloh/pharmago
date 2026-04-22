"""
Debug script to check order fields
"""

import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pharmago.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.orders.models import Order

# Get the most recent order
order = Order.objects.order_by('-created_at').first()

if order:
    print(f"\n🔍 Order: {order.order_number}")
    print(f"   ID: {order.id}")
    print(f"   prescription_image_url: '{order.prescription_image_url}'")
    print(f"   prescription_status: '{order.prescription_status}'")
    print(f"   prescription_notes: '{order.prescription_notes}'")
    
    # Check boolean evaluation
    has_image = bool(getattr(order, 'prescription_image_url', ''))
    has_status = bool(getattr(order, 'prescription_status', ''))
    
    print(f"\n   bool(prescription_image_url): {has_image}")
    print(f"   bool(prescription_status): {has_status}")
    print(f"   is_rx (current logic): {has_image or has_status}")
    
    # Check order lines
    print(f"\n   Order lines count: {order.order_lines.count()}")
    if order.order_lines.count() > 0:
        print(f"   First item: {order.order_lines.first().inventory_item.name}")
    
    # Better detection
    has_items = order.order_lines.count() > 0
    print(f"\n   ✅ Better detection (has items): {has_items}")
    print(f"   ✅ Should be cart order: {has_items and not has_image}")
else:
    print("No orders found")

