"""
Direct endpoints for customer order history
No authentication required - uses customer_id parameter
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from api.orders.models import Order
from api.users.models import Customer

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def get_customer_orders(request, customer_id):
    """
    Get all orders for a customer, divided into active and recent.
    
    GET /api/customer-orders/<customer_id>/
    
    Returns:
    {
        "success": true,
        "data": {
            "active_orders": [...],  // pending, accepted, preparing, ready_for_pickup, picked_up
            "recent_orders": [...]   // delivered, cancelled (last 30 days)
        }
    }
    """
    try:
        # Get customer
        try:
            customer = Customer.objects.get(id=customer_id)
            logger.info(f"📋 Fetching orders for customer {customer.full_name} (ID: {customer_id})")
        except Customer.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'Customer not found with ID {customer_id}'
            }, status=404)
        
        # Get active orders (not delivered/cancelled)
        active_statuses = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up']
        active_orders = Order.objects.filter(
            customer=customer,
            order_status__in=active_statuses
        ).order_by('-created_at')
        
        # Get recent completed orders (delivered or cancelled in last 30 days)
        from django.utils import timezone
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        recent_orders = Order.objects.filter(
            customer=customer,
            order_status__in=['delivered', 'cancelled'],
            created_at__gte=thirty_days_ago
        ).order_by('-created_at')[:20]  # Limit to 20 most recent
        
        # Serialize active orders
        active_data = []
        for order in active_orders:
            pharmacy_name = 'Unknown Pharmacy'
            pharmacy_id = None
            
            if order.order_lines.exists():
                first_line = order.order_lines.first()
                if first_line and first_line.inventory_item and first_line.inventory_item.pharmacy:
                    pharmacy = first_line.inventory_item.pharmacy
                    pharmacy_name = pharmacy.pharmacy_name
                    pharmacy_id = pharmacy.id
            
            # Get item count
            item_count = order.order_lines.count()
            
            active_data.append({
                'order_id': order.id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'payment_status': order.payment_status,
                'total_amount': float(order.total_amount),
                'pharmacy_name': pharmacy_name,
                'pharmacy_id': pharmacy_id,
                'item_count': item_count,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'is_prescription': bool(order.prescription_image_url),
            })
        
        # Serialize recent orders
        recent_data = []
        for order in recent_orders:
            pharmacy_name = 'Unknown Pharmacy'
            pharmacy_id = None
            
            if order.order_lines.exists():
                first_line = order.order_lines.first()
                if first_line and first_line.inventory_item and first_line.inventory_item.pharmacy:
                    pharmacy = first_line.inventory_item.pharmacy
                    pharmacy_name = pharmacy.pharmacy_name
                    pharmacy_id = pharmacy.id
            
            item_count = order.order_lines.count()
            
            recent_data.append({
                'order_id': order.id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'payment_status': order.payment_status,
                'total_amount': float(order.total_amount),
                'pharmacy_name': pharmacy_name,
                'pharmacy_id': pharmacy_id,
                'item_count': item_count,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'delivered_at': order.actual_delivery.isoformat() if order.actual_delivery else None,
                'is_prescription': bool(order.prescription_image_url),
            })
        
        logger.info(f"✅ Found {len(active_data)} active orders and {len(recent_data)} recent orders for customer {customer_id}")
        
        return JsonResponse({
            'success': True,
            'data': {
                'active_orders': active_data,
                'recent_orders': recent_data,
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching customer orders: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to fetch customer orders',
            'message': str(e)
        }, status=500)

