"""
Rider-specific delivery endpoints for order management.
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
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


# ========== DISPATCH SYSTEM ENDPOINTS ==========

@csrf_exempt
def accept_dispatch_offer(request):
    """
    Rider accepts a dispatch offer.
    
    POST /api/rider/accept-offer/
    Body: {
        "offer_id": "OFFER_DQ_ORD123_1",
        "rider_id": 123
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        from api.delivery.dispatch_service import DispatchService
        
        data = json.loads(request.body)
        offer_id = data.get('offer_id')
        rider_id = data.get('rider_id')
        
        if not offer_id or not rider_id:
            return JsonResponse({
                'success': False,
                'error': 'Missing offer_id or rider_id'
            }, status=400)
        
        # Verify rider exists and owns this offer
        try:
            from api.delivery.models import DispatchOffer
            offer = DispatchOffer.objects.get(offer_id=offer_id, rider_id=rider_id)
        except DispatchOffer.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Offer not found or does not belong to this rider'
            }, status=404)
        
        # Process acceptance
        result = DispatchService.handle_rider_response(offer_id, accepted=True)
        
        if result['success']:
            logger.info(f"✅ Rider {rider_id} accepted offer {offer_id}")
            
            # ✅ NEW: Broadcast order count update when rider accepts offer
            try:
                from api.delivery.websocket_service import broadcast_rider_order_count_update
                broadcast_rider_order_count_update()
                logger.info(f"📡 Broadcasted order count update to riders (offer {offer_id} accepted)")
            except Exception as e:
                logger.warning(f"Failed to broadcast order count update: {str(e)}")
            
            return JsonResponse({
                'success': True,
                'message': 'Offer accepted successfully',
                'assignment_id': result.get('assignment_id')
            }, status=200)
        else:
            return JsonResponse({
                'success': False,
                'error': result.get('message', 'Failed to accept offer')
            }, status=400)
        
    except Exception as e:
        logger.error(f"❌ Error accepting offer: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)


@csrf_exempt
def reject_dispatch_offer(request):
    """
    Rider rejects a dispatch offer.
    
    POST /api/rider/reject-offer/
    Body: {
        "offer_id": "OFFER_DQ_ORD123_1",
        "rider_id": 123,
        "reason": "too_far" (optional)
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        from api.delivery.dispatch_service import DispatchService
        
        data = json.loads(request.body)
        offer_id = data.get('offer_id')
        rider_id = data.get('rider_id')
        reason = data.get('reason')
        
        if not offer_id or not rider_id:
            return JsonResponse({
                'success': False,
                'error': 'Missing offer_id or rider_id'
            }, status=400)
        
        # Verify rider exists and owns this offer
        try:
            from api.delivery.models import DispatchOffer
            offer = DispatchOffer.objects.get(offer_id=offer_id, rider_id=rider_id)
        except DispatchOffer.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Offer not found or does not belong to this rider'
            }, status=404)
        
        # Process rejection
        result = DispatchService.handle_rider_response(
            offer_id, 
            accepted=False, 
            rejection_reason=reason
        )
        
        logger.info(f"❌ Rider {rider_id} rejected offer {offer_id} (reason: {reason or 'not specified'})")
        
        return JsonResponse({
            'success': True,
            'message': result.get('message', 'Offer rejected, trying next rider')
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error rejecting offer: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)


@csrf_exempt
def update_rider_status(request):
    """
    Update rider's activity status (online/offline/busy/break).
    
    POST /api/rider/update-status/
    Body: {
        "rider_id": 123,
        "status": "online" | "offline" | "busy" | "break"
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        
        data = json.loads(request.body)
        rider_id = data.get('rider_id')
        status = data.get('status')
        
        if not rider_id or not status:
            return JsonResponse({
                'success': False,
                'error': 'Missing rider_id or status'
            }, status=400)
        
        # Validate status
        valid_statuses = ['online', 'offline', 'busy', 'break']
        if status not in valid_statuses:
            return JsonResponse({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }, status=400)
        
        # Get rider
        try:
            rider = Rider.objects.get(id=rider_id)
        except Rider.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Rider not found'
            }, status=404)
        
        # Update status
        old_status = rider.activity_status
        rider.activity_status = status
        rider.save()
        
        logger.info(f"🔄 Rider {rider.full_name} status: {old_status} → {status}")
        
        return JsonResponse({
            'success': True,
            'message': f'Status updated to {status}',
            'rider': {
                'id': rider.id,
                'name': rider.full_name,
                'activity_status': rider.activity_status,
                'last_seen_at': rider.last_seen_at.isoformat() if rider.last_seen_at else None
            }
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error updating rider status: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)


@csrf_exempt
def update_rider_location(request):
    """
    Update rider's current location.
    Called periodically (every 30s) when rider is online.
    
    POST /api/rider/update-location/
    Body: {
        "rider_id": 123,
        "latitude": 8.2280,
        "longitude": 124.2452
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        
        data = json.loads(request.body)
        rider_id = data.get('rider_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not rider_id or latitude is None or longitude is None:
            return JsonResponse({
                'success': False,
                'error': 'Missing rider_id, latitude, or longitude'
            }, status=400)
        
        # Validate coordinates
        try:
            lat = float(latitude)
            lng = float(longitude)
            
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid coordinates'
                }, status=400)
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid coordinate format'
            }, status=400)
        
        # Get rider
        try:
            rider = Rider.objects.get(id=rider_id)
        except Rider.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Rider not found'
            }, status=404)
        
        # Update location
        rider.update_location(lat, lng)
        
        logger.debug(f"📍 Updated location for {rider.full_name}: ({lat:.6f}, {lng:.6f})")
        
        # Broadcast location to customers tracking orders assigned to this rider
        try:
            from api.delivery.models import OrderRiderAssignment
            from api.delivery.websocket_service import broadcast_rider_location
            
            # Get all active assignments for this rider
            active_assignments = OrderRiderAssignment.objects.filter(
                assignment__rider=rider,
                assignment__status__in=['picked_up', 'delivering'],
                delivered_at__isnull=True
            ).select_related('order')
            
            # Broadcast location to each order's tracking channel
            for order_assignment in active_assignments:
                broadcast_rider_location(
                    order_id=order_assignment.order.id,
                    latitude=lat,
                    longitude=lng,
                    heading=data.get('heading'),
                    speed=data.get('speed')
                )
            
            if active_assignments.exists():
                logger.debug(f"📡 Broadcasted rider location to {active_assignments.count()} order(s)")
                
        except Exception as e:
            logger.warning(f"Failed to broadcast rider location: {str(e)}")
        
        return JsonResponse({
            'success': True,
            'message': 'Location updated',
            'rider': {
                'id': rider.id,
                'latitude': float(rider.current_latitude),
                'longitude': float(rider.current_longitude),
                'last_seen_at': rider.last_seen_at.isoformat()
            }
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error updating rider location: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)


@csrf_exempt
def get_current_dispatch_offer(request):
    """
    Get rider's current active dispatch offer (if any).
    
    GET /api/rider/current-offer/?rider_id=123
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        from api.delivery.dispatch_service import DispatchService
        
        rider_id = request.GET.get('rider_id')
        
        if not rider_id:
            return JsonResponse({
                'success': False,
                'error': 'Missing rider_id parameter'
            }, status=400)
        
        # Get rider
        try:
            rider = Rider.objects.get(id=rider_id)
        except Rider.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Rider not found'
            }, status=404)
        
        # Get current offer
        offer = DispatchService.get_rider_current_offer(rider)
        
        if not offer:
            return JsonResponse({
                'success': True,
                'has_offer': False,
                'offer': None
            }, status=200)
        
        # Serialize offer data
        offer_data = {
            'offer_id': offer.offer_id,
            'is_batch': offer.is_batch,
            'orders_count': offer.orders_count,
            'total_earnings': float(offer.total_earnings),
            'pickup_distance_km': float(offer.pickup_distance_km) if offer.pickup_distance_km else None,
            'expires_at': offer.expires_at.isoformat(),
            'timeout_seconds': int((offer.expires_at - timezone.now()).total_seconds()),
            'attempt_number': offer.attempt_number,
        }
        
        # Add order details
        if offer.is_batch and offer.batch_assignment:
            # Get all orders in batch
            orders_in_batch = []
            for order_assignment in offer.batch_assignment.order_assignments.all():
                order = order_assignment.order
                
                # Get pharmacy
                pharmacy = None
                if order.order_lines.exists():
                    first_line = order.order_lines.first()
                    if first_line and first_line.inventory_item:
                        pharmacy = first_line.inventory_item.pharmacy
                
                orders_in_batch.append({
                    'order_number': order.order_number,
                    'customer_name': f"{order.customer.first_name} {order.customer.last_name}" if order.customer else 'Unknown',
                    'pharmacy_name': pharmacy.pharmacy_name if pharmacy else 'Unknown Pharmacy',
                    'pharmacy_address': f"{pharmacy.barangay}, {pharmacy.city}" if pharmacy else '',
                    'delivery_address': f"{order.delivery_address.barangay}, {order.delivery_address.city}" if order.delivery_address else '',
                    'earnings': float(order.delivery_fee) * 0.8,
                })
            
            offer_data['orders'] = orders_in_batch
            
        elif offer.order:
            # Single order
            order = offer.order
            
            # Get pharmacy
            pharmacy = None
            if order.order_lines.exists():
                first_line = order.order_lines.first()
                if first_line and first_line.inventory_item:
                    pharmacy = first_line.inventory_item.pharmacy
            
            offer_data['order'] = {
                'order_number': order.order_number,
                'customer_name': f"{order.customer.first_name} {order.customer.last_name}" if order.customer else 'Unknown',
                'pharmacy_name': pharmacy.pharmacy_name if pharmacy else 'Unknown Pharmacy',
                'pharmacy_address': f"{pharmacy.barangay}, {pharmacy.city}" if pharmacy else '',
                'delivery_address': f"{order.delivery_address.barangay}, {order.delivery_address.city}" if order.delivery_address else '',
                'delivery_fee': float(order.delivery_fee),
                'earnings': float(order.delivery_fee) * 0.8,
            }
        
        return JsonResponse({
            'success': True,
            'has_offer': True,
            'offer': offer_data
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error getting current offer: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)


# ========== MANUAL ORDER ACCEPTANCE ==========

@csrf_exempt
def manual_accept_orders(request):
    """
    Rider manually accepts orders from available orders list.
    This is SEPARATE from dispatch offers - rider browses list and chooses orders.
    
    POST /api/rider/manual-accept-orders/
    Body: {
        "rider_id": 123,
        "order_ids": [45, 46, 47]  # Array of order IDs to accept
    }
    
    Returns: {
        "success": True,
        "assignment_id": "ASG_20241108_001",
        "orders_count": 3,
        "total_earnings": 250.00
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        from api.delivery.models import RiderAssignment, OrderRiderAssignment
        from django.db import transaction
        
        data = json.loads(request.body)
        rider_id = data.get('rider_id')
        order_ids = data.get('order_ids', [])
        
        # Validation
        if not rider_id:
            return JsonResponse({
                'success': False,
                'error': 'Missing rider_id'
            }, status=400)
        
        if not order_ids or not isinstance(order_ids, list):
            return JsonResponse({
                'success': False,
                'error': 'Missing or invalid order_ids (must be array)'
            }, status=400)
        
        # Get rider
        try:
            rider = Rider.objects.get(id=rider_id)
        except Rider.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Rider not found'
            }, status=404)
        
        # Verify rider is active
        if rider.status != Rider.RiderStatus.APPROVED:
            return JsonResponse({
                'success': False,
                'error': 'Rider is not approved'
            }, status=403)
        
        # Get orders
        orders = Order.objects.filter(id__in=order_ids).select_related('delivery_address')
        
        if orders.count() != len(order_ids):
            return JsonResponse({
                'success': False,
                'error': 'Some orders not found'
            }, status=404)
        
        # Verify all orders are available (not assigned)
        for order in orders:
            if order.is_assigned_to_rider():
                return JsonResponse({
                    'success': False,
                    'error': f'Order {order.order_number} is already assigned to another rider'
                }, status=400)
            
            if order.order_status not in [
                Order.OrderStatus.ACCEPTED,
                Order.OrderStatus.PREPARING,
                Order.OrderStatus.READY_FOR_PICKUP
            ]:
                return JsonResponse({
                    'success': False,
                    'error': f'Order {order.order_number} is not available for pickup (status: {order.order_status})'
                }, status=400)
        
        # Create assignment
        with transaction.atomic():
            from decimal import Decimal
            
            is_batch = len(orders) > 1
            total_delivery_fee = sum(order.delivery_fee or Decimal('0') for order in orders)
            rider_earnings = total_delivery_fee * Decimal('0.8')  # 80% to rider
            
            # Generate assignment ID
            assignment_id = f"MAN_{timezone.now().strftime('%Y%m%d_%H%M%S')}_{rider_id}"
            
            # Create RiderAssignment
            assignment = RiderAssignment.objects.create(
                assignment_id=assignment_id,
                rider=rider,
                assignment_type=RiderAssignment.AssignmentType.BATCH if is_batch else RiderAssignment.AssignmentType.SINGLE,
                batch_size=len(orders),
                total_delivery_fee=total_delivery_fee,
                rider_earnings=rider_earnings,
                estimated_completion=timezone.now() + timezone.timedelta(hours=2),
                status='assigned'
            )
            
            # Create OrderRiderAssignment for each order and update order status
            for index, order in enumerate(orders, start=1):
                OrderRiderAssignment.objects.create(
                    order=order,
                    assignment=assignment,
                    pickup_sequence=index,
                    delivery_sequence=index
                )
                
                # ✅ Update order status to PICKED_UP (rider has accepted and will deliver)
                order.order_status = Order.OrderStatus.PICKED_UP
                order.save(update_fields=['order_status'])
                
                logger.info(f"📦 Order {order.order_number} status updated: READY_FOR_PICKUP → PICKED_UP")
            
            logger.info(f"✅ Rider {rider_id} manually accepted {len(orders)} order(s) - Assignment: {assignment_id}")
            
            # Broadcast order count update via WebSocket
            try:
                from api.delivery.websocket_service import broadcast_rider_order_count_update
                broadcast_rider_order_count_update()
                logger.info(f"📡 Broadcasted order count update (manual acceptance)")
            except Exception as e:
                logger.warning(f"Failed to broadcast order count update: {str(e)}")
            
            return JsonResponse({
                'success': True,
                'assignment_id': assignment.id,
                'assignment_number': assignment_id,
                'orders_count': len(orders),
                'total_earnings': float(rider_earnings),
                'is_batch': is_batch
            }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Error in manual order acceptance: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Internal server error'
        }, status=500)

