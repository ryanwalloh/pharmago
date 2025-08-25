from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.db.models import Sum, Avg, Count
from django.utils import timezone

from .models import Payment
from api.orders.models import Order


class PaymentSerializer(serializers.ModelSerializer):
    """Main serializer for payment transactions."""
    
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer.full_name', read_only=True)
    order_total = serializers.DecimalField(source='order.total_amount', max_digits=10, decimal_places=2, read_only=True)
    
    # Computed fields
    payment_method_display = serializers.CharField(source='get_payment_method_display_name', read_only=True)
    payment_status_display = serializers.CharField(source='get_status_display_name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    
    # Status timestamps
    initiated_at_formatted = serializers.SerializerMethodField()
    processed_at_formatted = serializers.SerializerMethodField()
    paid_at_formatted = serializers.SerializerMethodField()
    failed_at_formatted = serializers.SerializerMethodField()
    refunded_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_id', 'order', 'order_number', 'customer_name', 'order_total',
            'payment_method', 'payment_method_display', 'payment_type', 'payment_type_display',
            'amount_paid', 'currency', 'transaction_id', 'gateway_reference',
            'image_proof', 'receipt_number', 'payment_status', 'payment_status_display',
            'status_notes', 'initiated_at', 'initiated_at_formatted', 'processed_at',
            'processed_at_formatted', 'paid_at', 'paid_at_formatted', 'failed_at',
            'failed_at_formatted', 'refunded_at', 'refunded_at_formatted',
            'customer_notes', 'admin_notes', 'processing_fee', 'gateway_fee',
            'total_fees', 'net_amount', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'payment_id', 'initiated_at', 'created_at', 'updated_at'
        ]
    
    def get_initiated_at_formatted(self, obj):
        """Get formatted initiation time."""
        if obj.initiated_at:
            return obj.initiated_at.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_processed_at_formatted(self, obj):
        """Get formatted processing time."""
        if obj.processed_at:
            return obj.processed_at.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_paid_at_formatted(self, obj):
        """Get formatted payment completion time."""
        if obj.paid_at:
            return obj.paid_at.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_failed_at_formatted(self, obj):
        """Get formatted failure time."""
        if obj.failed_at:
            return obj.failed_at.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def get_refunded_at_formatted(self, obj):
        """Get formatted refund time."""
        if obj.refunded_at:
            return obj.refunded_at.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def validate_amount_paid(self, value):
        """Validate payment amount."""
        if value <= 0:
            raise serializers.ValidationError(_('Payment amount must be positive'))
        return value
    
    def validate_currency(self, value):
        """Validate currency format."""
        if len(value) != 3:
            raise serializers.ValidationError(_('Currency must be a 3-letter ISO code'))
        return value.upper()
    
    def validate_processing_fee(self, value):
        """Validate processing fee."""
        if value < 0:
            raise serializers.ValidationError(_('Processing fee cannot be negative'))
        return value
    
    def validate_gateway_fee(self, value):
        """Validate gateway fee."""
        if value < 0:
            raise serializers.ValidationError(_('Gateway fee cannot be negative'))
        return value


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new payments."""
    
    class Meta:
        model = Payment
        fields = [
            'order', 'payment_method', 'payment_type', 'amount_paid', 'currency',
            'transaction_id', 'gateway_reference', 'image_proof', 'customer_notes',
            'processing_fee', 'gateway_fee'
        ]
    
    def validate_order(self, value):
        """Validate order for payment."""
        if value.payment_status == 'paid':
            raise serializers.ValidationError(_('Order is already paid'))
        
        if value.payment_status == 'cancelled':
            raise serializers.ValidationError(_('Cannot create payment for cancelled order'))
        
        return value
    
    def validate_amount_paid(self, value):
        """Validate payment amount against order total."""
        order = self.initial_data.get('order')
        if order:
            try:
                order_obj = Order.objects.get(id=order)
                if value < order_obj.total_amount:
                    raise serializers.ValidationError(
                        _('Payment amount must be at least the order total')
                    )
            except Order.DoesNotExist:
                pass
        
        return value
    
    def validate(self, data):
        """Validate payment data."""
        order = data.get('order')
        payment_method = data.get('payment_method')
        amount_paid = data.get('amount_paid')
        
        # Validate payment method requirements
        if payment_method == Payment.PaymentMethod.COD:
            # COD payments should match order total exactly
            if amount_paid != order.total_amount:
                raise serializers.ValidationError(
                    _('Cash on Delivery payments must match order total exactly')
                )
        
        # Validate payment type
        payment_type = data.get('payment_type')
        if payment_type == Payment.PaymentType.REFUND:
            # Refunds require existing payment
            existing_payment = Payment.objects.filter(
                order=order,
                payment_type=Payment.PaymentType.ORDER_PAYMENT,
                payment_status=Payment.PaymentStatus.PAID
            ).first()
            
            if not existing_payment:
                raise serializers.ValidationError(
                    _('Cannot create refund without existing paid payment')
                )
            
            if amount_paid > existing_payment.amount_paid:
                raise serializers.ValidationError(
                    _('Refund amount cannot exceed original payment amount')
                )
        
        return data


class PaymentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating payment status and information."""
    
    class Meta:
        model = Payment
        fields = [
            'payment_status', 'status_notes', 'admin_notes', 'transaction_id',
            'gateway_reference', 'receipt_number', 'image_proof'
        ]
    
    def validate_payment_status(self, value):
        """Validate payment status transitions."""
        instance = self.instance
        if not instance:
            return value
        
        # Define valid status transitions
        valid_transitions = {
            Payment.PaymentStatus.PENDING: [
                Payment.PaymentStatus.PROCESSING,
                Payment.PaymentStatus.CANCELLED
            ],
            Payment.PaymentStatus.PROCESSING: [
                Payment.PaymentStatus.PAID,
                Payment.PaymentStatus.FAILED
            ],
            Payment.PaymentStatus.PAID: [
                Payment.PaymentStatus.REFUNDED,
                Payment.PaymentStatus.PARTIALLY_REFUNDED
            ],
            Payment.PaymentStatus.FAILED: [
                Payment.PaymentStatus.PENDING
            ]
        }
        
        current_status = instance.payment_status
        if current_status in valid_transitions and value not in valid_transitions[current_status]:
            raise serializers.ValidationError(
                _('Invalid status transition from {} to {}').format(
                    instance.get_payment_status_display(), 
                    dict(Payment.PaymentStatus.choices)[value]
                )
            )
        
        return value


