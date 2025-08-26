from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Main notification serializer for CRUD operations.
    """
    
    # Computed fields
    is_expired = serializers.ReadOnlyField()
    is_scheduled = serializers.ReadOnlyField()
    can_be_sent = serializers.ReadOnlyField()
    is_urgent = serializers.ReadOnlyField()
    is_high_priority = serializers.ReadOnlyField()
    
    # User information
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    # Content type information
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_email', 'user_full_name', 'title', 'message',
            'notification_type', 'priority', 'content_type', 'object_id',
            'delivery_methods', 'is_read', 'read_at', 'is_sent', 'sent_at',
            'metadata', 'action_url', 'action_text', 'expires_at', 'scheduled_for',
            'created_at', 'updated_at', 'is_expired', 'is_scheduled', 'can_be_sent',
            'is_urgent', 'is_high_priority', 'content_type_name'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_expired', 'is_scheduled',
            'can_be_sent', 'is_urgent', 'is_high_priority', 'user_email',
            'user_full_name', 'content_type_name'
        ]
    
    def validate_scheduled_for(self, value):
        """Validate scheduled time is in the future."""
        if value and value <= timezone.now():
            raise ValidationError("Scheduled time must be in the future.")
        return value
    
    def validate_expires_at(self, value):
        """Validate expiration time is after creation."""
        if value and value <= timezone.now():
            raise ValidationError("Expiration time must be in the future.")
        return value
    
    def validate(self, data):
        """Validate notification data."""
        # Ensure scheduled time is before expiration time
        scheduled_for = data.get('scheduled_for')
        expires_at = data.get('expires_at')
        
        if scheduled_for and expires_at and scheduled_for >= expires_at:
            raise ValidationError("Scheduled time must be before expiration time.")
        
        return data


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new notifications.
    """
    
    class Meta:
        model = Notification
        fields = [
            'user', 'title', 'message', 'notification_type', 'priority',
            'content_type', 'object_id', 'delivery_methods', 'metadata',
            'action_url', 'action_text', 'expires_at', 'scheduled_for'
        ]
    
    def validate_delivery_methods(self, value):
        """Validate delivery methods."""
        valid_methods = [choice[0] for choice in Notification.DeliveryMethod.choices]
        if value:
            for method in value:
                if method not in valid_methods:
                    raise ValidationError(f"Invalid delivery method: {method}")
        return value or [Notification.DeliveryMethod.IN_APP]


class NotificationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing notifications.
    """
    
    class Meta:
        model = Notification
        fields = [
            'title', 'message', 'priority', 'delivery_methods', 'metadata',
            'action_url', 'action_text', 'expires_at', 'scheduled_for'
        ]
    
    def validate(self, data):
        """Validate update data."""
        # Don't allow updating sent notifications
        if self.instance and self.instance.is_sent:
            raise ValidationError("Cannot update sent notifications.")
        
        return data


class NotificationListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing notifications with essential information.
    """
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user_email', 'title', 'message', 'notification_type',
            'notification_type_display', 'priority', 'priority_display',
            'is_read', 'is_sent', 'created_at', 'action_url', 'action_text'
        ]


class NotificationDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed notification view.
    """
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    
    # Computed properties
    is_expired = serializers.ReadOnlyField()
    is_scheduled = serializers.ReadOnlyField()
    can_be_sent = serializers.ReadOnlyField()
    is_urgent = serializers.ReadOnlyField()
    is_high_priority = serializers.ReadOnlyField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_email', 'user_full_name', 'title', 'message',
            'notification_type', 'notification_type_display', 'priority',
            'priority_display', 'content_type', 'object_id', 'content_type_name',
            'delivery_methods', 'is_read', 'read_at', 'is_sent', 'sent_at',
            'metadata', 'action_url', 'action_text', 'expires_at', 'scheduled_for',
            'created_at', 'updated_at', 'is_expired', 'is_scheduled', 'can_be_sent',
            'is_urgent', 'is_high_priority'
        ]


class NotificationBulkUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk updating notifications.
    """
    
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of notification IDs to update"
    )
    
    is_read = serializers.BooleanField(required=False)
    priority = serializers.ChoiceField(
        choices=Notification.Priority.choices,
        required=False
    )
    expires_at = serializers.DateTimeField(required=False)
    
    def validate_notification_ids(self, value):
        """Validate notification IDs."""
        if not value:
            raise ValidationError("At least one notification ID is required.")
        
        # Check if notifications exist and belong to user
        user = self.context['request'].user
        existing_ids = Notification.objects.filter(
            id__in=value,
            user=user
        ).values_list('id', flat=True)
        
        if len(existing_ids) != len(value):
            raise ValidationError("Some notification IDs are invalid or don't belong to you.")
        
        return value


class NotificationFilterSerializer(serializers.Serializer):
    """
    Serializer for filtering notifications.
    """
    
    notification_type = serializers.ChoiceField(
        choices=Notification.NotificationType.choices,
        required=False
    )
    
    priority = serializers.ChoiceField(
        choices=Notification.Priority.choices,
        required=False
    )
    
    is_read = serializers.BooleanField(required=False)
    is_sent = serializers.BooleanField(required=False)
    
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    
    search = serializers.CharField(required=False, max_length=100)
    
    def validate(self, data):
        """Validate filter data."""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise ValidationError("Date from must be before date to.")
        
        return data


class NotificationStatsSerializer(serializers.Serializer):
    """
    Serializer for notification statistics.
    """
    
    total_count = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    read_count = serializers.IntegerField()
    sent_count = serializers.IntegerField()
    failed_count = serializers.IntegerField()
    
    by_type = serializers.DictField()
    by_priority = serializers.DictField()
    by_date = serializers.ListField()
    
    recent_activity = serializers.ListField()
