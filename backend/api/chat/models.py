from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from api.users.models import User
from api.orders.models import Order


class ChatRoom(models.Model):
    """
    Chat rooms for order-related communication.
    Links customers, riders, and pharmacy staff for order discussions.
    """
    
    class RoomStatus(models.TextChoices):
        OPEN = 'open', _('Open')
        CLOSED = 'closed', _('Closed')
        ARCHIVED = 'archived', _('Archived')
    
    # Room identification
    room_id = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Unique chat room identifier')
    )
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='chat_rooms',
        help_text=_('Associated order')
    )
    
    # Room details
    title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Chat room title')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Room description')
    )
    
    status = models.CharField(
        max_length=20,
        choices=RoomStatus.choices,
        default=RoomStatus.OPEN,
        help_text=_('Chat room status')
    )
    
    # Room settings
    is_public = models.BooleanField(
        default=False,
        help_text=_('Whether room is public')
    )
    
    max_participants = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(2), MaxValueValidator(50)],
        help_text=_('Maximum number of participants')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When room was closed')
    )
    
    last_activity = models.DateTimeField(
        auto_now=True,
        help_text=_('Last activity timestamp')
    )
    
    class Meta:
        verbose_name = _('Chat Room')
        verbose_name_plural = _('Chat Rooms')
        ordering = ['-last_activity']
        db_table = 'chat_room'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['order'], name='idx_chatroom_order'),
            models.Index(fields=['status'], name='idx_chatroom_status'),
            models.Index(fields=['last_activity'], name='idx_chatroom_activity'),
        ]
    
    def __str__(self):
        if self.title:
            return f"{self.title} - Order #{self.order.order_number}"
        return f"Chat Room - Order #{self.order.order_number}"
    
    @property
    def is_active(self):
        """Check if chat room is active."""
        return self.status == self.RoomStatus.OPEN
    
    @property
    def participant_count(self):
        """Get current participant count."""
        return self.participants.count()
    
    @property
    def message_count(self):
        """Get total message count."""
        return self.messages.count()
    
    @property
    def last_message(self):
        """Get the last message in the room."""
        return self.messages.order_by('-timestamp').first()
    
    def get_room_title(self):
        """Get room title or generate default."""
        if self.title:
            return self.title
        
        # Generate title based on order
        return f"Order #{self.order.order_number} Chat"
    
    def add_participant(self, user, role):
        """Add a participant to the chat room."""
        if self.participant_count >= self.max_participants:
            raise ValueError("Room is at maximum capacity")
        
        participant, created = ChatParticipant.objects.get_or_create(
            room=self,
            user=user,
            defaults={'role': role}
        )
        return participant
    
    def remove_participant(self, user):
        """Remove a participant from the chat room."""
        try:
            participant = self.participants.get(user=user)
            participant.delete()
            return True
        except ChatParticipant.DoesNotExist:
            return False
    
    def close_room(self, reason=None):
        """Close the chat room."""
        if self.status == self.RoomStatus.OPEN:
            from django.utils import timezone
            self.status = self.RoomStatus.CLOSED
            self.closed_at = timezone.now()
            self.save()
    
    def archive_room(self):
        """Archive the chat room."""
        self.status = self.RoomStatus.ARCHIVED
        self.save()
    
    def get_participants_by_role(self, role):
        """Get participants by role."""
        return self.participants.filter(role=role)
    
    def get_customer_participants(self):
        """Get customer participants."""
        return self.get_participants_by_role('customer')
    
    def get_rider_participants(self):
        """Get rider participants."""
        return self.get_participants_by_role('rider')
    
    def get_pharmacy_participants(self):
        """Get pharmacy participants."""
        return self.get_participants_by_role('pharmacy')
    
    def get_admin_participants(self):
        """Get admin participants."""
        return self.get_participants_by_role('admin')
    
    def save(self, *args, **kwargs):
        """Override save to generate room ID if not set."""
        if not self.room_id:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.room_id = f"CHAT{timestamp}"
        
        super().save(*args, **kwargs)