class PaymentRefundSerializer(serializers.Serializer):
    """Serializer for payment refund operations."""
    
    refund_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text=_('Amount to refund')
    )
    
    reason = serializers.CharField(
        max_length=500,
        help_text=_('Reason for refund')
    )
    
    partial = serializers.BooleanField(
        default=False,
        help_text=_('Whether this is a partial refund')
    )
    
    admin_notes = serializers.CharField(
        max_length=1000,
        required=False,
        help_text=_('Admin notes about the refund')
    )
    
    def validate_refund_amount(self, value):
        """Validate refund amount."""
        payment = self.context.get('payment')
        if payment:
            if value > payment.amount_paid:
                raise serializers.ValidationError(
                    _('Refund amount cannot exceed paid amount')
                )
            
            if not payment.is_paid:
                raise serializers.ValidationError(
                    _('Cannot refund unpaid payment')
                )
        
        return value


class PaymentSearchSerializer(serializers.Serializer):
    """Serializer for payment search and filtering."""
    
    payment_method = serializers.ChoiceField(
        choices=Payment.PaymentMethod.choices,
        required=False,
        help_text=_('Filter by payment method')
    )
    
    payment_status = serializers.ChoiceField(
        choices=Payment.PaymentStatus.choices,
        required=False,
        help_text=_('Filter by payment status')
    )
    
    payment_type = serializers.ChoiceField(
        choices=Payment.PaymentType.choices,
        required=False,
        help_text=_('Filter by payment type')
    )
    
    min_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text=_('Minimum payment amount')
    )
    
    max_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text=_('Maximum payment amount')
    )
    
    date_from = serializers.DateField(
        required=False,
        help_text=_('Filter payments from this date')
    )
    
    date_to = serializers.DateField(
        required=False,
        help_text=_('Filter payments until this date')
    )
    
    order_number = serializers.CharField(
        max_length=100,
        required=False,
        help_text=_('Filter by order number')
    )
    
    customer_name = serializers.CharField(
        max_length=200,
        required=False,
        help_text=_('Filter by customer name')
    )
    
    def validate_min_amount(self, value):
        """Validate minimum amount."""
        if value is not None and value < 0:
            raise serializers.ValidationError(_('Minimum amount cannot be negative'))
        return value
    
    def validate_max_amount(self, value):
        """Validate maximum amount."""
        if value is not None and value < 0:
            raise serializers.ValidationError(_('Maximum amount cannot be negative'))
        return value
    
    def validate(self, data):
        """Validate search parameters."""
        min_amount = data.get('min_amount')
        max_amount = data.get('max_amount')
        
        if min_amount and max_amount and min_amount > max_amount:
            raise serializers.ValidationError(
                _('Minimum amount cannot be greater than maximum amount')
            )
        
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                _('Start date cannot be after end date')
            )
        
        return data


