from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db.models import Sum, F
from api.users.models import User
from api.users.models import Customer
from api.locations.models import Address


class Order(models.Model):
    """
    Customer orders and delivery information.
    Handles order processing, status tracking, and delivery details.
    """
    
    class OrderStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        ACCEPTED = 'accepted', _('Accepted')
        PREPARING = 'preparing', _('Preparing')
        READY_FOR_PICKUP = 'ready_for_pickup', _('Ready for Pickup')
        PICKED_UP = 'picked_up', _('Picked Up')
        DELIVERED = 'delivered', _('Delivered')
        CANCELLED = 'cancelled', _('Cancelled')
        REFUNDED = 'refunded', _('Refunded')
    
    class PaymentStatus(models.TextChoices):
        UNPAID = 'unpaid', _('Unpaid')
        PAID = 'paid', _('Paid')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
        PARTIALLY_REFUNDED = 'partially_refunded', _('Partially Refunded')
    
    class DeliveryType(models.TextChoices):
        STANDARD = 'standard', _('Standard Delivery')
        EXPRESS = 'express', _('Express Delivery')
        SCHEDULED = 'scheduled', _('Scheduled Delivery')
    
    # Order identification
    order_number = models.CharField(
        max_length=50,
        unique=True,
        help_text=_('Unique order number')
    )
    
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='orders',
        help_text=_('Customer who placed the order')
    )
    
    delivery_address = models.ForeignKey(
        Address,
        on_delete=models.CASCADE,
        related_name='orders',
        help_text=_('Delivery address')
    )
    
    # Order details
    order_status = models.CharField(
        max_length=50,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        help_text=_('Current order status')
    )
    
    payment_status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        help_text=_('Payment status')
    )
    
    delivery_type = models.CharField(
        max_length=50,
        choices=DeliveryType.choices,
        default=DeliveryType.STANDARD,
        help_text=_('Type of delivery service')
    )
    
    # Financial information
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Subtotal before taxes and fees')
    )
    
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Tax amount')
    )
    
    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Delivery service fee')
    )
    
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Total discount amount')
    )
    
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Total amount after all calculations')
    )
    
    # Delivery information
    estimated_delivery = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Estimated delivery time')
    )
    
    actual_delivery = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Actual delivery time')
    )
    
    delivery_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Special delivery instructions')
    )
    
    # Customer preferences
    preferred_delivery_time = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        choices=[
            ('morning', _('Morning (8AM-12PM)')),
            ('afternoon', _('Afternoon (12PM-5PM)')),
            ('evening', _('Evening (5PM-9PM)')),
            ('anytime', _('Anytime')),
        ],
        help_text=_('Preferred delivery time slot')
    )
    
    # Order metadata
    source = models.CharField(
        max_length=50,
        default='web',
        choices=[
            ('web', _('Web Application')),
            ('mobile', _('Mobile Application')),
            ('phone', _('Phone Order')),
            ('walk_in', _('Walk-in Customer')),
        ],
        help_text=_('Order source')
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Additional order notes')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def delivery_status(self):
        """Get current delivery status from rider assignment."""
        latest_assignment = self.rider_assignments.order_by('-created_at').first()
        if latest_assignment:
            return latest_assignment.assignment.status
        return 'unassigned'
    
    @property
    def rider_name(self):
        """Get current rider name from rider assignment."""
        latest_assignment = self.rider_assignments.order_by('-created_at').first()
        if latest_assignment and latest_assignment.assignment.rider:
            return latest_assignment.assignment.rider.full_name
        return None
    
    @property
    def estimated_delivery(self):
        """Get estimated delivery time from rider assignment."""
        latest_assignment = self.rider_assignments.order_by('-created_at').first()
        if latest_assignment:
            return latest_assignment.assignment.estimated_completion
        return None
    
    class Meta:
        verbose_name = _('Order')
        verbose_name_plural = _('Orders')
        ordering = ['-created_at']
        db_table = 'order'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['customer'], name='idx_order_customer'),
            models.Index(fields=['order_status'], name='idx_order_status'),
            models.Index(fields=['payment_status'], name='idx_order_payment_status'),
            models.Index(fields=['created_at'], name='idx_order_created'),
            models.Index(fields=['order_number'], name='idx_order_number'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_amount__gte=0),
                name='valid_order_total'
            ),
            models.CheckConstraint(
                check=models.Q(subtotal__gte=0),
                name='valid_order_subtotal'
            ),
        ]
    
    def __str__(self):
        return f"Order #{self.order_number} - {self.customer.full_name}"
    
    @property
    def is_paid(self):
        """Check if order is paid."""
        return self.payment_status == self.PaymentStatus.PAID
    
    @property
    def is_delivered(self):
        """Check if order is delivered."""
        return self.order_status == self.OrderStatus.DELIVERED
    
    @property
    def is_cancelled(self):
        """Check if order is cancelled."""
        return self.order_status == self.OrderStatus.CANCELLED
    
    @property
    def can_be_cancelled(self):
        """Check if order can be cancelled."""
        return self.order_status in [
            self.OrderStatus.PENDING,
            self.OrderStatus.ACCEPTED,
            self.OrderStatus.PREPARING
        ]
    
    @property
    def delivery_time_estimate(self):
        """Get delivery time estimate."""
        if self.estimated_delivery:
            return self.estimated_delivery
        return None
    
    @property
    def actual_delivery_time(self):
        """Get actual delivery time."""
        if self.actual_delivery:
            return self.actual_delivery
        return None
    
    def calculate_totals(self):
        """Calculate order totals."""
        # Calculate subtotal from order lines
        subtotal = self.order_lines.aggregate(
            total=Sum(F('unit_price') * F('quantity'))
        )['total'] or 0
        
        # Calculate tax (example: 12% VAT)
        tax_rate = 0.12  # This could be configurable
        tax_amount = subtotal * tax_rate
        
        # Apply discount
        discount_amount = self.discount_amount
        
        # Calculate total
        total = subtotal + tax_amount + self.delivery_fee - discount_amount
        
        # Update fields
        self.subtotal = subtotal
        self.tax_amount = tax_amount
        self.total_amount = total
        self.save()
        
        return {
            'subtotal': subtotal,
            'tax_amount': tax_amount,
            'delivery_fee': self.delivery_fee,
            'discount_amount': discount_amount,
            'total': total
        }
    
    def update_status(self, new_status, notes=None):
        """Update order status."""
        old_status = self.order_status
        self.order_status = new_status
        
        if notes:
            self.notes = f"{self.notes}\nStatus changed from {old_status} to {new_status}: {notes}"
        
        self.save()
        
        # Update delivery time if delivered
        if new_status == self.OrderStatus.DELIVERED:
            from django.utils import timezone
            self.actual_delivery = timezone.now()
            self.save()
    
    def apply_discount(self, discount_amount):
        """Apply discount to the order."""
        if discount_amount > self.subtotal:
            raise ValidationError(_('Discount cannot exceed subtotal'))
        
        self.discount_amount = discount_amount
        self.calculate_totals()
    
    def cancel_order(self, reason):
        """Cancel the order."""
        if not self.can_be_cancelled:
            raise ValidationError(_('Order cannot be cancelled at this stage'))
        
        self.order_status = self.OrderStatus.CANCELLED
        self.notes = f"{self.notes}\nOrder cancelled: {reason}"
        self.save()
    
    def get_delivery_estimate(self):
        """Get delivery time estimate based on order type and items."""
        from datetime import datetime, timedelta
        
        base_delivery_time = datetime.now() + timedelta(hours=2)  # Base 2 hours
        
        if self.delivery_type == self.DeliveryType.EXPRESS:
            base_delivery_time -= timedelta(hours=1)  # 1 hour faster
        elif self.delivery_type == self.DeliveryType.SCHEDULED:
            # Use preferred delivery time if set
            if self.preferred_delivery_time:
                # Logic to calculate preferred time
                pass
        
        return base_delivery_time
    
    # Delivery Integration Methods
    def get_current_rider_assignment(self):
        """Get the current rider assignment for this order."""
        try:
            return self.rider_assignments.filter(
                assignment__status__in=[
                    'assigned', 'accepted', 'picked_up', 'delivering'
                ]
            ).first()
        except:
            return None
    
    def get_rider(self):
        """Get the rider assigned to this order."""
        assignment = self.get_current_rider_assignment()
        if assignment:
            return assignment.assignment.rider
        return None
    
    def get_rider_name(self):
        """Get the name of the rider assigned to this order."""
        rider = self.get_rider()
        if rider:
            return rider.full_name
        return None
    
    def is_assigned_to_rider(self):
        """Check if this order is currently assigned to a rider."""
        return self.get_current_rider_assignment() is not None
    
    def get_delivery_status(self):
        """Get detailed delivery status information."""
        assignment = self.get_current_rider_assignment()
        if not assignment:
            return {
                'status': 'unassigned',
                'rider': None,
                'pickup_sequence': None,
                'delivery_sequence': None,
                'estimated_pickup': None,
                'estimated_delivery': None
            }
        
        return {
            'status': assignment.assignment.status,
            'rider': assignment.assignment.rider.full_name,
            'pickup_sequence': assignment.pickup_sequence,
            'delivery_sequence': assignment.delivery_sequence,
            'estimated_pickup': assignment.assignment.assigned_at,
            'estimated_delivery': assignment.assignment.estimated_completion
        }
    
    def is_part_of_batch(self):
        """Check if this order is part of a batched delivery."""
        assignment = self.get_current_rider_assignment()
        if assignment:
            return assignment.assignment.is_batch
        return False
    
    def get_batch_info(self):
        """Get information about the batch this order belongs to."""
        assignment = self.get_current_rider_assignment()
        if not assignment or not assignment.assignment.is_batch:
            return None
        
        batch_orders = assignment.assignment.order_assignments.order_by('pickup_sequence')
        return {
            'batch_size': assignment.assignment.batch_size,
            'batch_orders': [
                {
                    'order_number': order_assignment.order.order_number,
                    'customer_name': order_assignment.order.customer.full_name,
                    'pickup_sequence': order_assignment.pickup_sequence,
                    'delivery_sequence': order_assignment.delivery_sequence,
                    'address': order_assignment.order.delivery_address.full_address
                }
                for order_assignment in batch_orders
            ]
        }
    
    def get_delivery_tracking(self):
        """Get comprehensive delivery tracking information."""
        assignment = self.get_current_rider_assignment()
        if not assignment:
            return {
                'status': 'unassigned',
                'message': 'Order not yet assigned to a rider'
            }
        
        # Get rider's current location if available
        rider_location = None
        if assignment.assignment.rider.location_updates.exists():
            rider_location = assignment.assignment.rider.location_updates.order_by('-timestamp').first()
        
        tracking_info = {
            'assignment_id': assignment.assignment.assignment_id,
            'rider_name': assignment.assignment.rider.full_name,
            'rider_phone': assignment.assignment.rider.user.phone_number,
            'status': assignment.assignment.status,
            'pickup_sequence': assignment.pickup_sequence,
            'delivery_sequence': assignment.delivery_sequence,
            'assigned_at': assignment.assignment.assigned_at,
            'estimated_completion': assignment.assignment.estimated_completion,
            'is_batch': assignment.assignment.is_batch,
            'batch_size': assignment.assignment.batch_size if assignment.assignment.is_batch else 1
        }
        
        if rider_location:
            tracking_info['rider_location'] = {
                'latitude': float(rider_location.latitude),
                'longitude': float(rider_location.longitude),
                'timestamp': rider_location.timestamp,
                'distance_to_delivery': rider_location.distance_to(
                    self.delivery_address.latitude,
                    self.delivery_address.longitude
                ) if self.delivery_address.has_coordinates() else None
            }
        
        # Add order-specific delivery status
        if assignment.picked_up_at:
            tracking_info['picked_up_at'] = assignment.picked_up_at
        if assignment.delivered_at:
            tracking_info['delivered_at'] = assignment.delivered_at
        
        return tracking_info
    
    def can_be_batched(self):
        """Check if this order can be batched with other orders."""
        from api.delivery.models import OrderBatchingService
        
        # Check if order has coordinates
        if not self.delivery_address.has_coordinates():
            return False
        
        # Check if order is in a suitable status for batching
        if self.order_status not in [self.OrderStatus.PENDING, self.OrderStatus.ACCEPTED]:
            return False
        
        # Check if order already has a rider assignment
        if self.is_assigned_to_rider():
            return False
        
        return True
    
    def sync_delivery_status(self):
        """Synchronize order status with delivery assignment status."""
        assignment = self.get_current_rider_assignment()
        if not assignment:
            return
        
        # Sync pickup status
        if assignment.picked_up_at and self.order_status == self.OrderStatus.READY_FOR_PICKUP:
            self.order_status = self.OrderStatus.PICKED_UP
            self.save()
        
        # Sync delivery status
        if assignment.delivered_at and self.order_status == self.OrderStatus.PICKED_UP:
            self.order_status = self.OrderStatus.DELIVERED
            self.save()
    
    def update_delivery_status(self, new_status, sync_with_assignment=True):
        """Update order delivery status and optionally sync with rider assignment."""
        old_status = self.order_status
        self.order_status = new_status
        
        # Update delivery time if delivered
        if new_status == self.OrderStatus.DELIVERED:
            from django.utils import timezone
            self.actual_delivery = timezone.now()
        
        self.save()
        
        # Sync with rider assignment if requested
        if sync_with_assignment:
            self.sync_delivery_status()
        
        return {
            'old_status': old_status,
            'new_status': new_status,
            'updated_at': self.updated_at
        }
    
    def get_delivery_analytics(self):
        """Get delivery performance analytics for this order."""
        assignment = self.get_current_rider_assignment()
        if not assignment:
            return None
        
        # Calculate delivery metrics
        assigned_time = assignment.assignment.assigned_at
        pickup_time = assignment.picked_up_at
        delivery_time = assignment.delivered_at
        
        analytics = {
            'assignment_to_pickup_minutes': None,
            'pickup_to_delivery_minutes': None,
            'total_delivery_minutes': None,
            'rider_performance': None
        }
        
        if pickup_time and assigned_time:
            from django.utils import timezone
            pickup_delta = pickup_time - assigned_time
            analytics['assignment_to_pickup_minutes'] = pickup_delta.total_seconds() / 60
        
        if delivery_time and pickup_time:
            delivery_delta = delivery_time - pickup_time
            analytics['pickup_to_delivery_minutes'] = delivery_delta.total_seconds() / 60
        
        if delivery_time and assigned_time:
            total_delta = delivery_time - assigned_time
            analytics['total_delivery_minutes'] = total_delta.total_seconds() / 60
        
        # Get rider performance if available
        if assignment.assignment.rider:
            rider = assignment.assignment.rider
            analytics['rider_performance'] = {
                'total_deliveries': rider.total_deliveries,
                'average_rating': float(rider.average_rating),
                'total_earnings': float(rider.total_earnings)
            }
        
        return analytics
    
    def get_order_summary(self):
        """Get order summary for display."""
        return {
            'order_number': self.order_number,
            'customer_name': self.customer.full_name,
            'status': self.get_order_status_display(),
            'total_amount': self.total_amount,
            'item_count': self.order_lines.count(),
            'delivery_address': self.delivery_address.full_address,
            'created_at': self.created_at,
            'estimated_delivery': self.estimated_delivery,
        }
    
    def save(self, *args, **kwargs):
        """Override save to generate order number if not set."""
        if not self.order_number:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.order_number = f"ORD{timestamp}"
        
        super().save(*args, **kwargs)