class ChatParticipant(models.Model):
    """
    Users participating in chat rooms.
    Tracks participant roles and join/leave times.
    """
    
    class ParticipantRole(models.TextChoices):
        CUSTOMER = 'customer', _('Customer')
        RIDER = 'rider', _('Rider')
        PHARMACY = 'pharmacy', _('Pharmacy Staff')
        ADMIN = 'admin', _('Admin')
        SUPPORT = 'support', _('Support Staff')
    
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='participants',
        help_text=_('Chat room')
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_participations',
        help_text=_('Participating user')
    )
    
    role = models.CharField(
        max_length=20,
        choices=ParticipantRole.choices,
        help_text=_('Participant role in chat')
    )
    
    # Participant status
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether participant is active')
    )
    
    is_muted = models.BooleanField(
        default=False,
        help_text=_('Whether participant is muted')
    )
    
    is_blocked = models.BooleanField(
        default=False,
        help_text=_('Whether participant is blocked')
    )
    
    # Timestamps
    joined_at = models.DateTimeField(
        auto_now_add=True,
        help_text=_('When participant joined')
    )
    
    left_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When participant left')
    )
    
    last_seen = models.DateTimeField(
        auto_now=True,
        help_text=_('Last seen timestamp')
    )
    
    # Preferences
    notification_preferences = models.JSONField(
        default=dict,
        help_text=_('Notification preferences')
    )
    
    class Meta:
        verbose_name = _('Chat Participant')
        verbose_name_plural = _('Chat Participants')
        ordering = ['joined_at']
        db_table = 'chat_participant'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['room'], name='idx_participant_room'),
            models.Index(fields=['user'], name='idx_participant_user'),
            models.Index(fields=['role'], name='idx_participant_role'),
            models.Index(fields=['is_active'], name='idx_participant_active'),
        ]
        
        # Constraints
        constraints = [
            models.UniqueConstraint(
                fields=['room', 'user'],
                name='unique_room_participant'
            ),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.get_role_display()} in {self.room}"
    
    @property
    def is_online(self):
        """Check if participant is currently online."""
        from django.utils import timezone
        from datetime import timedelta
        
        # Consider online if last seen within last 5 minutes
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        return self.last_seen > five_minutes_ago
    
    @property
    def can_send_messages(self):
        """Check if participant can send messages."""
        return (self.is_active and 
                not self.is_muted and 
                not self.is_blocked and 
                self.room.is_active)
    
    @property
    def can_receive_messages(self):
        """Check if participant can receive messages."""
        return (self.is_active and 
                not self.is_blocked and 
                self.room.is_active)
    
    def leave_room(self):
        """Mark participant as left."""
        if self.is_active:
            from django.utils import timezone
            self.is_active = False
            self.left_at = timezone.now()
            self.save()
    
    def rejoin_room(self):
        """Rejoin the chat room."""
        if not self.is_active:
            self.is_active = True
            self.left_at = None
            self.save()
    
    def mute_participant(self):
        """Mute the participant."""
        self.is_muted = True
        self.save()
    
    def unmute_participant(self):
        """Unmute the participant."""
        self.is_muted = False
        self.save()
    
    def block_participant(self):
        """Block the participant."""
        self.is_blocked = True
        self.is_active = False
        self.save()
    
    def unblock_participant(self):
        """Unblock the participant."""
        self.is_blocked = False
        self.is_active = True
        self.save()
    
    def update_last_seen(self):
        """Update last seen timestamp."""
        self.save()  # This will trigger auto_now
    
    def get_notification_preference(self, key, default=True):
        """Get notification preference value."""
        return self.notification_preferences.get(key, default)
    
    def set_notification_preference(self, key, value):
        """Set notification preference value."""
        if not self.notification_preferences:
            self.notification_preferences = {}
        self.notification_preferences[key] = value
        self.save()


