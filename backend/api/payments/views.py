from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import Payment
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer, PaymentUpdateSerializer,
    PaymentRefundSerializer, PaymentSearchSerializer, PaymentAnalyticsSerializer,
    PaymentMethodSerializer, PaymentVerificationSerializer, PaymentReceiptSerializer
)
from api.orders.models import Order
from api.users.permissions import IsAdmin, IsPharmacy, IsCustomer, IsRider


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for payment management."""
    
    queryset = Payment.objects.select_related('order', 'order__customer', 'order__customer__user')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_status', 'payment_method', 'payment_type', 'order']
    search_fields = ['payment_id', 'transaction_id', 'order__order_number']
    ordering_fields = ['created_at', 'amount_paid', 'payment_status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == 'create':
            return PaymentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PaymentUpdateSerializer
        return PaymentSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        
        if user.role == 'customer':
            # Customers see only their payments
            return self.queryset.filter(order__customer__user=user)
        elif user.role == 'pharmacy':
            # Pharmacies see payments for their orders
            pharmacy_orders = Order.objects.filter(
                pharmacy__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(order__in=pharmacy_orders)
        elif user.role == 'rider':
            # Riders see payments for orders they deliver
            rider_assignments = user.rider.assignments.values_list('id', flat=True)
            from api.delivery.models import OrderRiderAssignment
            rider_orders = OrderRiderAssignment.objects.filter(
                assignment__in=rider_assignments
            ).values_list('order_id', flat=True)
            return self.queryset.filter(order__in=rider_orders)
        
        # Admins see all payments
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def my_payments(self, request):
        """Get current user's payments."""
        if request.user.role != 'customer':
            return Response(
                {'error': 'Only customers can access this endpoint'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        payments = self.get_queryset().filter(order__customer__user=request.user)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending payments."""
        payments = self.get_queryset().filter(payment_status='pending')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def processing(self, request):
        """Get processing payments."""
        payments = self.get_queryset().filter(payment_status='processing')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def paid(self, request):
        """Get paid payments."""
        payments = self.get_queryset().filter(payment_status='paid')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def failed(self, request):
        """Get failed payments."""
        payments = self.get_queryset().filter(payment_status='failed')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def refunded(self, request):
        """Get refunded payments."""
        payments = self.get_queryset().filter(
            payment_status__in=['refunded', 'partially_refunded']
        )
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_method(self, request):
        """Get payments by payment method."""
        method = request.query_params.get('method')
        if not method:
            return Response(
                {'error': 'Payment method is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = self.get_queryset().filter(payment_method=method)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_order(self, request):
        """Get payments for a specific order."""
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response(
                {'error': 'Order ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payments = self.get_queryset().filter(order_id=order_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """Process a pending payment."""
        payment = self.get_object()
        
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can process payments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if payment.payment_status != Payment.PaymentStatus.PENDING:
            return Response(
                {'error': 'Only pending payments can be processed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            transaction_id = request.data.get('transaction_id')
            gateway_reference = request.data.get('gateway_reference')
            
            payment.process_payment(transaction_id, gateway_reference)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to process payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def complete_payment(self, request, pk=None):
        """Complete a payment."""
        payment = self.get_object()
        
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can complete payments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if payment.payment_status not in [Payment.PaymentStatus.PENDING, Payment.PaymentStatus.PROCESSING]:
            return Response(
                {'error': 'Payment must be pending or processing to complete'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            transaction_id = request.data.get('transaction_id')
            receipt_number = request.data.get('receipt_number')
            
            payment.complete_payment(transaction_id, receipt_number)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to complete payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def fail_payment(self, request, pk=None):
        """Mark payment as failed."""
        payment = self.get_object()
        
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can fail payments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if payment.payment_status not in [Payment.PaymentStatus.PENDING, Payment.PaymentStatus.PROCESSING]:
            return Response(
                {'error': 'Payment must be pending or processing to fail'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reason = request.data.get('reason', 'Payment failed')
            transaction_id = request.data.get('transaction_id')
            
            payment.fail_payment(reason, transaction_id)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to mark payment as failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """Refund a payment."""
        payment = self.get_object()
        
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can refund payments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not payment.is_paid:
            return Response(
                {'error': 'Only paid payments can be refunded'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = PaymentRefundSerializer(
            data=request.data, 
            context={'payment': payment}
        )
        if serializer.is_valid():
            try:
                refund_amount = serializer.validated_data['refund_amount']
                reason = serializer.validated_data['reason']
                partial = serializer.validated_data['partial']
                admin_notes = serializer.validated_data.get('admin_notes', '')
                
                payment.refund_payment(refund_amount, reason, partial)
                
                # Add admin notes if provided
                if admin_notes:
                    payment.admin_notes = f"{payment.admin_notes or ''}\nRefund notes: {admin_notes}"
                    payment.save()
                
                serializer = self.get_serializer(payment)
                return Response(serializer.data)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to refund payment: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancel_payment(self, request, pk=None):
        """Cancel a pending payment."""
        payment = self.get_object()
        
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can cancel payments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if payment.payment_status != Payment.PaymentStatus.PENDING:
            return Response(
                {'error': 'Only pending payments can be cancelled'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reason = request.data.get('reason', 'Payment cancelled')
            payment.cancel_payment(reason)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to cancel payment: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Search and filter payments."""
        serializer = PaymentSearchSerializer(data=request.data)
        if serializer.is_valid():
            queryset = self.get_queryset()
            
            # Apply filters
            filters = {}
            
            if serializer.validated_data.get('payment_method'):
                filters['payment_method'] = serializer.validated_data['payment_method']
            
            if serializer.validated_data.get('payment_status'):
                filters['payment_status'] = serializer.validated_data['payment_status']
            
            if serializer.validated_data.get('payment_type'):
                filters['payment_type'] = serializer.validated_data['payment_type']
            
            if serializer.validated_data.get('min_amount'):
                filters['amount_paid__gte'] = serializer.validated_data['min_amount']
            
            if serializer.validated_data.get('max_amount'):
                filters['amount_paid__lte'] = serializer.validated_data['max_amount']
            
            if serializer.validated_data.get('date_from'):
                filters['created_at__date__gte'] = serializer.validated_data['date_from']
            
            if serializer.validated_data.get('date_to'):
                filters['created_at__date__lte'] = serializer.validated_data['date_to']
            
            if serializer.validated_data.get('order_number'):
                filters['order__order_number__icontains'] = serializer.validated_data['order_number']
            
            if serializer.validated_data.get('customer_name'):
                filters['order__customer__first_name__icontains'] = serializer.validated_data['customer_name']
                # Also search in last name
                queryset = queryset.filter(
                    Q(**filters) | 
                    Q(order__customer__last_name__icontains=serializer.validated_data['customer_name'])
                )
            else:
                queryset = queryset.filter(**filters)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get payment analytics."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can access analytics'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        # Calculate metrics
        total_payments = queryset.count()
        total_amount = queryset.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_fees = queryset.aggregate(
            total=Sum(F('processing_fee') + F('gateway_fee'))
        )['total'] or 0
        net_amount = total_amount - total_fees
        
        # Status breakdown
        pending_payments = queryset.filter(payment_status='pending').count()
        processing_payments = queryset.filter(payment_status='processing').count()
        paid_payments = queryset.filter(payment_status='paid').count()
        failed_payments = queryset.filter(payment_status='failed').count()
        refunded_payments = queryset.filter(
            payment_status__in=['refunded', 'partially_refunded']
        ).count()
        
        # Method breakdown
        payment_methods = queryset.values('payment_method').annotate(
            count=Count('id'),
            total_amount=Sum('amount_paid')
        ).order_by('-count')
        
        # Type breakdown
        payment_types = queryset.values('payment_type').annotate(
            count=Count('id'),
            total_amount=Sum('amount_paid')
        ).order_by('-count')
        
        # Time-based metrics (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        daily_totals = queryset.filter(
            created_at__gte=thirty_days_ago
        ).extra(
            select={'day': 'date(created_at)'}
        ).values('day').annotate(
            count=Count('id'),
            total_amount=Sum('amount_paid')
        ).order_by('day')
        
        # Performance metrics
        if paid_payments > 0:
            average_payment_amount = total_amount / paid_payments
            success_rate = (paid_payments / total_payments) * 100
        else:
            average_payment_amount = 0
            success_rate = 0
        
        # Calculate average processing time for completed payments
        completed_payments = queryset.filter(
            payment_status='paid',
            processed_at__isnull=False,
            paid_at__isnull=False
        )
        
        if completed_payments.exists():
            avg_processing_time = completed_payments.aggregate(
                avg_time=Avg(F('paid_at') - F('processed_at'))
            )['avg_time']
        else:
            avg_processing_time = None
        
        analytics_data = {
            'total_payments': total_payments,
            'total_amount': total_amount,
            'total_fees': total_fees,
            'net_amount': net_amount,
            'pending_payments': pending_payments,
            'processing_payments': processing_payments,
            'paid_payments': paid_payments,
            'failed_payments': failed_payments,
            'refunded_payments': refunded_payments,
            'payment_methods': list(payment_methods),
            'payment_types': list(payment_types),
            'daily_totals': list(daily_totals),
            'average_payment_amount': average_payment_amount,
            'success_rate': success_rate,
            'average_processing_time': avg_processing_time
        }
        
        serializer = PaymentAnalyticsSerializer(analytics_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_methods(self, request):
        """Get available payment methods."""
        methods = [
            {
                'method': 'cod',
                'display_name': 'Cash on Delivery',
                'description': 'Pay when your order is delivered',
                'is_available': True,
                'processing_fee': 0.00,
                'min_amount': 0.01,
                'max_amount': 10000.00,
                'estimated_processing_time': 'Immediate'
            },
            {
                'method': 'gcash',
                'display_name': 'GCash',
                'description': 'Pay using GCash mobile wallet',
                'is_available': True,
                'processing_fee': 15.00,
                'min_amount': 1.00,
                'max_amount': 50000.00,
                'estimated_processing_time': '5-10 minutes'
            },
            {
                'method': 'card',
                'display_name': 'Credit/Debit Card',
                'description': 'Pay using Visa, Mastercard, or other cards',
                'is_available': True,
                'processing_fee': 25.00,
                'min_amount': 1.00,
                'max_amount': 100000.00,
                'estimated_processing_time': '2-5 minutes'
            },
            {
                'method': 'bank_transfer',
                'display_name': 'Bank Transfer',
                'description': 'Pay via bank transfer or online banking',
                'is_available': True,
                'processing_fee': 20.00,
                'min_amount': 100.00,
                'max_amount': 500000.00,
                'estimated_processing_time': '1-3 business days'
            },
            {
                'method': 'paymaya',
                'display_name': 'PayMaya',
                'description': 'Pay using PayMaya mobile wallet',
                'is_available': True,
                'processing_fee': 15.00,
                'min_amount': 1.00,
                'max_amount': 50000.00,
                'estimated_processing_time': '5-10 minutes'
            },
            {
                'method': 'grabpay',
                'display_name': 'GrabPay',
                'description': 'Pay using GrabPay wallet',
                'is_available': True,
                'processing_fee': 15.00,
                'min_amount': 1.00,
                'max_amount': 50000.00,
                'estimated_processing_time': '5-10 minutes'
            },
            {
                'method': 'paypal',
                'display_name': 'PayPal',
                'description': 'Pay using PayPal account',
                'is_available': True,
                'processing_fee': 30.00,
                'min_amount': 1.00,
                'max_amount': 100000.00,
                'estimated_processing_time': '10-15 minutes'
            }
        ]
        
        serializer = PaymentMethodSerializer(methods, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def verify(self, request):
        """Verify payment with external gateway."""
        serializer = PaymentVerificationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                payment_id = serializer.validated_data['payment_id']
                transaction_id = serializer.validated_data['transaction_id']
                gateway_reference = serializer.validated_data['gateway_reference']
                verification_code = serializer.validated_data['verification_code']
                
                # In a real implementation, you would verify with the payment gateway
                # For now, we'll simulate successful verification
                
                payment = Payment.objects.get(payment_id=payment_id)
                
                # Update payment with verification details
                payment.transaction_id = transaction_id
                payment.gateway_reference = gateway_reference
                
                # Mark as paid if verification is successful
                if verification_code == 'SUCCESS':  # Simulated verification
                    payment.complete_payment(transaction_id)
                    message = 'Payment verified and completed successfully'
                else:
                    payment.fail_payment('Verification failed')
                    message = 'Payment verification failed'
                
                serializer = self.get_serializer(payment)
                return Response({
                    'message': message,
                    'payment': serializer.data
                })
                
            except Payment.DoesNotExist:
                return Response(
                    {'error': 'Payment not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                return Response(
                    {'error': f'Verification failed: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """Generate payment receipt."""
        payment = self.get_object()
        
        # Check if user has permission to view this receipt
        user = request.user
        if user.role == 'customer' and payment.order.customer.user != user:
            return Response(
                {'error': 'You can only view receipts for your own payments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = PaymentReceiptSerializer(payment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export payments data."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can export payments'}, 
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
        
        if format_type == 'json':
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
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