class OrderLine(models.Model):
    """
    Individual items in each order.
    Links orders to pharmacy inventory items with quantity and pricing.
    """
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='order_lines',
        help_text=_('Parent order')
    )
    
    inventory_item = models.ForeignKey(
        'inventory.PharmacyInventory',  # Use 'app_label.ModelName' format
        on_delete=models.CASCADE,
        related_name='order_lines',
        help_text=_('Pharmacy inventory item')
    )
    
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text=_('Quantity ordered')
    )
    
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_('Price per unit at time of order')
    )
    
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_('Total price for this line')
    )
    
    # Prescription information
    prescription_required = models.BooleanField(
        default=False,
        help_text=_('Whether prescription is required for this item')
    )
    
    prescription_status = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        choices=[
            ('pending', _('Pending')),
            ('approved', _('Approved')),
            ('rejected', _('Rejected')),
        ],
        help_text=_('Prescription verification status')
    )
    
    prescription_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Notes about prescription verification')
    )
    
    # Item-specific notes
    notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Special instructions for this item')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('Order Line')
        verbose_name_plural = _('Order Lines')
        ordering = ['created_at']
        db_table = 'order_line'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['order'], name='idx_orderline_order'),
            models.Index(fields=['inventory_item'], name='idx_orderline_inventory'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(unit_price__gte=0),
                name='valid_orderline_unit_price'
            ),
            models.CheckConstraint(
                check=models.Q(total_price__gte=0),
                name='valid_orderline_total_price'
            ),
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - {self.inventory_item.display_name} x{self.quantity}"
    
    @property
    def line_total(self):
        """Calculate line total."""
        return self.unit_price * self.quantity
    
    @property
    def product_name(self):
        """Get product name."""
        return self.inventory_item.display_name
    
    @property
    def pharmacy_name(self):
        """Get pharmacy name."""
        return self.inventory_item.pharmacy.pharmacy_name
    
    def save(self, *args, **kwargs):
        """Override save to calculate total price."""
        if not self.total_price:
            self.total_price = self.line_total
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate order line data."""
        # Check if inventory item is available
        if not self.inventory_item.is_available:
            raise ValidationError(
                _('Inventory item is not available.')
            )
        
        # Check if sufficient stock
        if self.quantity > self.inventory_item.stock_quantity:
            raise ValidationError(
                _('Insufficient stock available.')
            )
        
        super().clean()
