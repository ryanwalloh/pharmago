"""
Rider-specific delivery endpoints for order management.
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from api.orders.models import Order
from api.users.models import User, Rider
from api.users.jwt_views import token_manager

logger = logging.getLogger(__name__)


@csrf_exempt
def get_available_orders(request):
    """
    Get list of available orders for riders to accept.
    Returns orders grouped into batches where possible.
    - Status: ACCEPTED, PREPARING, or READY_FOR_PICKUP
    - Not yet assigned to any rider
    - Batched by proximity for efficient delivery
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        from api.delivery.models import OrderBatchingService
        
        # Get available orders
        available_orders = Order.objects.filter(
            order_status__in=[
                Order.OrderStatus.ACCEPTED,
                Order.OrderStatus.PREPARING,
                Order.OrderStatus.READY_FOR_PICKUP
            ]
        ).select_related(
            'customer__user', 'delivery_address'
        ).prefetch_related(
            'order_lines__inventory_item__medicine', 
            'order_lines__inventory_item__pharmacy'
        ).order_by('-created_at')
        
        # Filter out already assigned orders
        unassigned_orders = [
            order for order in available_orders 
            if not order.is_assigned_to_rider()
        ]
        
        logger.info(f"📦 Found {len(unassigned_orders)} available orders")
        
        # Find batchable orders using Google Maps
        batches = OrderBatchingService.find_batchable_orders(
            unassigned_orders[:50],  # Limit to 50 orders
            max_batch_size=3,
            max_distance_km=2.0,
            use_driving_distance=True  # Use Google Maps
        )
        
        logger.info(f"🔄 Created {len(batches)} batches from {len(unassigned_orders)} orders")
        
        # Serialize batched orders
        batches_data = []
        for batch_index, batch_orders in enumerate(batches):
            # Calculate total earnings for this batch
            total_earnings = sum(
                float(order.delivery_fee) * 0.8 if order.delivery_fee else 0.0 
                for order in batch_orders
            )
            
            # Serialize each order in the batch
            orders_in_batch = []
            for order in batch_orders:
                # Get pharmacy from first order line
                pharmacy = None
                if order.order_lines.exists():
                    first_line = order.order_lines.first()
                    if first_line and first_line.inventory_item:
                        pharmacy = first_line.inventory_item.pharmacy
                
                # Calculate individual order earnings
                delivery_fee = float(order.delivery_fee) if order.delivery_fee else 0.0
                rider_earnings = delivery_fee * 0.8
                
                orders_in_batch.append({
                    'id': order.id,
                    'order_number': order.order_number,
                    'order_status': order.order_status,
                    'total_amount': float(order.total_amount) if order.total_amount else 0.0,
                    'delivery_fee': delivery_fee,
                    'rider_earnings': rider_earnings,
                    'items_count': order.order_lines.count(),
                    'pharmacy': {
                        'id': pharmacy.id if pharmacy else None,
                        'name': pharmacy.pharmacy_name if pharmacy else 'Unknown Pharmacy',
                        'address': pharmacy.full_address if pharmacy else '',
                        'street_address': pharmacy.street_address if pharmacy else '',
                        'barangay': pharmacy.barangay if pharmacy else '',
                        'city': pharmacy.city if pharmacy else '',
                    } if pharmacy else None,
                    'delivery_address': {
                        'full_address': order.delivery_address.full_address if order.delivery_address else '',
                        'street_address': order.delivery_address.street_address if order.delivery_address else '',
                        'barangay': order.delivery_address.barangay if order.delivery_address else '',
                        'city': order.delivery_address.city if order.delivery_address else '',
                    },
                    'customer_name': f"{order.customer.first_name} {order.customer.last_name}" if order.customer else 'Unknown Customer',
                    'created_at': order.created_at.isoformat(),
                })
            
            # Add batch information
            batches_data.append({
                'batch_id': f"BATCH_{batch_index + 1}",
                'is_batch': len(batch_orders) > 1,
                'orders_count': len(batch_orders),
                'total_earnings': total_earnings,
                'orders': orders_in_batch,
                'created_at': batch_orders[0].created_at.isoformat() if batch_orders else None,
            })
        
        return JsonResponse({
            'success': True,
            'batches_count': len(batches_data),
            'total_orders': len(unassigned_orders),
            'batches': batches_data
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error fetching available orders: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False, 
            'error': 'Failed to fetch orders'
        }, status=500)

