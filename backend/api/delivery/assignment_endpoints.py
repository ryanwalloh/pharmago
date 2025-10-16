"""
API endpoints for rider delivery assignments
"""

import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
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
        # Get the assignment - try both id (database primary key) and assignment_id (string field)
        try:
            # First try as database ID (integer)
            assignment = RiderAssignment.objects.select_related('rider').get(id=assignment_id)
        except (RiderAssignment.DoesNotExist, ValueError):
            try:
                # If that fails, try as assignment_id string field
                assignment = RiderAssignment.objects.select_related('rider').get(assignment_id=assignment_id)
            except RiderAssignment.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Assignment not found'
                }, status=404)
        
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
                'earnings': float(order.delivery_fee) * 0.8 if order.delivery_fee else 0.0,  # 80% commission (convert Decimal to float first)
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


@csrf_exempt
@require_http_methods(["POST"])
def mark_orders_picked_up(request, assignment_id):
    """
    Mark all orders in an assignment as picked up from pharmacy.
    
    Updates:
    - Order status to PICKED_UP
    - OrderRiderAssignment.picked_up_at timestamp
    - RiderAssignment.status to DELIVERING
    
    Returns success/error response
    """
    try:
        # Get the assignment
        try:
            assignment = RiderAssignment.objects.select_related('rider').get(id=assignment_id)
        except (RiderAssignment.DoesNotExist, ValueError):
            try:
                assignment = RiderAssignment.objects.select_related('rider').get(assignment_id=assignment_id)
            except RiderAssignment.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Assignment not found'
                }, status=404)
        
        # Get all order assignments
        order_assignments = OrderRiderAssignment.objects.filter(
            assignment=assignment
        ).select_related('order')
        
        if not order_assignments.exists():
            return JsonResponse({
                'success': False,
                'error': 'No orders found for this assignment'
            }, status=404)
        
        # Update all orders and assignments atomically
        with transaction.atomic():
            now = timezone.now()
            updated_count = 0
            
            for order_assignment in order_assignments:
                order = order_assignment.order
                
                # Skip if already picked up
                if order_assignment.picked_up_at:
                    logger.info(f"⏭️ Order {order.order_number} already marked as picked up")
                    continue
                
                # Update order status to PICKED_UP
                if order.order_status in [Order.OrderStatus.ACCEPTED, Order.OrderStatus.PREPARING, Order.OrderStatus.READY_FOR_PICKUP]:
                    order.order_status = Order.OrderStatus.PICKED_UP
                    order.save(update_fields=['order_status'])
                    logger.info(f"📦 Order {order.order_number} status updated to PICKED_UP")
                
                # Update OrderRiderAssignment picked_up_at timestamp
                order_assignment.picked_up_at = now
                order_assignment.save(update_fields=['picked_up_at'])
                
                updated_count += 1
            
            # Update assignment status to DELIVERING if all picked up
            if updated_count > 0:
                assignment.status = RiderAssignment.AssignmentStatus.DELIVERING
                assignment.save(update_fields=['status'])
                logger.info(f"🚚 Assignment {assignment.assignment_id} status updated to DELIVERING")
        
        logger.info(f"✅ Marked {updated_count} order(s) as picked up for assignment {assignment.assignment_id}")
        
        return JsonResponse({
            'success': True,
            'message': f'{updated_count} order(s) marked as picked up',
            'updated_count': updated_count,
            'assignment_status': assignment.status,
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error marking orders as picked up: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to mark orders as picked up'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def mark_order_delivered(request, assignment_id, order_id):
    """
    Mark a specific order as delivered with proof of delivery photo.
    
    Expects JSON body:
    {
        "proof_of_delivery_url": "https://cloudinary.com/..."
    }
    
    Updates:
    - Order status to DELIVERED
    - OrderRiderAssignment.delivered_at timestamp
    - OrderRiderAssignment.proof_of_delivery_url
    - RiderAssignment.status to COMPLETED (if all orders delivered)
    
    Returns earnings for this order and total earnings
    """
    try:
        import json
        
        # Parse request body
        try:
            data = json.loads(request.body)
            proof_url = data.get('proof_of_delivery_url')
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON in request body'
            }, status=400)
        
        if not proof_url:
            return JsonResponse({
                'success': False,
                'error': 'proof_of_delivery_url is required'
            }, status=400)
        
        # Get the assignment
        try:
            assignment = RiderAssignment.objects.select_related('rider').get(id=assignment_id)
        except (RiderAssignment.DoesNotExist, ValueError):
            try:
                assignment = RiderAssignment.objects.select_related('rider').get(assignment_id=assignment_id)
            except RiderAssignment.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Assignment not found'
                }, status=404)
        
        # Get the specific order assignment
        try:
            order_assignment = OrderRiderAssignment.objects.select_related('order').get(
                assignment=assignment,
                order_id=order_id
            )
        except OrderRiderAssignment.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Order not found in this assignment'
            }, status=404)
        
        order = order_assignment.order
        
        # Check if already delivered
        if order_assignment.delivered_at:
            return JsonResponse({
                'success': False,
                'error': 'Order already marked as delivered'
            }, status=400)
        
        # Update order and assignment atomically
        with transaction.atomic():
            now = timezone.now()
            
            # Update order status to DELIVERED
            order.order_status = Order.OrderStatus.DELIVERED
            order.save(update_fields=['order_status'])
            logger.info(f"📦 Order {order.order_number} status updated to DELIVERED")
            
            # Update OrderRiderAssignment
            order_assignment.delivered_at = now
            order_assignment.proof_of_delivery_url = proof_url
            order_assignment.save(update_fields=['delivered_at', 'proof_of_delivery_url'])
            logger.info(f"✅ Order {order.order_number} marked as delivered with proof")
            
            # Calculate earnings for this order (80% of delivery fee)
            from decimal import Decimal
            order_earnings = float(order.delivery_fee) * 0.8 if order.delivery_fee else 0.0
            
            # Check if all orders in assignment are delivered
            all_order_assignments = OrderRiderAssignment.objects.filter(assignment=assignment)
            all_delivered = all(oa.delivered_at is not None for oa in all_order_assignments)
            
            if all_delivered:
                assignment.status = RiderAssignment.AssignmentStatus.COMPLETED
                assignment.save(update_fields=['status'])
                logger.info(f"🎉 Assignment {assignment.assignment_id} completed - all orders delivered")
        
        # Get total earnings
        total_earnings = float(assignment.rider_earnings) if assignment.rider_earnings else 0.0
        
        logger.info(f"✅ Order {order.order_number} delivered successfully. Earnings: ₱{order_earnings:.2f}")
        
        return JsonResponse({
            'success': True,
            'message': 'Order marked as delivered',
            'order_earnings': order_earnings,
            'total_earnings': total_earnings,
            'all_delivered': all_delivered,
            'assignment_status': assignment.status,
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error marking order as delivered: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to mark order as delivered'
        }, status=500)

