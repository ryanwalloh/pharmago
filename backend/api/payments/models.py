from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from api.orders.models import Order


class Payment(models.Model):
    """
    Payment transaction records.
    Handles payment processing, verification, and transaction tracking.
    """
    
    class PaymentMethod(models.TextChoices):
        COD = 'cod', _('Cash on Delivery')
        GCASH = 'gcash', _('GCash')
        CARD = 'card', _('Credit/Debit Card')
        BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')
        PAYMAYA = 'paymaya', _('PayMaya')
        GRABPAY = 'grabpay', _('GrabPay')
        PAYPAL = 'paypal', _('PayPal')
    
    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        PROCESSING = 'processing', _('Processing')
        PAID = 'paid', _('Paid')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
        PARTIALLY_REFUNDED = 'partially_refunded', _('Partially Refunded')
        CANCELLED = 'cancelled', _('Cancelled')
    
    class PaymentType(models.TextChoices):
        ORDER_PAYMENT = 'order_payment', _('Order Payment')
        DELIVERY_FEE = 'delivery_fee', _('Delivery Fee')
        SERVICE_FEE = 'service_fee', _('Service Fee')
        REFUND = 'refund', _('Refund')
        TOP_UP = 'top_up', _('Wallet Top-up')
    
    # Payment identification
    payment_id = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Unique payment identifier')
    )
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='payments',
        help_text=_('Associated order')
    )
    
    # Payment details
    payment_method = models.CharField(
        max_length=50,
        choices=PaymentMethod.choices,
        help_text=_('Payment method used')
    )
    
    payment_type = models.CharField(
        max_length=50,
        choices=PaymentType.choices,
        default=PaymentType.ORDER_PAYMENT,
        help_text=_('Type of payment')
    )
    
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_('Actual amount paid')
    )
    
    currency = models.CharField(
        max_length=3,
        default='PHP',
        help_text=_('Payment currency (ISO 4217)')
    )
    
    # Transaction information
    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('External payment transaction ID')
    )
    
    gateway_reference = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Payment gateway reference number')
    )
    
    # Payment proof and verification
    image_proof = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Payment proof image path')
    )
    
    receipt_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Payment receipt number')
    )
    
    # Status tracking
    payment_status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        help_text=_('Payment status')
    )
    
    status_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Notes about payment status')
    )
    
    # Timestamps
    initiated_at = models.DateTimeField(
        auto_now_add=True,
        help_text=_('When payment was initiated')
    )
    
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When payment was processed')
    )
    
    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Payment completion timestamp')
    )
    
    failed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When payment failed')
    )
    
    refunded_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When payment was refunded')
    )
    
    # Additional information
    customer_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Customer notes about payment')
    )
    
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Admin notes about payment')
    )
    
    # Fee information
    processing_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Payment processing fee')
    )
    
    gateway_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Payment gateway fee')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Payment')
        verbose_name_plural = _('Payments')
        ordering = ['-created_at']
        db_table = 'payment'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['order'], name='idx_payment_order'),
            models.Index(fields=['payment_status'], name='idx_payment_status'),
            models.Index(fields=['payment_method'], name='idx_payment_method'),
            models.Index(fields=['payment_id'], name='idx_payment_id'),
            models.Index(fields=['transaction_id'], name='idx_payment_transaction'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount_paid__gte=0),
                name='valid_payment_amount'
            ),
            models.CheckConstraint(
                check=models.Q(processing_fee__gte=0),
                name='valid_payment_processing_fee'
            ),
            models.CheckConstraint(
                check=models.Q(gateway_fee__gte=0),
                name='valid_payment_gateway_fee'
            ),
        ]
    
    def __str__(self):
        return f"Payment #{self.payment_id} - {self.order.order_number} ({self.get_payment_status_display()})"
    
    @property
    def is_paid(self):
        """Check if payment is completed."""
        return self.payment_status == self.PaymentStatus.PAID
    
    @property
    def is_pending(self):
        """Check if payment is pending."""
        return self.payment_status == self.PaymentStatus.PENDING
    
    @property
    def is_failed(self):
        """Check if payment failed."""
        return self.payment_status == self.PaymentStatus.FAILED
    
    @property
    def is_refunded(self):
        """Check if payment was refunded."""
        return self.payment_status in [
            self.PaymentStatus.REFUNDED,
            self.PaymentStatus.PARTIALLY_REFUNDED
        ]
    
    @property
    def total_fees(self):
        """Calculate total fees."""
        return self.processing_fee + self.gateway_fee
    
    @property
    def net_amount(self):
        """Calculate net amount after fees."""
        return self.amount_paid - self.total_fees
    
    @property
    def payment_summary(self):
        """Get payment summary for display."""
        return {
            'payment_id': self.payment_id,
            'order_number': self.order.order_number,
            'amount': self.amount_paid,
            'method': self.get_payment_method_display(),
            'status': self.get_payment_status_display(),
            'currency': self.currency,
            'created_at': self.created_at,
            'paid_at': self.paid_at,
        }
    
    def process_payment(self, transaction_id=None, gateway_reference=None):
        """Process the payment."""
        if self.payment_status == self.PaymentStatus.PENDING:
            from django.utils import timezone
            
            self.payment_status = self.PaymentStatus.PROCESSING
            self.processed_at = timezone.now()
            
            if transaction_id:
                self.transaction_id = transaction_id
            
            if gateway_reference:
                self.gateway_reference = gateway_reference
            
            self.save()
    
    def complete_payment(self, transaction_id=None, receipt_number=None):
        """Mark payment as completed."""
        if self.payment_status in [self.PaymentStatus.PENDING, self.PaymentStatus.PROCESSING]:
            from django.utils import timezone
            
            self.payment_status = self.PaymentStatus.PAID
            self.paid_at = timezone.now()
            
            if transaction_id:
                self.transaction_id = transaction_id
            
            if receipt_number:
                self.receipt_number = receipt_number
            
            self.save()
            
            # Update order payment status
            self.order.payment_status = 'paid'
            self.order.save()
    
    def fail_payment(self, reason, transaction_id=None):
        """Mark payment as failed."""
        if self.payment_status in [self.PaymentStatus.PENDING, self.PaymentStatus.PROCESSING]:
            from django.utils import timezone
            
            self.payment_status = self.PaymentStatus.FAILED
            self.failed_at = timezone.now()
            self.status_notes = f"Payment failed: {reason}"
            
            if transaction_id:
                self.transaction_id = transaction_id
            
            self.save()
            
            # Update order payment status
            self.order.payment_status = 'failed'
            self.order.save()
    
    def refund_payment(self, refund_amount, reason, partial=False):
        """Refund the payment."""
        if not self.is_paid:
            raise ValidationError(_('Only paid payments can be refunded'))
        
        if refund_amount > self.amount_paid:
            raise ValidationError(_('Refund amount cannot exceed paid amount'))
        
        from django.utils import timezone
        
        if partial:
            self.payment_status = self.PaymentStatus.PARTIALLY_REFUNDED
        else:
            self.payment_status = self.PaymentStatus.REFUNDED
        
        self.refunded_at = timezone.now()
        self.status_notes = f"Refunded: {reason}"
        self.save()
        
        # Update order payment status if fully refunded
        if not partial:
            self.order.payment_status = 'refunded'
            self.order.save()
    
    def cancel_payment(self, reason):
        """Cancel the payment."""
        if self.payment_status == self.PaymentStatus.PENDING:
            self.payment_status = self.PaymentStatus.CANCELLED
            self.status_notes = f"Cancelled: {reason}"
            self.save()
    
    def get_payment_method_display_name(self):
        """Get formatted payment method name."""
        method_names = {
            'cod': 'Cash on Delivery',
            'gcash': 'GCash',
            'card': 'Credit/Debit Card',
            'bank_transfer': 'Bank Transfer',
            'paymaya': 'PayMaya',
            'grabpay': 'GrabPay',
            'paypal': 'PayPal',
        }
        return method_names.get(self.payment_method, self.payment_method.title())
    
    def get_status_display_name(self):
        """Get formatted status name."""
        status_names = {
            'pending': 'Pending',
            'processing': 'Processing',
            'paid': 'Paid',
            'failed': 'Failed',
            'refunded': 'Refunded',
            'partially_refunded': 'Partially Refunded',
            'cancelled': 'Cancelled',
        }
        return status_names.get(self.payment_status, self.payment_status.title())
    
    def get_payment_type_display(self):
        """Get formatted payment type name."""
        type_names = {
            'order_payment': 'Order Payment',
            'delivery_fee': 'Delivery Fee',
            'service_fee': 'Service Fee',
            'refund': 'Refund',
            'top_up': 'Wallet Top-up',
        }
        return type_names.get(self.payment_type, self.payment_type.title())
    
    def save(self, *args, **kwargs):
        """Override save to generate payment ID if not set."""
        if not self.payment_id:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.payment_id = f"PAY{timestamp}"
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate payment data."""
        # Ensure payment amount is positive
        if self.amount_paid <= 0:
            raise ValidationError(_('Payment amount must be positive'))
        
        # Validate currency format
        if len(self.currency) != 3:
            raise ValidationError(_('Currency must be a 3-letter ISO code'))
        
        super().clean()
