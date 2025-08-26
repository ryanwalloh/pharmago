from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import ChatRoom, ChatParticipant, ChatMessage


class ChatRoomSerializer(serializers.ModelSerializer):
    """
    Main chat room serializer for CRUD operations.
    """
    
    # Computed fields
    is_active = serializers.ReadOnlyField()
    participant_count = serializers.ReadOnlyField()
    message_count = serializers.ReadOnlyField()
    last_message = serializers.ReadOnlyField()
    
    # Order information
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_status = serializers.CharField(source='order.get_status_display', read_only=True)
    
    # Room title
    room_title = serializers.CharField(source='get_room_title', read_only=True)
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'room_id', 'order', 'order_number', 'order_status', 'title',
            'description', 'status', 'is_public', 'max_participants', 'room_title',
            'created_at', 'closed_at', 'last_activity', 'is_active', 'participant_count',
            'message_count', 'last_message'
        ]
        read_only_fields = [
            'id', 'room_id', 'created_at', 'closed_at', 'last_activity',
            'is_active', 'participant_count', 'message_count', 'last_message',
            'order_number', 'order_status', 'room_title'
        ]
    
    def validate_max_participants(self, value):
        """Validate maximum participants."""
        if value < 2:
            raise ValidationError("Room must allow at least 2 participants.")
        if value > 50:
            raise ValidationError("Room cannot have more than 50 participants.")
        return value
    
    def validate(self, data):
        """Validate room data."""
        # Ensure title is provided if description is given
        if data.get('description') and not data.get('title'):
            raise ValidationError("Title is required when description is provided.")
        
        return data


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new chat rooms.
    """
    
    class Meta:
        model = ChatRoom
        fields = [
            'order', 'title', 'description', 'is_public', 'max_participants'
        ]
    
    def validate_order(self, value):
        """Validate order exists and is active."""
        if not value.is_active:
            raise ValidationError("Cannot create chat room for inactive order.")
        return value


class ChatRoomUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing chat rooms.
    """
    
    class Meta:
        model = ChatRoom
        fields = [
            'title', 'description', 'is_public', 'max_participants'
        ]
    
    def validate(self, data):
        """Validate update data."""
        # Don't allow updating closed or archived rooms
        if self.instance and self.instance.status != ChatRoom.RoomStatus.OPEN:
            raise ValidationError("Cannot update closed or archived rooms.")
        
        return data


class ChatRoomListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing chat rooms with essential information.
    """
    
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    room_title = serializers.CharField(source='get_room_title', read_only=True)
    participant_count = serializers.ReadOnlyField()
    message_count = serializers.ReadOnlyField()
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'room_id', 'order_number', 'room_title', 'status',
            'participant_count', 'message_count', 'last_message_preview',
            'last_activity', 'created_at'
        ]
    
    def get_last_message_preview(self, obj):
        """Get preview of last message."""
        last_message = obj.last_message
        if last_message:
            content = last_message.content
            return content[:100] + "..." if len(content) > 100 else content
        return "No messages yet"


class ChatRoomDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed chat room view.
    """
    
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_status = serializers.CharField(source='order.get_status_display', read_only=True)
    room_title = serializers.CharField(source='get_room_title', read_only=True)
    participant_count = serializers.ReadOnlyField()
    message_count = serializers.ReadOnlyField()
    last_message = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'room_id', 'order', 'order_number', 'order_status', 'title',
            'description', 'status', 'is_public', 'max_participants', 'room_title',
            'created_at', 'closed_at', 'last_activity', 'participant_count',
            'message_count', 'last_message', 'is_active'
        ]


class ChatParticipantSerializer(serializers.ModelSerializer):
    """
    Main chat participant serializer for CRUD operations.
    """
    
    # Computed fields
    is_online = serializers.ReadOnlyField()
    can_send_messages = serializers.ReadOnlyField()
    can_receive_messages = serializers.ReadOnlyField()
    
    # User information
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    
    # Role display
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = ChatParticipant
        fields = [
            'id', 'room', 'user', 'user_email', 'user_full_name', 'user_role',
            'role', 'role_display', 'is_active', 'is_muted', 'is_blocked',
            'joined_at', 'left_at', 'last_seen', 'notification_preferences',
            'is_online', 'can_send_messages', 'can_receive_messages'
        ]
        read_only_fields = [
            'id', 'joined_at', 'left_at', 'last_seen', 'is_online',
            'can_send_messages', 'can_receive_messages', 'user_email',
            'user_full_name', 'user_role', 'role_display'
        ]
    
    def validate(self, data):
        """Validate participant data."""
        # Check if user is already a participant in this room
        if self.instance is None:  # Creating new participant
            existing_participant = ChatParticipant.objects.filter(
                room=data['room'],
                user=data['user']
            ).first()
            
            if existing_participant:
                raise ValidationError("User is already a participant in this room.")
        
        return data


class ChatParticipantCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new chat participants.
    """
    
    class Meta:
        model = ChatParticipant
        fields = ['room', 'user', 'role', 'notification_preferences']


class ChatParticipantUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing chat participants.
    """
    
    class Meta:
        model = ChatParticipant
        fields = ['is_active', 'is_muted', 'is_blocked', 'notification_preferences']


class ChatParticipantListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing chat participants with essential information.
    """
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_online = serializers.ReadOnlyField()
    
    class Meta:
        model = ChatParticipant
        fields = [
            'id', 'user_email', 'user_full_name', 'role', 'role_display',
            'is_active', 'is_muted', 'is_blocked', 'joined_at', 'last_seen',
            'is_online'
        ]


class ChatMessageSerializer(serializers.ModelSerializer):
    """
    Main chat message serializer for CRUD operations.
    """
    
    # Computed fields
    sender_name = serializers.ReadOnlyField()
    sender_role = serializers.ReadOnlyField()
    is_system_message = serializers.ReadOnlyField()
    is_media_message = serializers.ReadOnlyField()
    can_be_edited = serializers.ReadOnlyField()
    can_be_deleted = serializers.ReadOnlyField()
    
    # Sender information
    sender_email = serializers.CharField(source='sender.user.email', read_only=True)
    sender_full_name = serializers.CharField(source='sender.user.get_full_name', read_only=True)
    
    # Message type display
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_email', 'sender_full_name',
            'message_type', 'message_type_display', 'content', 'file_path',
            'file_name', 'file_size', 'file_type', 'status', 'status_display',
            'is_edited', 'edited_at', 'is_deleted', 'deleted_at', 'reply_to',
            'metadata', 'timestamp', 'delivered_at', 'read_at', 'sender_name',
            'sender_role', 'is_system_message', 'is_media_message',
            'can_be_edited', 'can_be_deleted'
        ]
        read_only_fields = [
            'id', 'timestamp', 'delivered_at', 'read_at', 'sender_email',
            'sender_full_name', 'message_type_display', 'status_display',
            'sender_name', 'sender_role', 'is_system_message', 'is_media_message',
            'can_be_edited', 'can_be_deleted'
        ]
    
    def validate_content(self, value):
        """Validate message content."""
        if not value or not value.strip():
            raise ValidationError("Message content cannot be empty.")
        return value.strip()
    
    def validate_file_path(self, value):
        """Validate file path for media messages."""
        message_type = self.initial_data.get('message_type', 'text')
        if message_type in ['image', 'file'] and not value:
            raise ValidationError("File path is required for media messages.")
        return value
    
    def validate(self, data):
        """Validate message data."""
        # Ensure content is provided for text messages
        if data.get('message_type') == 'text' and not data.get('content'):
            raise ValidationError("Content is required for text messages.")
        
        # Ensure file path is provided for media messages
        if data.get('message_type') in ['image', 'file'] and not data.get('file_path'):
            raise ValidationError("File path is required for media messages.")
        
        return data


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new chat messages.
    """
    
    class Meta:
        model = ChatMessage
        fields = [
            'room', 'message_type', 'content', 'file_path', 'file_name',
            'file_size', 'file_type', 'reply_to', 'metadata'
        ]
    
    def validate(self, data):
        """Validate create data."""
        # Check if sender can send messages
        room = data['room']
        user = self.context['request'].user
        
        try:
            participant = ChatParticipant.objects.get(room=room, user=user)
            if not participant.can_send_messages:
                raise ValidationError("You cannot send messages in this room.")
        except ChatParticipant.DoesNotExist:
            raise ValidationError("You are not a participant in this room.")
        
        return data


class ChatMessageUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing chat messages.
    """
    
    class Meta:
        model = ChatMessage
        fields = ['content']
    
    def validate(self, data):
        """Validate update data."""
        # Check if message can be edited
        if not self.instance.can_be_edited:
            raise ValidationError("This message cannot be edited.")
        
        # Check if user is the sender
        if self.instance.sender.user != self.context['request'].user:
            raise ValidationError("You can only edit your own messages.")
        
        return data


class ChatMessageListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing chat messages with essential information.
    """
    
    sender_name = serializers.ReadOnlyField()
    sender_role = serializers.ReadOnlyField()
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    is_system_message = serializers.ReadOnlyField()
    is_media_message = serializers.ReadOnlyField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender_name', 'sender_role', 'message_type', 'message_type_display',
            'content', 'file_path', 'file_name', 'timestamp', 'is_edited',
            'is_deleted', 'reply_to', 'is_system_message', 'is_media_message'
        ]


class ChatMessageDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed chat message view.
    """
    
    sender_name = serializers.ReadOnlyField()
    sender_role = serializers.ReadOnlyField()
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_system_message = serializers.ReadOnlyField()
    is_media_message = serializers.ReadOnlyField()
    can_be_edited = serializers.ReadOnlyField()
    can_be_deleted = serializers.ReadOnlyField()
    
    # Sender information
    sender_email = serializers.CharField(source='sender.user.email', read_only=True)
    sender_full_name = serializers.CharField(source='sender.user.get_full_name', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_email', 'sender_full_name',
            'message_type', 'message_type_display', 'content', 'file_path',
            'file_name', 'file_size', 'file_type', 'status', 'status_display',
            'is_edited', 'edited_at', 'is_deleted', 'deleted_at', 'reply_to',
            'metadata', 'timestamp', 'delivered_at', 'read_at', 'sender_name',
            'sender_role', 'is_system_message', 'is_media_message',
            'can_be_edited', 'can_be_deleted'
        ]


class ChatRoomCreateWithParticipantsSerializer(serializers.Serializer):
    """
    Serializer for creating chat room with initial participants.
    """
    
    order_id = serializers.IntegerField(help_text="Order ID for the chat room")
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)
    is_public = serializers.BooleanField(default=False)
    max_participants = serializers.IntegerField(default=10, min_value=2, max_value=50)
    
    # Initial participants
    participants = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="List of initial participants with user_id and role"
    )
    
    def validate_order_id(self, value):
        """Validate order exists and is active."""
        from api.orders.models import Order
        
        try:
            order = Order.objects.get(id=value)
            if not order.is_active:
                raise ValidationError("Cannot create chat room for inactive order.")
        except Order.DoesNotExist:
            raise ValidationError("Order not found.")
        
        return value
    
    def validate_participants(self, value):
        """Validate participants data."""
        if value:
            for participant in value:
                if 'user_id' not in participant or 'role' not in participant:
                    raise ValidationError("Each participant must have user_id and role.")
                
                # Validate role
                valid_roles = [choice[0] for choice in ChatParticipant.ParticipantRole.choices]
                if participant['role'] not in valid_roles:
                    raise ValidationError(f"Invalid role: {participant['role']}")
        
        return value


class ChatMessageReplySerializer(serializers.Serializer):
    """
    Serializer for replying to a message.
    """
    
    content = serializers.CharField(help_text="Reply message content")
    message_type = serializers.ChoiceField(
        choices=ChatMessage.MessageType.choices,
        default='text'
    )
    
    def validate_content(self, value):
        """Validate reply content."""
        if not value or not value.strip():
            raise ValidationError("Reply content cannot be empty.")
        return value.strip()


class ChatRoomStatsSerializer(serializers.Serializer):
    """
    Serializer for chat room statistics.
    """
    
    total_participants = serializers.IntegerField()
    active_participants = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    messages_today = serializers.IntegerField()
    
    by_participant_role = serializers.DictField()
    by_message_type = serializers.DictField()
    recent_activity = serializers.ListField()


class ChatSearchSerializer(serializers.Serializer):
    """
    Serializer for chat search functionality.
    """
    
    query = serializers.CharField(max_length=100, help_text="Search query")
    room_id = serializers.IntegerField(required=False, help_text="Limit search to specific room")
    message_type = serializers.ChoiceField(
        choices=ChatMessage.MessageType.choices,
        required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    
    def validate(self, data):
        """Validate search data."""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise ValidationError("Date from must be before date to.")
        
        return data
