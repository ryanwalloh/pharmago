from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for Notifications."""
    
    list_display = [
        'title', 'user_email', 'notification_type', 'priority', 'is_read', 
        'is_sent', 'delivery_methods_display', 'created_at'
    ]
    list_filter = [
        'notification_type', 'priority', 'is_read', 'is_sent', 'created_at'
    ]
    search_fields = [
        'title', 'message', 'user__email', 'user__first_name', 'user__last_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'read_at', 'sent_at', 'is_expired', 
        'is_scheduled', 'can_be_sent', 'notification_summary'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Notification Information', {
            'fields': ('user', 'title', 'message', 'notification_type', 'priority')
        }),
        ('Content Linking', {
            'fields': ('content_type', 'object_id', 'content_object')
        }),
        ('Delivery Settings', {
            'fields': ('delivery_methods', 'is_sent', 'sent_at')
        }),
        ('Read Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Action Information', {
            'fields': ('action_url', 'action_text')
        }),
        ('Scheduling & Expiration', {
            'fields': ('scheduled_for', 'expires_at', 'is_scheduled', 'is_expired')
        }),
        ('Additional Data', {
            'fields': ('metadata',)
        }),
        ('Status Information', {
            'fields': ('can_be_sent',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Notification Summary', {
            'fields': ('notification_summary',),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email or obj.user.phone_number
    user_email.short_description = 'User'
    
    def delivery_methods_display(self, obj):
        """Display delivery methods."""
        if obj.delivery_methods:
            return ', '.join(obj.delivery_methods)
        return 'Not specified'
    delivery_methods_display.short_description = 'Delivery Methods'
    
    def is_expired(self, obj):
        """Display if notification is expired."""
        return obj.is_expired
    is_expired.short_description = 'Expired'
    is_expired.boolean = True
    
    def is_scheduled(self, obj):
        """Display if notification is scheduled."""
        return obj.is_scheduled
    is_scheduled.short_description = 'Scheduled'
    is_scheduled.boolean = True
    
    def can_be_sent(self, obj):
        """Display if notification can be sent."""
        return obj.can_be_sent
    can_be_sent.short_description = 'Can Be Sent'
    can_be_sent.boolean = True
    
    def notification_summary(self, obj):
        """Display notification summary."""
        summary = obj.get_notification_summary()
        return format_html(
            '<strong>ID:</strong> {}<br>'
            '<strong>Title:</strong> {}<br>'
            '<strong>Type:</strong> {}<br>'
            '<strong>Priority:</strong> {}<br>'
            '<strong>Read:</strong> {}<br>'
            '<strong>Created:</strong> {}<br>'
            '<strong>Action URL:</strong> {}<br>'
            '<strong>Action Text:</strong> {}',
            summary['id'],
            summary['title'],
            summary['type'],
            summary['priority'],
            'Yes' if summary['is_read'] else 'No',
            summary['created_at'].strftime('%Y-%m-%d %H:%M'),
            summary['action_url'] or 'None',
            summary['action_text'] or 'None'
        )
    notification_summary.short_description = 'Summary'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user', 'content_type')