class PaymentAnalyticsSerializer(serializers.Serializer):
    """Serializer for payment analytics and metrics."""
    
    total_payments = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_fees = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Status breakdown
    pending_payments = serializers.IntegerField(read_only=True)
    processing_payments = serializers.IntegerField(read_only=True)
    paid_payments = serializers.IntegerField(read_only=True)
    failed_payments = serializers.IntegerField(read_only=True)
    refunded_payments = serializers.IntegerField(read_only=True)
    
    # Method breakdown
    payment_methods = serializers.ListField(child=serializers.DictField(), read_only=True)
    
    # Type breakdown
    payment_types = serializers.ListField(child=serializers.DictField(), read_only=True)
    
    # Time-based metrics
    daily_totals = serializers.ListField(child=serializers.DictField(), read_only=True)
    monthly_totals = serializers.ListField(child=serializers.DictField(), read_only=True)
    
    # Performance metrics
    average_payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    success_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    average_processing_time = serializers.DurationField(read_only=True)


class PaymentMethodSerializer(serializers.Serializer):
    """Serializer for available payment methods."""
    
    method = serializers.CharField(help_text=_('Payment method code'))
    display_name = serializers.CharField(help_text=_('Human-readable payment method name'))
    description = serializers.CharField(help_text=_('Payment method description'))
    is_available = serializers.BooleanField(help_text=_('Whether this method is currently available'))
    processing_fee = serializers.DecimalField(max_digits=5, decimal_places=2, help_text=_('Processing fee percentage'))
    min_amount = serializers.DecimalField(max_digits=10, decimal_places=2, help_text=_('Minimum payment amount'))
    max_amount = serializers.DecimalField(max_digits=10, decimal_places=2, help_text=_('Maximum payment amount'))
    estimated_processing_time = serializers.CharField(help_text=_('Estimated processing time'))


class PaymentVerificationSerializer(serializers.Serializer):
    """Serializer for payment verification operations."""
    
    payment_id = serializers.CharField(help_text=_('Payment ID to verify'))
    transaction_id = serializers.CharField(help_text=_('External transaction ID'))
    gateway_reference = serializers.CharField(help_text=_('Payment gateway reference'))
    verification_code = serializers.CharField(help_text=_('Verification code from payment gateway'))
    
    def validate_payment_id(self, value):
        """Validate payment ID."""
        try:
            payment = Payment.objects.get(payment_id=value)
            if payment.payment_status != Payment.PaymentStatus.PROCESSING:
                raise serializers.ValidationError(
                    _('Payment must be in processing status for verification')
                )
        except Payment.DoesNotExist:
            raise serializers.ValidationError(_('Payment not found'))
        
        return value


class PaymentReceiptSerializer(serializers.ModelSerializer):
    """Serializer for payment receipt generation."""
    
    order_details = serializers.SerializerMethodField()
    customer_details = serializers.SerializerMethodField()
    payment_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'payment_id', 'receipt_number', 'order_details', 'customer_details',
            'payment_summary', 'created_at', 'paid_at'
        ]
    
    def get_order_details(self, obj):
        """Get order details for receipt."""
        order = obj.order
        return {
            'order_number': order.order_number,
            'order_date': order.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'total_amount': order.total_amount,
            'delivery_fee': order.delivery_fee,
            'items_count': order.order_lines.count()
        }
    
    def get_customer_details(self, obj):
        """Get customer details for receipt."""
        customer = obj.order.customer
        return {
            'name': customer.full_name,
            'phone': customer.phone_number,
            'email': customer.user.email
        }
    
    def get_payment_summary(self, obj):
        """Get payment summary for receipt."""
        return {
            'method': obj.get_payment_method_display_name(),
            'amount_paid': obj.amount_paid,
            'processing_fee': obj.processing_fee,
            'gateway_fee': obj.gateway_fee,
            'net_amount': obj.net_amount,
            'currency': obj.currency,
            'transaction_id': obj.transaction_id
        }