class ChatMessage(models.Model):
    """
    Individual messages in chat rooms.
    Stores message content, metadata, and delivery status.
    """
    
    class MessageType(models.TextChoices):
        TEXT = 'text', _('Text')
        IMAGE = 'image', _('Image')
        FILE = 'file', _('File')
        SYSTEM = 'system', _('System Message')
        ORDER_UPDATE = 'order_update', _('Order Update')
        DELIVERY_UPDATE = 'delivery_update', _('Delivery Update')
    
    class MessageStatus(models.TextChoices):
        SENT = 'sent', _('Sent')
        DELIVERED = 'delivered', _('Delivered')
        READ = 'read', _('Read')
        FAILED = 'failed', _('Failed')
    
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
        help_text=_('Chat room')
    )
    
    sender = models.ForeignKey(
        ChatParticipant,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        help_text=_('Message sender')
    )
    
    # Message content
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
        help_text=_('Type of message')
    )
    
    content = models.TextField(
        help_text=_('Message content')
    )
    
    # Media attachments
    file_path = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text=_('File path for non-text messages')
    )
    
    file_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Original file name')
    )
    
    file_size = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text=_('File size in bytes')
    )
    
    file_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('File MIME type')
    )
    
    # Message status and delivery
    status = models.CharField(
        max_length=20,
        choices=MessageStatus.choices,
        default=MessageStatus.SENT,
        help_text=_('Message delivery status')
    )
    
    is_edited = models.BooleanField(
        default=False,
        help_text=_('Whether message was edited')
    )
    
    edited_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When message was edited')
    )
    
    is_deleted = models.BooleanField(
        default=False,
        help_text=_('Whether message was deleted')
    )
    
    deleted_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When message was deleted')
    )
    
    # Metadata
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='replies',
        help_text=_('Message this is replying to')
    )
    
    metadata = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Additional message metadata')
    )
    
    # Timestamps
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text=_('Message timestamp')
    )
    
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When message was delivered')
    )
    
    read_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When message was read')
    )
    
    class Meta:
        verbose_name = _('Chat Message')
        verbose_name_plural = _('Chat Messages')
        ordering = ['timestamp']
        db_table = 'chat_message'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['room'], name='idx_message_room'),
            models.Index(fields=['sender'], name='idx_message_sender'),
            models.Index(fields=['timestamp'], name='idx_message_timestamp'),
            models.Index(fields=['message_type'], name='idx_message_type'),
            models.Index(fields=['status'], name='idx_message_status'),
        ]
    
    def __str__(self):
        return f"{self.sender.user.email}: {self.content[:50]}..."
    
    @property
    def sender_name(self):
        """Get sender's display name."""
        return self.sender.user.get_full_name() or self.sender.user.email
    
    @property
    def sender_role(self):
        """Get sender's role."""
        return self.sender.get_role_display()
    
    @property
    def is_system_message(self):
        """Check if this is a system message."""
        return self.message_type == self.MessageType.SYSTEM
    
    @property
    def is_media_message(self):
        """Check if this is a media message."""
        return self.message_type in [self.MessageType.IMAGE, self.MessageType.FILE]
    
    @property
    def can_be_edited(self):
        """Check if message can be edited."""
        return (not self.is_deleted and 
                self.message_type == self.MessageType.TEXT and
                not self.is_system_message)
    
    @property
    def can_be_deleted(self):
        """Check if message can be deleted."""
        return not self.is_deleted and not self.is_system_message
    
    def mark_as_delivered(self):
        """Mark message as delivered."""
        if self.status == self.MessageStatus.SENT:
            from django.utils import timezone
            self.status = self.MessageStatus.DELIVERED
            self.delivered_at = timezone.now()
            self.save()
    
    def mark_as_read(self):
        """Mark message as read."""
        if self.status == self.MessageStatus.DELIVERED:
            from django.utils import timezone
            self.status = self.MessageStatus.READ
            self.read_at = timezone.now()
            self.save()
    
    def mark_as_failed(self):
        """Mark message as failed."""
        self.status = self.MessageStatus.FAILED
        self.save()
    
    def edit_message(self, new_content):
        """Edit message content."""
        if not self.can_be_edited:
            raise ValueError("Message cannot be edited")
        
        from django.utils import timezone
        self.content = new_content
        self.is_edited = True
        self.edited_at = timezone.now()
        self.save()
    
    def delete_message(self):
        """Soft delete the message."""
        if not self.can_be_deleted:
            raise ValueError("Message cannot be deleted")
        
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
    
    def get_message_summary(self):
        """Get message summary for display."""
        return {
            'id': self.id,
            'sender': self.sender_name,
            'sender_role': self.sender_role,
            'content': self.content,
            'message_type': self.get_message_type_display(),
            'timestamp': self.timestamp,
            'status': self.get_status_display(),
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
            'reply_to': self.reply_to.id if self.reply_to else None,
        }
    
    def get_reply_chain(self):
        """Get the chain of replies to this message."""
        replies = []
        current_message = self
        
        while current_message.reply_to:
            replies.append(current_message.reply_to)
            current_message = current_message.reply_to
        
        return replies[::-1]  # Reverse to show in chronological order
    
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
    
    def clean(self):
        """Validate message data."""
        from django.core.exceptions import ValidationError
        
        # Ensure content is not empty for text messages
        if self.message_type == self.MessageType.TEXT and not self.content.strip():
            raise ValidationError(_('Text messages cannot be empty'))
        
        # Ensure file path is provided for media messages
        if self.message_type in [self.MessageType.IMAGE, self.MessageType.FILE] and not self.file_path:
            raise ValidationError(_('Media messages must have a file path'))
        
        super().clean()
    
    @classmethod
    def create_system_message(cls, room, content, metadata=None):
        """Create a system message."""
        # Get or create system participant
        system_user, created = User.objects.get_or_create(
            username='system',
            defaults={
                'email': 'system@pharmago.com',
                'role': 'admin',
                'is_active': False
            }
        )
        
        system_participant, created = ChatParticipant.objects.get_or_create(
            room=room,
            user=system_user,
            defaults={'role': 'admin'}
        )
        
        return cls.objects.create(
            room=room,
            sender=system_participant,
            message_type=cls.MessageType.SYSTEM,
            content=content,
            metadata=metadata or {}
        )
    
    @classmethod
    def create_order_update_message(cls, room, order, update_type, content):
        """Create an order update message."""
        # Get or create system participant
        system_user, created = User.objects.get_or_create(
            username='system',
            defaults={
                'email': 'system@pharmago.com',
                'role': 'admin',
                'is_active': False
            }
        )
        
        system_participant, created = ChatParticipant.objects.get_or_create(
            room=room,
            user=system_user,
            defaults={'role': 'admin'}
        )
        
        metadata = {
            'order_id': order.id,
            'order_number': order.order_number,
            'update_type': update_type
        }
        
        return cls.objects.create(
            room=room,
            sender=system_participant,
            message_type=cls.MessageType.ORDER_UPDATE,
            content=content,
            metadata=metadata
        )
