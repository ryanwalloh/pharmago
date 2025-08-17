from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from api.users.models import User


class Notification(models.Model):
    """
    System notifications for users.
    Handles various types of notifications with flexible content linking.
    """
    
    class NotificationType(models.TextChoices):
        ORDER_UPDATE = 'order_update', _('Order Update')
        DELIVERY = 'delivery', _('Delivery')
        PAYMENT = 'payment', _('Payment')
        SYSTEM = 'system', _('System')
        PROMOTION = 'promotion', _('Promotion')
        SECURITY = 'security', _('Security')
        VERIFICATION = 'verification', _('Verification')
        SUPPORT = 'support', _('Support')
    
    class Priority(models.TextChoices):
        LOW = 'low', _('Low')
        NORMAL = 'normal', _('Normal')
        HIGH = 'high', _('High')
        URGENT = 'urgent', _('Urgent')
    
    class DeliveryMethod(models.TextChoices):
        IN_APP = 'in_app', _('In-App')
        EMAIL = 'email', _('Email')
        SMS = 'sms', _('SMS')
        PUSH = 'push', _('Push Notification')
    
    # Notification identification
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text=_('User to receive the notification')
    )
    
    # Content information
    title = models.CharField(
        max_length=255,
        help_text=_('Notification title')
    )
    
    message = models.TextField(
        help_text=_('Notification content')
    )
    
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        help_text=_('Type of notification')
    )
    
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        help_text=_('Notification priority level')
    )
    
    # Content linking (optional)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        help_text=_('Content type for linked object')
    )
    
    object_id = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text=_('ID of linked object')
    )
    
    content_object = GenericForeignKey(
        'content_type',
        'object_id'
    )
    
    # Delivery and status
    delivery_methods = models.JSONField(
        default=list,
        help_text=_('Methods used to deliver this notification')
    )
    
    is_read = models.BooleanField(
        default=False,
        help_text=_('Read status')
    )
    
    read_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When notification was read')
    )
    
    is_sent = models.BooleanField(
        default=False,
        help_text=_('Whether notification was sent')
    )
    
    sent_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When notification was sent')
    )
    
    # Additional data
    metadata = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Additional notification data')
    )
    
    action_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text=_('URL for notification action')
    )
    
    action_text = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Text for notification action button')
    )
    
    # Expiration and scheduling
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When notification expires')
    )
    
    scheduled_for = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When to send scheduled notification')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')
        ordering = ['-created_at']
        db_table = 'notification'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['user'], name='idx_notification_user'),
            models.Index(fields=['notification_type'], name='idx_notification_type'),
            models.Index(fields=['is_read'], name='idx_notification_read'),
            models.Index(fields=['priority'], name='idx_notification_priority'),
            models.Index(fields=['created_at'], name='idx_notification_created'),
            models.Index(fields=['scheduled_for'], name='idx_notification_scheduled'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(priority__in=['low', 'normal', 'high', 'urgent']),
                name='valid_notification_priority'
            ),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    @property
    def is_expired(self):
        """Check if notification has expired."""
        if self.expires_at:
            from django.utils import timezone
            return timezone.now() > self.expires_at
        return False
    
    @property
    def is_scheduled(self):
        """Check if notification is scheduled for future delivery."""
        if self.scheduled_for:
            from django.utils import timezone
            return timezone.now() < self.scheduled_for
        return False
    
    @property
    def can_be_sent(self):
        """Check if notification can be sent."""
        return not self.is_sent and not self.is_expired
    
    @property
    def is_urgent(self):
        """Check if notification is urgent priority."""
        return self.priority == self.Priority.URGENT
    
    @property
    def is_high_priority(self):
        """Check if notification is high or urgent priority."""
        return self.priority in [self.Priority.HIGH, self.Priority.URGENT]
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    def mark_as_unread(self):
        """Mark notification as unread."""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save()
    
    def mark_as_sent(self, delivery_method=None):
        """Mark notification as sent."""
        if not self.is_sent:
            from django.utils import timezone
            self.is_sent = True
            self.sent_at = timezone.now()
            
            if delivery_method:
                if not self.delivery_methods:
                    self.delivery_methods = []
                if delivery_method not in self.delivery_methods:
                    self.delivery_methods.append(delivery_method)
            
            self.save()
    
    def get_delivery_status(self):
        """Get delivery status for all methods."""
        status = {}
        for method in self.delivery_methods:
            status[method] = {
                'sent': self.is_sent,
                'sent_at': self.sent_at,
                'method': method
            }
        return status
    
    def get_action_data(self):
        """Get action data for the notification."""
        return {
            'url': self.action_url,
            'text': self.action_text,
            'type': self.notification_type,
            'priority': self.priority
        }
    
    def get_metadata_value(self, key, default=None):
        """Get value from metadata."""
        if self.metadata and key in self.metadata:
            return self.metadata[key]
        return default
    
    def set_metadata_value(self, key, value):
        """Set value in metadata."""
        if not self.metadata:
            self.metadata = {}
        self.metadata[key] = value
        self.save()
    
    def get_notification_summary(self):
        """Get notification summary for display."""
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.get_notification_type_display(),
            'priority': self.get_priority_display(),
            'is_read': self.is_read,
            'created_at': self.created_at,
            'action_url': self.action_url,
            'action_text': self.action_text,
        }
    
    def send_notification(self, delivery_methods=None):
        """Send notification through specified methods."""
        if delivery_methods is None:
            delivery_methods = [self.DeliveryMethod.IN_APP]
        
        # Mark as sent for in-app notifications
        if self.DeliveryMethod.IN_APP in delivery_methods:
            self.mark_as_sent(self.DeliveryMethod.IN_APP)
        
        # Here you would implement actual sending logic for other methods
        # For now, we'll just mark as sent
        for method in delivery_methods:
            if method != self.DeliveryMethod.IN_APP:
                # Implement email, SMS, push notification logic here
                pass
        
        return True
    
    def schedule_notification(self, scheduled_time):
        """Schedule notification for future delivery."""
        self.scheduled_for = scheduled_time
        self.save()
    
    def cancel_scheduled_notification(self):
        """Cancel scheduled notification."""
        self.scheduled_for = None
        self.save()
    
    def extend_expiration(self, new_expiration):
        """Extend notification expiration time."""
        self.expires_at = new_expiration
        self.save()
    
    def clean(self):
        """Validate notification data."""
        from django.core.exceptions import ValidationError
        
        # Ensure scheduled time is in the future
        if self.scheduled_for and self.scheduled_for <= self.created_at:
            raise ValidationError(
                _('Scheduled time must be in the future.')
            )
        
        # Ensure expiration time is after creation
        if self.expires_at and self.expires_at <= self.created_at:
            raise ValidationError(
                _('Expiration time must be after creation time.')
            )
        
        super().clean()
    
    @classmethod
    def create_notification(cls, user, title, message, notification_type='system', 
                          priority='normal', content_object=None, **kwargs):
        """Create a new notification with default values."""
        notification = cls.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            **kwargs
        )
        
        if content_object:
            notification.content_object = content_object
            notification.save()
        
        return notification
    
    @classmethod
    def create_order_notification(cls, user, order, status, **kwargs):
        """Create an order-related notification."""
        title = f"Order #{order.order_number} {status.title()}"
        message = f"Your order has been {status.lower()}. Order number: {order.order_number}"
        
        return cls.create_notification(
            user=user,
            title=title,
            message=message,
            notification_type='order_update',
            priority='normal',
            content_object=order,
            action_url=f"/orders/{order.id}",
            action_text="View Order",
            **kwargs
        )
    
    @classmethod
    def create_payment_notification(cls, user, payment, **kwargs):
        """Create a payment-related notification."""
        title = f"Payment {payment.get_payment_status_display()}"
        message = f"Your payment of {payment.currency} {payment.amount_paid} has been {payment.get_payment_status_display().lower()}"
        
        return cls.create_notification(
            user=user,
            title=title,
            message=message,
            notification_type='payment',
            priority='high',
            content_object=payment,
            action_url=f"/payments/{payment.id}",
            action_text="View Payment",
            **kwargs
        )
    
    @classmethod
    def create_system_notification(cls, user, title, message, priority='normal', **kwargs):
        """Create a system notification."""
        return cls.create_notification(
            user=user,
            title=title,
            message=message,
            notification_type='system',
            priority=priority,
            **kwargs
        )
