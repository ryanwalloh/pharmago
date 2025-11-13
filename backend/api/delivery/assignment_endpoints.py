"""
API endpoints for rider delivery assignments
"""

import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction, models
from channels.db import database_sync_to_async
from api.delivery.models import RiderAssignment, OrderRiderAssignment
from api.orders.models import Order

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
async def get_assignment_details(request, assignment_id):
    """
    Get delivery assignment details for the rider app delivery tracking screen.
    
    Returns:
    - Assignment info (batch or single)
    - Pharmacy details (pickup location)
    - Order details (delivery locations)
    - Earnings breakdown
    """
    try:
        @database_sync_to_async
        def fetch_assignment_data():
            try:
                try:
                    assignment_obj = RiderAssignment.objects.select_related('rider').get(id=assignment_id)
                except (RiderAssignment.DoesNotExist, ValueError):
                    assignment_obj = RiderAssignment.objects.select_related('rider').get(assignment_id=assignment_id)

                order_assignments_qs = OrderRiderAssignment.objects.filter(
                    assignment=assignment_obj
                ).select_related(
                    'order',
                    'order__customer',
                    'order__customer__user',
                    'order__delivery_address'
                ).prefetch_related(
                    'order__order_lines__inventory_item__pharmacy'
                ).order_by('pickup_sequence')

                if not order_assignments_qs.exists():
                    return 404, {
                        'success': False,
                        'error': 'No orders found for this assignment'
                    }

                first_order = order_assignments_qs.first().order
                pharmacy_obj = None
                if first_order.order_lines.exists():
                    first_line = first_order.order_lines.first()
                    if first_line and first_line.inventory_item:
                        pharmacy_obj = first_line.inventory_item.pharmacy

                if not pharmacy_obj:
                    return 404, {
                        'success': False,
                        'error': 'No pharmacy found for this assignment'
                    }

                pharmacy_data = {
                    'id': pharmacy_obj.id,
                    'name': pharmacy_obj.pharmacy_name,
                    'phone': getattr(getattr(pharmacy_obj, 'user', None), 'phone_number', None),
                    'address': f"{pharmacy_obj.street_address}, {pharmacy_obj.barangay}, {pharmacy_obj.city}",
                    'latitude': float(pharmacy_obj.latitude) if pharmacy_obj.latitude else None,
                    'longitude': float(pharmacy_obj.longitude) if pharmacy_obj.longitude else None,
                }

                orders_data = []
                for oa in order_assignments_qs:
                    order = oa.order
                    customer = getattr(order, 'customer', None)
                    customer_user = getattr(customer, 'user', None)
                    delivery_address = getattr(order, 'delivery_address', None)

                    orders_data.append({
                        'id': order.id,
                        'order_number': order.order_number,
                        'customer_name': getattr(customer, 'full_name', 'Unknown'),
                        'customer_phone': getattr(customer_user, 'phone_number', None),
                        'delivery_address': {
                            'street_address': getattr(delivery_address, 'street_address', ''),
                            'barangay': getattr(delivery_address, 'barangay', ''),
                            'city': getattr(delivery_address, 'city', ''),
                            'latitude': float(delivery_address.latitude) if delivery_address and delivery_address.latitude else None,
                            'longitude': float(delivery_address.longitude) if delivery_address and delivery_address.longitude else None,
                        },
                        'earnings': float(order.delivery_fee) * 0.8 if order.delivery_fee else 0.0,
                        'is_delivered': order.order_status == Order.OrderStatus.DELIVERED,
                        'is_picked_up': oa.picked_up_at is not None,
                        'pickup_sequence': oa.pickup_sequence,
                        'delivery_sequence': oa.delivery_sequence,
                    })

                response_payload = {
                    'success': True,
                    'assignment': {
                        'assignment_id': assignment_obj.assignment_id,
                        'is_batch': assignment_obj.assignment_type == RiderAssignment.AssignmentType.BATCH,
                        'orders_count': len(orders_data),
                        'total_earnings': float(assignment_obj.rider_earnings) if assignment_obj.rider_earnings else 0.0,
                        'status': assignment_obj.status,
                        'created_at': assignment_obj.created_at.isoformat(),
                        'all_picked_up': all(o['is_picked_up'] for o in orders_data),
                    },
                    'pharmacy': pharmacy_data,
                    'orders': orders_data,
                }

                logger.info(f"📦 Retrieved assignment details for {assignment_obj.assignment_id}")
                return 200, response_payload

            except RiderAssignment.DoesNotExist:
                logger.error(f"❌ Assignment {assignment_id} not found")
                return 404, {
                    'success': False,
                    'error': 'Assignment not found'
                }
            except Exception as exc:
                logger.error(f"❌ Error retrieving assignment details: {str(exc)}", exc_info=True)
                return 500, {
                    'success': False,
                    'error': 'Failed to retrieve assignment details'
                }

        status_code, payload = await fetch_assignment_data()
        return JsonResponse(payload, status=status_code)

    except Exception as e:
        logger.error(f"❌ Unexpected error retrieving assignment details: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to retrieve assignment details'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
async def get_rider_assignment_history(request):
    """
    Return completed assignments for a rider with per-order delivery details.
    Supports basic pagination via limit/offset query params.
    """
    rider_id = request.GET.get('rider_id')
    limit_param = request.GET.get('limit')
    offset_param = request.GET.get('offset')

    if not rider_id:
        return JsonResponse(
            {
                'success': False,
                'error': 'rider_id query parameter is required',
            },
            status=400,
        )

    try:
        rider_id_int = int(rider_id)
    except (TypeError, ValueError):
        return JsonResponse(
            {
                'success': False,
                'error': 'rider_id must be an integer',
            },
            status=400,
        )

    try:
        limit = max(1, min(int(limit_param), 100)) if limit_param is not None else 20
    except (TypeError, ValueError):
        limit = 20

    try:
        offset = max(0, int(offset_param)) if offset_param is not None else 0
    except (TypeError, ValueError):
        offset = 0

    @database_sync_to_async
    def fetch_history():
        try:
            assignments_qs = (
                RiderAssignment.objects.filter(
                    rider_id=rider_id_int,
                    status=RiderAssignment.AssignmentStatus.COMPLETED,
                )
                .select_related('rider')
                .prefetch_related(
                    models.Prefetch(
                        'order_assignments',
                        queryset=OrderRiderAssignment.objects.select_related(
                            'order',
                            'order__customer',
                            'order__customer__user',
                            'order__delivery_address',
                        ).order_by('delivery_sequence'),
                    )
                )
                .order_by('-completed_at', '-updated_at', '-created_at')
            )

            total_count = assignments_qs.count()
            assignments = assignments_qs[offset: offset + limit]

            history_entries = []
            for assignment in assignments:
                order_payload = []
                for order_assignment in assignment.order_assignments.all():
                    order_obj = order_assignment.order
                    delivery_addr = getattr(order_obj, 'delivery_address', None)
                    order_payload.append(
                        {
                            'order_id': order_obj.id,
                            'order_number': order_obj.order_number,
                            'order_status': order_obj.order_status,
                            'delivery_fee': float(order_obj.delivery_fee)
                            if order_obj.delivery_fee
                            else 0.0,
                            'picked_up_at': order_assignment.picked_up_at.isoformat()
                            if order_assignment.picked_up_at
                            else None,
                            'delivered_at': order_assignment.delivered_at.isoformat()
                            if order_assignment.delivered_at
                            else None,
                            'pickup_sequence': order_assignment.pickup_sequence,
                            'delivery_sequence': order_assignment.delivery_sequence,
                            'delivery_address': {
                                'street_address': getattr(delivery_addr, 'street_address', ''),
                                'barangay': getattr(delivery_addr, 'barangay', ''),
                                'city': getattr(delivery_addr, 'city', ''),
                                'full_address': getattr(delivery_addr, 'full_address', ''),
                            },
                            'customer': {
                                'name': getattr(order_obj.customer, 'full_name', 'Unknown'),
                                'phone': getattr(
                                    getattr(order_obj.customer, 'user', None),
                                    'phone_number',
                                    None,
                                ),
                            },
                            'proof_of_delivery_url': order_assignment.proof_of_delivery_url,
                        }
                    )

                history_entries.append(
                    {
                        'assignment_id': assignment.assignment_id,
                        'assignment_db_id': assignment.id,
                        'completed_at': assignment.completed_at.isoformat()
                        if assignment.completed_at
                        else assignment.updated_at.isoformat()
                        if assignment.updated_at
                        else None,
                        'started_delivery_at': assignment.started_delivery_at.isoformat()
                        if assignment.started_delivery_at
                        else None,
                        'batch_size': assignment.batch_size,
                        'assignment_type': assignment.assignment_type,
                        'rider_earnings': float(assignment.rider_earnings)
                        if assignment.rider_earnings
                        else 0.0,
                        'total_delivery_fee': float(assignment.total_delivery_fee)
                        if assignment.total_delivery_fee
                        else 0.0,
                        'notes': assignment.notes,
                        'orders': order_payload,
                    }
                )

            return 200, {
                'success': True,
                'count': len(history_entries),
                'total_count': total_count,
                'offset': offset,
                'limit': limit,
                'assignments': history_entries,
            }

        except Exception as exc:
            logger.error(
                f"❌ Error fetching rider assignment history for rider {rider_id_int}: {exc}",
                exc_info=True,
            )
            return 500, {
                'success': False,
                'error': 'Failed to load rider assignment history',
            }

    status_code, payload = await fetch_history()
    return JsonResponse(payload, status=status_code)


@csrf_exempt
@require_http_methods(["POST"])
async def mark_orders_picked_up(request, assignment_id):
    """
    Mark all orders in an assignment as picked up from pharmacy.
    
    Updates:
    - Order status to PICKED_UP
    - OrderRiderAssignment.picked_up_at timestamp
    - RiderAssignment.status to DELIVERING
    
    Returns success/error response
    """
    try:
        @database_sync_to_async
        def mark_picked_up():
            try:
                try:
                    assignment_obj = RiderAssignment.objects.select_related('rider').get(id=assignment_id)
                except (RiderAssignment.DoesNotExist, ValueError):
                    assignment_obj = RiderAssignment.objects.select_related('rider').get(assignment_id=assignment_id)

                order_assignments_qs = OrderRiderAssignment.objects.filter(
                    assignment=assignment_obj
                ).select_related('order')

                if not order_assignments_qs.exists():
                    return 404, {
                        'success': False,
                        'error': 'No orders found for this assignment'
                    }

                with transaction.atomic():
                    now = timezone.now()
                    updated_count = 0

                    for order_assignment in order_assignments_qs:
                        order = order_assignment.order

                        if order_assignment.picked_up_at:
                            logger.info(f"⏭️ Order {order.order_number} already marked as picked up")
                            continue

                        if order.order_status in [Order.OrderStatus.ACCEPTED, Order.OrderStatus.PREPARING, Order.OrderStatus.READY_FOR_PICKUP]:
                            order.order_status = Order.OrderStatus.PICKED_UP
                            order.save(update_fields=['order_status'])
                            logger.info(f"📦 Order {order.order_number} status updated to PICKED_UP")

                            try:
                                from api.delivery.websocket_service import broadcast_order_update
                                broadcast_order_update(order.id, Order.OrderStatus.PICKED_UP, updated_at=now)
                            except Exception:
                                pass

                        order_assignment.picked_up_at = now
                        order_assignment.save(update_fields=['picked_up_at'])
                        updated_count += 1

                    if updated_count > 0:
                        assignment_obj.status = RiderAssignment.AssignmentStatus.DELIVERING
                        assignment_obj.save(update_fields=['status'])
                        logger.info(f"🚚 Assignment {assignment_obj.assignment_id} status updated to DELIVERING")

                logger.info(f"✅ Marked {updated_count} order(s) as picked up for assignment {assignment_obj.assignment_id}")
                return 200, {
                    'success': True,
                    'message': f'{updated_count} order(s) marked as picked up',
                    'updated_count': updated_count,
                    'assignment_status': assignment_obj.status,
                }

            except RiderAssignment.DoesNotExist:
                return 404, {
                    'success': False,
                    'error': 'Assignment not found'
                }
            except Exception as exc:
                logger.error(f"❌ Error marking orders as picked up: {str(exc)}", exc_info=True)
                return 500, {
                    'success': False,
                    'error': 'Failed to mark orders as picked up'
                }

        status_code, payload = await mark_picked_up()
        return JsonResponse(payload, status=status_code)

    except Exception as e:
        logger.error(f"❌ Unexpected error marking orders as picked up: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to mark orders as picked up'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
async def mark_order_delivered(request, assignment_id, order_id):
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

        @database_sync_to_async
        def mark_delivered():
            try:
                try:
                    assignment_obj = RiderAssignment.objects.select_related('rider').get(id=assignment_id)
                except (RiderAssignment.DoesNotExist, ValueError):
                    assignment_obj = RiderAssignment.objects.select_related('rider').get(assignment_id=assignment_id)

                try:
                    order_assignment = OrderRiderAssignment.objects.select_related('order').get(
                        assignment=assignment_obj,
                        order_id=order_id
                    )
                except OrderRiderAssignment.DoesNotExist:
                    return 404, {
                        'success': False,
                        'error': 'Order not found in this assignment'
                    }

                order = order_assignment.order

                if order_assignment.delivered_at:
                    return 400, {
                        'success': False,
                        'error': 'Order already marked as delivered'
                    }

                with transaction.atomic():
                    now = timezone.now()

                    order.order_status = Order.OrderStatus.DELIVERED
                    order.save(update_fields=['order_status'])
                    logger.info(f"📦 Order {order.order_number} status updated to DELIVERED")

                    try:
                        from api.delivery.websocket_service import OrderTrackingWebSocket
                        OrderTrackingWebSocket.notify_order_complete(order.id, delivered_at=now)
                    except Exception:
                        pass

                    order_assignment.delivered_at = now
                    order_assignment.proof_of_delivery_url = proof_url
                    order_assignment.save(update_fields=['delivered_at', 'proof_of_delivery_url'])
                    logger.info(f"✅ Order {order.order_number} marked as delivered with proof")

                    order_earnings = float(order.delivery_fee) * 0.8 if order.delivery_fee else 0.0

                    all_order_assignments = OrderRiderAssignment.objects.filter(assignment=assignment_obj)
                    all_delivered = all(oa.delivered_at is not None for oa in all_order_assignments)

                    if all_delivered:
                        assignment_obj.status = RiderAssignment.AssignmentStatus.COMPLETED
                        assignment_obj.save(update_fields=['status'])
                        logger.info(f"🎉 Assignment {assignment_obj.assignment_id} completed - all orders delivered")

                total_earnings = float(assignment_obj.rider_earnings) if assignment_obj.rider_earnings else 0.0
                logger.info(f"✅ Order {order.order_number} delivered successfully. Earnings: ₱{order_earnings:.2f}")

                return 200, {
                    'success': True,
                    'message': 'Order marked as delivered',
                    'order_earnings': order_earnings,
                    'total_earnings': total_earnings,
                    'all_delivered': all_delivered,
                    'assignment_status': assignment_obj.status,
                }

            except RiderAssignment.DoesNotExist:
                return 404, {
                    'success': False,
                    'error': 'Assignment not found'
                }
            except Exception as exc:
                logger.error(f"❌ Error marking order as delivered: {str(exc)}", exc_info=True)
                return 500, {
                    'success': False,
                    'error': 'Failed to mark order as delivered'
                }

        status_code, payload = await mark_delivered()
        return JsonResponse(payload, status=status_code)

    except Exception as e:
        logger.error(f"❌ Unexpected error marking order as delivered: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Failed to mark order as delivered'
        }, status=500)

