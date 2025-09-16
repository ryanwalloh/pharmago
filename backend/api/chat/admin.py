from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import ChatRoom, ChatParticipant, ChatMessage


class ChatParticipantInline(admin.TabularInline):
    """Inline admin for Chat Participants."""
    model = ChatParticipant
    extra = 0
    readonly_fields = ['joined_at', 'last_seen', 'is_online']
    fields = [
        'user', 'role', 'is_active', 'is_muted', 'is_blocked', 
        'joined_at', 'last_seen', 'is_online'
    ]


class ChatMessageInline(admin.TabularInline):
    """Inline admin for Chat Messages."""
    model = ChatMessage
    extra = 0
    readonly_fields = ['timestamp', 'sender_name', 'sender_role']
    fields = [
        'sender', 'message_type', 'content', 'timestamp', 
        'sender_name', 'sender_role', 'status', 'is_edited', 'is_deleted'
    ]


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    """Admin interface for Chat Rooms."""
    
    list_display = [
        'room_id', 'order_number', 'title', 'status', 'participant_count', 
        'message_count', 'last_activity', 'created_at'
    ]
    list_filter = [
        'status', 'is_public', 'created_at', 'last_activity'
    ]
    search_fields = [
        'room_id', 'title', 'description', 'order__order_number'
    ]
    readonly_fields = [
        'room_id', 'created_at', 'closed_at', 'last_activity', 
        'participant_count', 'message_count', 'last_message'
    ]
    ordering = ['-last_activity']
    inlines = [ChatParticipantInline, ChatMessageInline]
    
    fieldsets = (
        ('Room Information', {
            'fields': ('room_id', 'order', 'title', 'description')
        }),
        ('Room Settings', {
            'fields': ('status', 'is_public', 'max_participants')
        }),
        ('Activity Information', {
            'fields': ('participant_count', 'message_count', 'last_message', 'last_activity')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'closed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def order_number(self, obj):
        """Display order number."""
        return obj.order.order_number
    order_number.short_description = 'Order Number'
    
    def participant_count(self, obj):
        """Display participant count."""
        return obj.participant_count
    participant_count.short_description = 'Participants'
    
    def message_count(self, obj):
        """Display message count."""
        return obj.message_count
    message_count.short_description = 'Messages'
    
    def last_message(self, obj):
        """Display last message."""
        last_msg = obj.last_message
        if last_msg:
            return f"{last_msg.sender_name}: {last_msg.content[:50]}..."
        return 'No messages'
    last_message.short_description = 'Last Message'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('order')


@admin.register(ChatParticipant)
class ChatParticipantAdmin(admin.ModelAdmin):
    """Admin interface for Chat Participants."""
    
    list_display = [
        'user_email', 'room_title', 'role', 'is_active', 'is_muted', 
        'is_blocked', 'is_online', 'joined_at', 'last_seen'
    ]
    list_filter = [
        'role', 'is_active', 'is_muted', 'is_blocked', 'joined_at'
    ]
    search_fields = [
        'user__email', 'user__first_name', 'user__last_name', 
        'room__title', 'room__room_id'
    ]
    readonly_fields = [
        'joined_at', 'left_at', 'last_seen', 'is_online', 
        'can_send_messages', 'can_receive_messages'
    ]
    ordering = ['-joined_at']
    
    fieldsets = (
        ('Participant Information', {
            'fields': ('room', 'user', 'role')
        }),
        ('Status', {
            'fields': ('is_active', 'is_muted', 'is_blocked')
        }),
        ('Capabilities', {
            'fields': ('can_send_messages', 'can_receive_messages'),
            'classes': ('collapse',)
        }),
        ('Activity', {
            'fields': ('joined_at', 'left_at', 'last_seen', 'is_online')
        }),
        ('Preferences', {
            'fields': ('notification_preferences',)
        }),
    )
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email or obj.user.phone_number
    user_email.short_description = 'User'
    
    def room_title(self, obj):
        """Display room title."""
        return obj.room.get_room_title()
    room_title.short_description = 'Room'
    
    def is_online(self, obj):
        """Display if participant is online."""
        return obj.is_online
    is_online.short_description = 'Online'
    is_online.boolean = True
    
    def can_send_messages(self, obj):
        """Display if participant can send messages."""
        return obj.can_send_messages
    can_send_messages.short_description = 'Can Send'
    can_send_messages.boolean = True
    
    def can_receive_messages(self, obj):
        """Display if participant can receive messages."""
        return obj.can_receive_messages
    can_receive_messages.short_description = 'Can Receive'
    can_receive_messages.boolean = True
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user', 'room')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin interface for Chat Messages."""
    
    list_display = [
        'room_title', 'sender_name', 'sender_role', 'message_type', 
        'content_preview', 'status', 'is_edited', 'is_deleted', 'timestamp'
    ]
    list_filter = [
        'message_type', 'status', 'is_edited', 'is_deleted', 'timestamp'
    ]
    search_fields = [
        'content', 'sender__user__email', 'sender__user__first_name', 
        'sender__user__last_name', 'room__title', 'room__room_id'
    ]
    readonly_fields = [
        'timestamp', 'delivered_at', 'read_at', 'edited_at', 'deleted_at',
        'sender_name', 'sender_role', 'is_system_message', 'is_media_message',
        'can_be_edited', 'can_be_deleted', 'message_summary'
    ]
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Message Information', {
            'fields': ('room', 'sender', 'message_type', 'content')
        }),
        ('Media Attachments', {
            'fields': ('file_path', 'file_name', 'file_size', 'file_type')
        }),
        ('Message Status', {
            'fields': ('status', 'is_edited', 'edited_at', 'is_deleted', 'deleted_at')
        }),
        ('Delivery Status', {
            'fields': ('delivered_at', 'read_at')
        }),
        ('Message Properties', {
            'fields': ('is_system_message', 'is_media_message', 'can_be_edited', 'can_be_deleted'),
            'classes': ('collapse',)
        }),
        ('Reply Information', {
            'fields': ('reply_to',)
        }),
        ('Metadata', {
            'fields': ('metadata',)
        }),
        ('Timestamps', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
        ('Message Summary', {
            'fields': ('message_summary',),
            'classes': ('collapse',)
        }),
    )
    
    def room_title(self, obj):
        """Display room title."""
        return obj.room.get_room_title()
    room_title.short_description = 'Room'
    
    def sender_name(self, obj):
        """Display sender name."""
        return obj.sender_name
    sender_name.short_description = 'Sender'
    
    def sender_role(self, obj):
        """Display sender role."""
        return obj.sender_role
    sender_role.short_description = 'Role'
    
    def content_preview(self, obj):
        """Display content preview."""
        if obj.is_deleted:
            return format_html('<em style="color: gray;">Message deleted</em>')
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content'
    
    def is_system_message(self, obj):
        """Display if this is a system message."""
        return obj.is_system_message
    is_system_message.short_description = 'System Message'
    is_system_message.boolean = True
    
    def is_media_message(self, obj):
        """Display if this is a media message."""
        return obj.is_media_message
    is_media_message.short_description = 'Media Message'
    is_media_message.boolean = True
    
    def can_be_edited(self, obj):
        """Display if message can be edited."""
        return obj.can_be_edited
    can_be_edited.short_description = 'Can Edit'
    can_be_edited.boolean = True
    
    def can_be_deleted(self, obj):
        """Display if message can be deleted."""
        return obj.can_be_deleted
    can_be_deleted.short_description = 'Can Delete'
    can_be_deleted.boolean = True
    
    def message_summary(self, obj):
        """Display message summary."""
        summary = obj.get_message_summary()
        return format_html(
            '<strong>ID:</strong> {}<br>'
            '<strong>Sender:</strong> {} ({})<br>'
            '<strong>Content:</strong> {}<br>'
            '<strong>Type:</strong> {}<br>'
            '<strong>Status:</strong> {}<br>'
            '<strong>Timestamp:</strong> {}<br>'
            '<strong>Edited:</strong> {}<br>'
            '<strong>Deleted:</strong> {}<br>'
            '<strong>Reply To:</strong> {}',
            summary['id'],
            summary['sender'],
            summary['sender_role'],
            summary['content'][:100] + '...' if len(summary['content']) > 100 else summary['content'],
            summary['message_type'],
            summary['status'],
            summary['timestamp'].strftime('%Y-%m-%d %H:%M'),
            'Yes' if summary['is_edited'] else 'No',
            'Yes' if summary['is_deleted'] else 'No',
            summary['reply_to'] or 'None'
        )
    message_summary.short_description = 'Summary'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related(
            'room', 'sender', 'sender__user', 'reply_to'
        )
