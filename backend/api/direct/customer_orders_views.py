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
async def get_customer_orders(request, customer_id):
    """
    Get all orders for a customer, divided into active and recent.
    """
    try:
        from channels.db import database_sync_to_async
        from django.utils import timezone
        from datetime import timedelta

        @database_sync_to_async
        def fetch_customer_orders():
            try:
                customer = Customer.objects.get(id=customer_id)
                logger.info(f"📋 Fetching orders for customer {customer.full_name} (ID: {customer_id})")
            except Customer.DoesNotExist:
                return None

            active_statuses = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up']
            active_orders = Order.objects.filter(
                customer=customer,
                order_status__in=active_statuses
            ).order_by('-created_at')

            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_orders = Order.objects.filter(
                customer=customer,
                order_status__in=['delivered', 'cancelled'],
                created_at__gte=thirty_days_ago
            ).order_by('-created_at')[:20]

            def serialize_orders(orders):
                serialized = []
                for order in orders:
                    pharmacy_name = 'Unknown Pharmacy'
                    pharmacy_id = None

                    if order.order_lines.exists():
                        first_line = order.order_lines.first()
                        if first_line and first_line.inventory_item and first_line.inventory_item.pharmacy:
                            pharmacy = first_line.inventory_item.pharmacy
                            pharmacy_name = pharmacy.pharmacy_name
                            pharmacy_id = pharmacy.id

                    serialized.append({
                        'order_id': order.id,
                        'order_number': order.order_number,
                        'order_status': order.order_status,
                        'payment_status': order.payment_status,
                        'total_amount': float(order.total_amount),
                        'pharmacy_name': pharmacy_name,
                        'pharmacy_id': pharmacy_id,
                        'item_count': order.order_lines.count(),
                        'created_at': order.created_at.isoformat(),
                        'updated_at': order.updated_at.isoformat(),
                        'delivered_at': order.actual_delivery.isoformat() if order.actual_delivery else None,
                        'is_prescription': bool(order.prescription_image_url),
                    })
                return serialized

            return {
                'active_orders': serialize_orders(active_orders),
                'recent_orders': serialize_orders(recent_orders),
            }

        result = await fetch_customer_orders()
        if result is None:
            return JsonResponse({
                'success': False,
                'error': f'Customer not found with ID {customer_id}'
            }, status=404)

        logger.info(
            f"✅ Found {len(result['active_orders'])} active orders and {len(result['recent_orders'])} recent orders for customer {customer_id}"
        )

        return JsonResponse({
            'success': True,
            'data': result
        })

    except Exception as e:
        logger.error(f"❌ Error fetching customer orders: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to fetch customer orders',
            'message': str(e)
        }, status=500)

