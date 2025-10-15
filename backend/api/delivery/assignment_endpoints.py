"""
API endpoints for rider delivery assignments
"""

import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from api.delivery.models import RiderAssignment, OrderRiderAssignment
from api.orders.models import Order

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def get_assignment_details(request, assignment_id):
    """
    Get delivery assignment details for the rider app delivery tracking screen.
    
    Returns:
    - Assignment info (batch or single)
    - Pharmacy details (pickup location)
    - Order details (delivery locations)
    - Earnings breakdown
    """
    try:
        # Get the assignment
        assignment = RiderAssignment.objects.select_related('rider').get(
            id=assignment_id
        )
        
        # Get all orders in this assignment
        order_assignments = OrderRiderAssignment.objects.filter(
            assignment=assignment
        ).select_related(
            'order',
            'order__customer',
            'order__delivery_address'
        ).prefetch_related(
            'order__order_lines__inventory_item__pharmacy'
        ).order_by('pickup_sequence')
        
        if not order_assignments.exists():
            return JsonResponse({
                'success': False,
                'error': 'No orders found for this assignment'
            }, status=404)
        
        # Get pharmacy from first order
        first_order = order_assignments.first().order
        pharmacy = None
        if first_order.order_lines.exists():
            first_line = first_order.order_lines.first()
            if first_line.inventory_item:
                pharmacy = first_line.inventory_item.pharmacy
        
        if not pharmacy:
            return JsonResponse({
                'success': False,
                'error': 'No pharmacy found for this assignment'
            }, status=404)
        
        # Build pharmacy data
        pharmacy_data = {
            'id': pharmacy.id,
            'name': pharmacy.pharmacy_name,
            'phone': pharmacy.user.phone_number if pharmacy.user else None,
            'address': f"{pharmacy.street_address}, {pharmacy.barangay}, {pharmacy.city}",
            'latitude': float(pharmacy.latitude) if pharmacy.latitude else None,
            'longitude': float(pharmacy.longitude) if pharmacy.longitude else None,
        }
        
        # Build orders data
        orders_data = []
        for order_assignment in order_assignments:
            order = order_assignment.order
            
            orders_data.append({
                'id': order.id,
                'order_number': order.order_number,
                'customer_name': order.customer.full_name if order.customer else 'Unknown',
                'customer_phone': order.customer.user.phone_number if order.customer and order.customer.user else None,
                'delivery_address': {
                    'street_address': order.delivery_address.street_address if order.delivery_address else '',
                    'barangay': order.delivery_address.barangay if order.delivery_address else '',
                    'city': order.delivery_address.city if order.delivery_address else '',
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address and order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address and order.delivery_address.longitude else None,
                },
                'earnings': float(order.delivery_fee * 0.8) if order.delivery_fee else 0.0,  # 80% commission
                'is_delivered': order.order_status == Order.OrderStatus.DELIVERED,
                'is_picked_up': order_assignment.picked_up_at is not None,
                'pickup_sequence': order_assignment.pickup_sequence,
                'delivery_sequence': order_assignment.delivery_sequence,
            })
        
        # Build response
        response_data = {
            'success': True,
            'assignment': {
                'assignment_id': assignment.assignment_id,
                'is_batch': assignment.assignment_type == RiderAssignment.AssignmentType.BATCH,
                'orders_count': len(orders_data),
                'total_earnings': float(assignment.rider_earnings) if assignment.rider_earnings else 0.0,
                'status': assignment.status,
                'created_at': assignment.created_at.isoformat(),
                'all_picked_up': all(o['is_picked_up'] for o in orders_data),
            },
            'pharmacy': pharmacy_data,
            'orders': orders_data,
        }
        
        logger.info(f"📦 Retrieved assignment details for {assignment.assignment_id}")
        
        return JsonResponse(response_data, status=200)
        
    except RiderAssignment.DoesNotExist:
        logger.error(f"❌ Assignment {assignment_id} not found")
        return JsonResponse({
            'success': False,
            'error': 'Assignment not found'
        }, status=404)
        
    except Exception as e:
        logger.error(f"❌ Error retrieving assignment details: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to retrieve assignment details'
        }, status=500)

