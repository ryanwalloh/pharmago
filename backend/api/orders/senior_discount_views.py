"""
Senior Citizen Discount API Views
Handles pharmacy review and approval of senior citizen discounts
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
import json
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
def pharmacy_review_senior_discount(request, order_id):
    """
    Pharmacy approves or rejects senior citizen discount
    
    POST /api/orders/pharmacy-review-senior-discount/<order_id>/
    
    Expected JSON:
    {
        pharmacy_user_id: int,
        action: 'approve' | 'reject',
        notes: str (optional)
    }
    
    Returns:
    {
        success: bool,
        message: str,
        discount_amount: float,
        new_total: float
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        from api.orders.models import Order
        from api.users.models import User
        
        data = json.loads(request.body)
        action = data.get('action', '').lower()
        pharmacy_user_id = data.get('pharmacy_user_id')
        notes = data.get('notes', '')
        
        # Validate action
        if action not in ['approve', 'reject']:
            return JsonResponse({
                'success': False,
                'error': 'Invalid action. Use "approve" or "reject"'
            }, status=400)
        
        # Get order
        try:
            order = Order.objects.select_related('customer').get(id=order_id)
        except Order.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'Order with ID {order_id} not found'
            }, status=404)
        
        # Verify order has senior discount requested
        if not order.senior_discount_requested:
            return JsonResponse({
                'success': False,
                'error': 'This order does not have a senior discount request'
            }, status=400)
        
        # Verify order status is not already finalized
        if order.senior_discount_status in ['approved', 'rejected']:
            return JsonResponse({
                'success': False,
                'error': f'Senior discount already {order.senior_discount_status}'
            }, status=400)
        
        # Get pharmacy user
        try:
            pharmacy_user = User.objects.get(id=pharmacy_user_id)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Pharmacy user not found'
            }, status=404)
        
        # Verify user is a pharmacy
        if not hasattr(pharmacy_user, 'pharmacy'):
            return JsonResponse({
                'success': False,
                'error': 'User is not a pharmacy'
            }, status=403)
        
        # Process review with transaction
        with transaction.atomic():
            if action == 'approve':
                # Calculate 20% discount on subtotal
                subtotal = order.subtotal or Decimal('0.00')
                discount = subtotal * Decimal('0.20')
                
                # Update order
                order.senior_discount_status = 'approved'
                order.discount_amount = discount
                order.senior_discount_reviewed_by = pharmacy_user
                order.senior_discount_review_date = timezone.now()
                order.senior_discount_notes = notes
                
                # Recalculate total
                order.calculate_totals()
                order.save()
                
                logger.info(f"✅ Senior discount approved for Order #{order.order_number} by {pharmacy_user.username}")
                
                return JsonResponse({
                    'success': True,
                    'message': 'Senior discount approved successfully',
                    'action': 'approved',
                    'discount_amount': float(discount),
                    'new_total': float(order.total_amount),
                    'order_id': order.id,
                    'order_number': order.order_number
                })
                
            elif action == 'reject':
                # Update order
                order.senior_discount_status = 'rejected'
                order.discount_amount = Decimal('0.00')
                order.senior_discount_reviewed_by = pharmacy_user
                order.senior_discount_review_date = timezone.now()
                order.senior_discount_notes = notes
                
                # Recalculate total (no discount)
                order.calculate_totals()
                order.save()
                
                logger.info(f"❌ Senior discount rejected for Order #{order.order_number} by {pharmacy_user.username}")
                
                return JsonResponse({
                    'success': True,
                    'message': 'Senior discount rejected',
                    'action': 'rejected',
                    'discount_amount': 0,
                    'new_total': float(order.total_amount),
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'reason': notes
                })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        logger.error(f"❌ Error reviewing senior discount: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)


@csrf_exempt
def get_order_senior_discount_details(request, order_id):
    """
    Get senior discount details for an order
    
    GET /api/orders/senior-discount-details/<order_id>/
    
    Returns:
    {
        success: bool,
        order_id: int,
        order_number: str,
        senior_discount_requested: bool,
        senior_citizen_id_image: str,
        senior_discount_status: str,
        potential_discount: float,
        discount_amount: float,
        reviewed_by: str,
        reviewed_by_name: str,
        review_date: str,
        notes: str
    }
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        from api.orders.models import Order
        
        try:
            order = Order.objects.select_related(
                'senior_discount_reviewed_by'
            ).get(id=order_id)
        except Order.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': f'Order with ID {order_id} not found'
            }, status=404)
        
        # Calculate potential discount (20% of subtotal)
        subtotal = order.subtotal or Decimal('0.00')
        potential_discount = subtotal * Decimal('0.20')
        
        # Build response
        response_data = {
            'success': True,
            'order_id': order.id,
            'order_number': order.order_number,
            'senior_discount_requested': order.senior_discount_requested,
            'senior_citizen_id_image': order.senior_citizen_id_image or '',
            'senior_discount_status': order.senior_discount_status,
            'potential_discount': float(potential_discount),
            'discount_amount': float(order.discount_amount),
            'subtotal': float(subtotal),
            'total_amount': float(order.total_amount),
            'reviewed_by': None,
            'reviewed_by_name': None,
            'review_date': None,
            'notes': order.senior_discount_notes or ''
        }
        
        # Add reviewer info if available
        if order.senior_discount_reviewed_by:
            response_data['reviewed_by'] = order.senior_discount_reviewed_by.id
            response_data['reviewed_by_name'] = order.senior_discount_reviewed_by.username
        
        # Add review date if available
        if order.senior_discount_review_date:
            response_data['review_date'] = order.senior_discount_review_date.isoformat()
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"❌ Error fetching senior discount details: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)

