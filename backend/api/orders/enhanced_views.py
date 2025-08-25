from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import Order, OrderLine
from .serializers import OrderSerializer, OrderLineSerializer
from api.delivery.models import RiderAssignment, OrderRiderAssignment
from api.payments.models import Payment
from api.users.permissions import IsAdmin, IsPharmacy, IsCustomer, IsRider


class EnhancedOrderViewSet(viewsets.ModelViewSet):
    """Enhanced ViewSet for order management with delivery and payment integration."""
    
    queryset = Order.objects.select_related(
        'customer', 'customer__user', 'delivery_address', 'pharmacy', 'pharmacy__user'
    ).prefetch_related(
        'order_lines', 'order_lines__inventory',
        'rider_assignments', 'rider_assignments__assignment',
        'payments'
    )
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['order_status', 'payment_status', 'customer', 'pharmacy']
    search_fields = ['order_number', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'total_amount', 'order_status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        
        if user.role == 'customer':
            # Customers see only their orders
            return self.queryset.filter(customer__user=user)
        elif user.role == 'pharmacy':
            # Pharmacies see orders for their pharmacy
            return self.queryset.filter(pharmacy__user=user)
        elif user.role == 'rider':
            # Riders see orders they're assigned to deliver
            rider_assignments = user.rider.assignments.values_list('id', flat=True)
            rider_orders = OrderRiderAssignment.objects.filter(
                assignment__in=rider_assignments
            ).values_list('order_id', flat=True)
            return self.queryset.filter(id__in=rider_orders)
        
        # Admins see all orders
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def with_delivery_status(self, request):
        """Get orders with delivery status information."""
        orders = self.get_queryset()
        
        # Add delivery status information
        for order in orders:
            # Get latest rider assignment
            latest_assignment = order.rider_assignments.order_by('-created_at').first()
            if latest_assignment:
                order.delivery_status = latest_assignment.assignment.status
                order.rider_name = latest_assignment.assignment.rider.full_name
                order.estimated_delivery = latest_assignment.assignment.estimated_completion
            else:
                order.delivery_status = 'unassigned'
                order.rider_name = None
                order.estimated_delivery = None
        
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def with_payment_status(self, request):
        """Get orders with detailed payment status information."""
        orders = self.get_queryset()
        
        # Add payment status information
        for order in orders:
            # Get latest payment
            latest_payment = order.payments.order_by('-created_at').first()
            if latest_payment:
                order.payment_method = latest_payment.payment_method
                order.payment_status_detailed = latest_payment.payment_status
                order.payment_amount = latest_payment.amount_paid
                order.payment_date = latest_payment.paid_at
            else:
                order.payment_method = None
                order.payment_status_detailed = 'no_payment'
                order.payment_amount = None
                order.payment_date = None
        
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def delivery_ready(self, request):
        """Get orders ready for delivery assignment."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can view delivery ready orders'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        orders = self.get_queryset().filter(
            order_status='ready_for_pickup',
            payment_status='paid'
        ).exclude(
            rider_assignments__isnull=False
        )
        
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def in_delivery(self, request):
        """Get orders currently being delivered."""
        orders = self.get_queryset().filter(
            rider_assignments__assignment__status__in=['accepted', 'picked_up', 'delivering']
        ).distinct()
        
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def delivery_completed(self, request):
        """Get orders with completed delivery."""
        orders = self.get_queryset().filter(
            rider_assignments__assignment__status='completed'
        ).distinct()
        
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_rider(self, request, pk=None):
        """Assign a rider to an order."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can assign riders'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        order = self.get_object()
        rider_id = request.data.get('rider_id')
        
        if not rider_id:
            return Response(
                {'error': 'Rider ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if order is already assigned
        if order.rider_assignments.exists():
            return Response(
                {'error': 'Order is already assigned to a rider'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from api.users.models import Rider
            rider = Rider.objects.get(id=rider_id, status='approved')
            
            # Create rider assignment
            assignment = RiderAssignment.objects.create(
                rider=rider,
                assignment_type='single',
                batch_size=1,
                max_batch_size=1,
                total_delivery_fee=order.delivery_fee,
                rider_earnings=order.delivery_fee * 0.8,  # 80% to rider
                estimated_completion=timezone.now() + timezone.timedelta(hours=2)
            )
            
            # Create order assignment
            OrderRiderAssignment.objects.create(
                order=order,
                assignment=assignment,
                pickup_sequence=1,
                delivery_sequence=1
            )
            
            # Update order status
            order.order_status = 'picked_up'
            order.save()
            
            serializer = self.get_serializer(order)
            return Response({
                'message': 'Rider assigned successfully',
                'order': serializer.data,
                'assignment_id': assignment.assignment_id
            })
            
        except Rider.DoesNotExist:
            return Response(
                {'error': 'Rider not found or not approved'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to assign rider: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def batch_with_orders(self, request, pk=None):
        """Batch this order with other orders for delivery."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can batch orders'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        order = self.get_object()
        other_order_ids = request.data.get('other_order_ids', [])
        
        if not other_order_ids:
            return Response(
                {'error': 'Other order IDs are required for batching'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from api.delivery.models import OrderBatchingService
            
            # Get all orders for batching
            all_orders = [order] + list(Order.objects.filter(id__in=other_order_ids))
            
            # Check if orders can be batched
            if not OrderBatchingService.can_batch_orders(all_orders, max_batch_size=3, max_distance_km=2.0):
                return Response(
                    {'error': 'Orders cannot be batched together'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find available riders
            delivery_address = order.delivery_address
            available_riders = OrderBatchingService.find_available_riders(delivery_address, max_distance_km=5.0)
            
            if not available_riders.exists():
                return Response(
                    {'error': 'No available riders found in the area'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create batch assignment
            selected_rider = available_riders.first()
            batch_assignment = OrderBatchingService.create_batch_assignment(all_orders, selected_rider)
            
            # Update order statuses
            for order_obj in all_orders:
                order_obj.order_status = 'picked_up'
                order_obj.save()
            
            return Response({
                'message': 'Orders batched successfully',
                'assignment_id': batch_assignment.assignment_id,
                'rider_name': selected_rider.full_name,
                'batch_size': len(all_orders)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to batch orders: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def create_payment(self, request, pk=None):
        """Create a payment for an order."""
        order = self.get_object()
        
        if request.user.role not in ['admin', 'pharmacy', 'customer']:
            return Response(
                {'error': 'Insufficient permissions to create payment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if order already has a payment
        if order.payments.exists():
            return Response(
                {'error': 'Order already has a payment'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from api.payments.serializers import PaymentCreateSerializer
            
            payment_data = request.data.copy()
            payment_data['order'] = order.id
            payment_data['amount_paid'] = order.total_amount
            
            serializer = PaymentCreateSerializer(data=payment_data)
            if serializer.is_valid():
                payment = serializer.save()
                
                # Update order payment status
                order.payment_status = 'paid'
                order.save()
                
                return Response({
                    'message': 'Payment created successfully',
                    'payment_id': payment.payment_id,
                    'order_status': order.order_status
                })
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response(
                {'error': f'Failed to create payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def delivery_tracking(self, request, pk=None):
        """Get delivery tracking information for an order."""
        order = self.get_object()
        
        # Check if user has permission to view tracking
        user = request.user
        if user.role == 'customer' and order.customer.user != user:
            return Response(
                {'error': 'You can only view tracking for your own orders'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get delivery information
        delivery_info = {
            'order_number': order.order_number,
            'order_status': order.order_status,
            'delivery_address': order.delivery_address.full_address,
            'delivery_fee': order.delivery_fee,
            'estimated_delivery': None,
            'rider_assignment': None,
            'location_updates': []
        }
        
        # Get rider assignment
        rider_assignment = order.rider_assignments.order_by('-created_at').first()
        if rider_assignment:
            assignment = rider_assignment.assignment
            delivery_info['rider_assignment'] = {
                'assignment_id': assignment.assignment_id,
                'rider_name': assignment.rider.full_name,
                'rider_phone': assignment.rider.phone_number,
                'status': assignment.status,
                'assigned_at': assignment.assigned_at,
                'estimated_completion': assignment.estimated_completion,
                'pickup_sequence': rider_assignment.pickup_sequence,
                'delivery_sequence': rider_assignment.delivery_sequence
            }
            
            delivery_info['estimated_delivery'] = assignment.estimated_completion
            
            # Get location updates if available
            if assignment.rider.location_updates.exists():
                location_updates = assignment.rider.location_updates.filter(
                    assignment=assignment
                ).order_by('timestamp')[:10]  # Last 10 updates
                
                delivery_info['location_updates'] = [
                    {
                        'latitude': update.latitude,
                        'longitude': update.longitude,
                        'timestamp': update.timestamp,
                        'accuracy': update.accuracy
                    }
                    for update in location_updates
                ]
        
        return Response(delivery_info)
    
    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """Get payment history for an order."""
        order = self.get_object()
        
        # Check if user has permission to view payment history
        user = request.user
        if user.role == 'customer' and order.customer.user != user:
            return Response(
                {'error': 'You can only view payment history for your own orders'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        payments = order.payments.all()
        from api.payments.serializers import PaymentSerializer
        serializer = PaymentSerializer(payments, many=True)
        
        return Response({
            'order_number': order.order_number,
            'total_amount': order.total_amount,
            'delivery_fee': order.delivery_fee,
            'payment_status': order.payment_status,
            'payments': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def delivery_analytics(self, request):
        """Get delivery analytics for orders."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can access delivery analytics'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        # Calculate delivery metrics
        total_orders = queryset.count()
        orders_with_delivery = queryset.filter(rider_assignments__isnull=False).distinct().count()
        orders_delivered = queryset.filter(
            rider_assignments__assignment__status='completed'
        ).distinct().count()
        
        # Delivery time metrics
        delivered_orders = queryset.filter(
            rider_assignments__assignment__status='completed'
        ).distinct()
        
        if delivered_orders.exists():
            avg_delivery_time = delivered_orders.aggregate(
                avg_time=Avg(F('rider_assignments__assignment__completed_at') - F('rider_assignments__assignment__assigned_at'))
            )['avg_time']
        else:
            avg_delivery_time = None
        
        # Delivery fee metrics
        total_delivery_fees = queryset.aggregate(
            total=Sum('delivery_fee')
        )['total'] or 0
        
        # Status breakdown
        status_breakdown = queryset.values('order_status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Payment status breakdown
        payment_status_breakdown = queryset.values('payment_status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        analytics_data = {
            'total_orders': total_orders,
            'orders_with_delivery': orders_with_delivery,
            'orders_delivered': orders_delivered,
            'delivery_rate': (orders_delivered / total_orders * 100) if total_orders > 0 else 0,
            'average_delivery_time': avg_delivery_time,
            'total_delivery_fees': total_delivery_fees,
            'status_breakdown': list(status_breakdown),
            'payment_status_breakdown': list(payment_status_breakdown)
        }
        
        return Response(analytics_data)
    
    @action(detail=False, methods=['get'])
    def payment_analytics(self, request):
        """Get payment analytics for orders."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can access payment analytics'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        # Calculate payment metrics
        total_orders = queryset.count()
        paid_orders = queryset.filter(payment_status='paid').count()
        pending_payments = queryset.filter(payment_status='pending').count()
        failed_payments = queryset.filter(payment_status='failed').count()
        
        # Financial metrics
        total_revenue = queryset.filter(payment_status='paid').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        total_delivery_fees = queryset.filter(payment_status='paid').aggregate(
            total=Sum('delivery_fee')
        )['total'] or 0
        
        # Payment method breakdown
        payment_methods = queryset.filter(
            payments__isnull=False
        ).values(
            'payments__payment_method'
        ).annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        ).order_by('-count')
        
        analytics_data = {
            'total_orders': total_orders,
            'paid_orders': paid_orders,
            'pending_payments': pending_payments,
            'failed_payments': failed_payments,
            'payment_success_rate': (paid_orders / total_orders * 100) if total_orders > 0 else 0,
            'total_revenue': total_revenue,
            'total_delivery_fees': total_delivery_fees,
            'payment_methods': list(payment_methods)
        }
        
        return Response(analytics_data)
    
    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update order statuses."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can bulk update order statuses'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        order_ids = request.data.get('order_ids', [])
        new_status = request.data.get('new_status')
        
        if not order_ids or not new_status:
            return Response(
                {'error': 'Order IDs and new status are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(Order.OrderStatus.choices):
            return Response(
                {'error': 'Invalid order status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update orders
            updated_count = Order.objects.filter(id__in=order_ids).update(
                order_status=new_status,
                updated_at=timezone.now()
            )
            
            return Response({
                'message': f'Successfully updated {updated_count} orders to {new_status}',
                'updated_count': updated_count
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to update orders: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def export_delivery_data(self, request):
        """Export order delivery data."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can export delivery data'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get export parameters
        format_type = request.query_params.get('format', 'json')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        queryset = self.get_queryset()
        
        # Apply date filters if provided
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        # Add delivery information
        orders_with_delivery = []
        for order in queryset:
            order_data = {
                'order_number': order.order_number,
                'customer_name': order.customer.full_name,
                'delivery_address': order.delivery_address.full_address,
                'order_status': order.order_status,
                'payment_status': order.payment_status,
                'total_amount': order.total_amount,
                'delivery_fee': order.delivery_fee,
                'created_at': order.created_at,
                'delivery_assignment': None
            }
            
            # Get delivery assignment info
            rider_assignment = order.rider_assignments.order_by('-created_at').first()
            if rider_assignment:
                assignment = rider_assignment.assignment
                order_data['delivery_assignment'] = {
                    'rider_name': assignment.rider.full_name,
                    'status': assignment.status,
                    'assigned_at': assignment.assigned_at,
                    'completed_at': assignment.completed_at
                }
            
            orders_with_delivery.append(order_data)
        
        if format_type == 'json':
            return Response(orders_with_delivery)
        elif format_type == 'csv':
            # In a real implementation, you would generate CSV
            return Response(
                {'error': 'CSV export not implemented yet'}, 
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        else:
            return Response(
                {'error': 'Unsupported export format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
