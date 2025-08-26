from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError

from api.core.permissions import IsOwnerOrReadOnly
from .models import ChatRoom, ChatParticipant, ChatMessage
from .serializers import (
    ChatRoomSerializer, ChatRoomCreateSerializer, ChatRoomUpdateSerializer,
    ChatRoomListSerializer, ChatRoomDetailSerializer, ChatRoomCreateWithParticipantsSerializer,
    ChatParticipantSerializer, ChatParticipantCreateSerializer, ChatParticipantUpdateSerializer,
    ChatParticipantListSerializer, ChatMessageSerializer, ChatMessageCreateSerializer,
    ChatMessageUpdateSerializer, ChatMessageListSerializer, ChatMessageDetailSerializer,
    ChatMessageReplySerializer, ChatRoomStatsSerializer, ChatSearchSerializer
)


class ChatRoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat rooms.
    Provides CRUD operations, room management, and business logic.
    """
    
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_public']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'last_activity']
    ordering = ['-last_activity']
    
    def get_queryset(self):
        """Filter chat rooms by user participation."""
        user = self.request.user
        return ChatRoom.objects.filter(
            participants__user=user,
            participants__is_active=True
        ).distinct()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ChatRoomCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ChatRoomUpdateSerializer
        elif self.action == 'list':
            return ChatRoomListSerializer
        elif self.action == 'retrieve':
            return ChatRoomDetailSerializer
        elif self.action == 'create_with_participants':
            return ChatRoomCreateWithParticipantsSerializer
        elif self.action == 'stats':
            return ChatRoomStatsSerializer
        return ChatRoomSerializer
    
    def perform_create(self, serializer):
        """Create room and add creator as participant."""
        room = serializer.save()
        
        # Add creator as admin participant
        ChatParticipant.objects.create(
            room=room,
            user=self.request.user,
            role='admin'
        )
    
    @action(detail=False, methods=['post'])
    def create_with_participants(self, request):
        """Create chat room with initial participants."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get order
        from api.orders.models import Order
        order = Order.objects.get(id=serializer.validated_data['order_id'])
        
        # Create room
        room_data = {
            'order': order,
            'title': serializer.validated_data.get('title'),
            'description': serializer.validated_data.get('description'),
            'is_public': serializer.validated_data.get('is_public', False),
            'max_participants': serializer.validated_data.get('max_participants', 10)
        }
        
        room = ChatRoom.objects.create(**room_data)
        
        # Add creator as admin
        ChatParticipant.objects.create(
            room=room,
            user=request.user,
            role='admin'
        )
        
        # Add initial participants
        participants_data = serializer.validated_data.get('participants', [])
        for participant_data in participants_data:
            user_id = participant_data['user_id']
            role = participant_data['role']
            
            try:
                from api.users.models import User
                user = User.objects.get(id=user_id)
                ChatParticipant.objects.create(
                    room=room,
                    user=user,
                    role=role
                )
            except User.DoesNotExist:
                continue
        
        # Create system message
        ChatMessage.create_system_message(
            room=room,
            content=f"Chat room created for Order #{order.order_number}"
        )
        
        serializer = ChatRoomDetailSerializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def close_room(self, request, pk=None):
        """Close the chat room."""
        room = self.get_object()
        
        # Check if user has permission to close room
        participant = room.participants.get(user=request.user)
        if participant.role not in ['admin', 'pharmacy']:
            return Response({
                'error': 'Only admins and pharmacy staff can close rooms'
            }, status=status.HTTP_403_FORBIDDEN)
        
        room.close_room()
        
        # Create system message
        ChatMessage.create_system_message(
            room=room,
            content="Chat room has been closed"
        )
        
        return Response({
            'message': 'Room closed successfully',
            'status': room.status
        })
    
    @action(detail=True, methods=['post'])
    def archive_room(self, request, pk=None):
        """Archive the chat room."""
        room = self.get_object()
        
        # Check if user has permission to archive room
        participant = room.participants.get(user=request.user)
        if participant.role != 'admin':
            return Response({
                'error': 'Only admins can archive rooms'
            }, status=status.HTTP_403_FORBIDDEN)
        
        room.archive_room()
        
        return Response({
            'message': 'Room archived successfully',
            'status': room.status
        })
    
    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Get room participants."""
        room = self.get_object()
        participants = room.participants.filter(is_active=True)
        
        page = self.paginate_queryset(participants)
        if page is not None:
            serializer = ChatParticipantListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatParticipantListSerializer(participants, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get room messages."""
        room = self.get_object()
        messages = room.messages.filter(is_deleted=False)
        
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = ChatMessageListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatMessageListSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get room statistics."""
        room = self.get_object()
        
        # Basic counts
        total_participants = room.participants.count()
        active_participants = room.participants.filter(is_active=True).count()
        total_messages = room.messages.count()
        
        # Messages today
        today = timezone.now().date()
        messages_today = room.messages.filter(
            timestamp__date=today
        ).count()
        
        # Counts by participant role
        by_participant_role = room.participants.values('role').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Counts by message type
        by_message_type = room.messages.values('message_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recent activity (last 7 days)
        week_ago = timezone.now() - timezone.timedelta(days=7)
        recent_activity = room.messages.filter(
            timestamp__gte=week_ago
        ).values('timestamp__date').annotate(
            count=Count('id')
        ).order_by('timestamp__date')
        
        stats_data = {
            'total_participants': total_participants,
            'active_participants': active_participants,
            'total_messages': total_messages,
            'messages_today': messages_today,
            'by_participant_role': list(by_participant_role),
            'by_message_type': list(by_message_type),
            'recent_activity': list(recent_activity)
        }
        
        serializer = ChatRoomStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_rooms(self, request):
        """Get user's chat rooms."""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = ChatRoomListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatRoomListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active chat rooms."""
        queryset = self.get_queryset().filter(status='open')
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = ChatRoomListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatRoomListSerializer(queryset, many=True)
        return Response(serializer.data)


class ChatParticipantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat participants.
    Provides CRUD operations and participant control.
    """
    
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active', 'is_muted', 'is_blocked']
    ordering_fields = ['joined_at', 'last_seen']
    ordering = ['joined_at']
    
    def get_queryset(self):
        """Filter participants by user's rooms."""
        user = self.request.user
        return ChatParticipant.objects.filter(
            room__participants__user=user,
            room__participants__is_active=True
        ).distinct()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ChatParticipantCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ChatParticipantUpdateSerializer
        elif self.action == 'list':
            return ChatParticipantListSerializer
        return ChatParticipantSerializer
    
    def perform_create(self, serializer):
        """Create participant and handle room capacity."""
        room = serializer.validated_data['room']
        
        # Check room capacity
        if room.participant_count >= room.max_participants:
            raise ValidationError("Room is at maximum capacity")
        
        participant = serializer.save()
        
        # Create system message
        ChatMessage.create_system_message(
            room=room,
            content=f"{participant.user.get_full_name() or participant.user.email} joined the room"
        )
    
    @action(detail=True, methods=['post'])
    def leave_room(self, request, pk=None):
        """Leave the chat room."""
        participant = self.get_object()
        
        # Check if user is leaving their own participation
        if participant.user != request.user:
            return Response({
                'error': 'You can only leave your own participation'
            }, status=status.HTTP_403_FORBIDDEN)
        
        participant.leave_room()
        
        # Create system message
        ChatMessage.create_system_message(
            room=participant.room,
            content=f"{participant.user.get_full_name() or participant.user.email} left the room"
        )
        
        return Response({
            'message': 'Left room successfully',
            'is_active': participant.is_active
        })
    
    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        """Mute a participant."""
        participant = self.get_object()
        
        # Check if user has permission to mute
        room = participant.room
        user_participant = room.participants.get(user=request.user)
        
        if user_participant.role not in ['admin', 'pharmacy']:
            return Response({
                'error': 'Only admins and pharmacy staff can mute participants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        participant.mute_participant()
        
        return Response({
            'message': 'Participant muted successfully',
            'is_muted': participant.is_muted
        })
    
    @action(detail=True, methods=['post'])
    def unmute(self, request, pk=None):
        """Unmute a participant."""
        participant = self.get_object()
        
        # Check if user has permission to unmute
        room = participant.room
        user_participant = room.participants.get(user=request.user)
        
        if user_participant.role not in ['admin', 'pharmacy']:
            return Response({
                'error': 'Only admins and pharmacy staff can unmute participants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        participant.unmute_participant()
        
        return Response({
            'message': 'Participant unmuted successfully',
            'is_muted': participant.is_muted
        })
    
    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        """Block a participant."""
        participant = self.get_object()
        
        # Check if user has permission to block
        room = participant.room
        user_participant = room.participants.get(user=request.user)
        
        if user_participant.role != 'admin':
            return Response({
                'error': 'Only admins can block participants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        participant.block_participant()
        
        return Response({
            'message': 'Participant blocked successfully',
            'is_blocked': participant.is_blocked
        })
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        """Unblock a participant."""
        participant = self.get_object()
        
        # Check if user has permission to unblock
        room = participant.room
        user_participant = room.participants.get(user=request.user)
        
        if user_participant.role != 'admin':
            return Response({
                'error': 'Only admins can unblock participants'
            }, status=status.HTTP_403_FORBIDDEN)
        
        participant.unblock_participant()
        
        return Response({
            'message': 'Participant unblocked successfully',
            'is_blocked': participant.is_blocked
        })


class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat messages.
    Provides CRUD operations, messaging, and business logic.
    """
    
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['message_type', 'status', 'is_edited', 'is_deleted']
    search_fields = ['content']
    ordering_fields = ['timestamp', 'status']
    ordering = ['timestamp']
    
    def get_queryset(self):
        """Filter messages by user's rooms."""
        user = self.request.user
        return ChatMessage.objects.filter(
            room__participants__user=user,
            room__participants__is_active=True
        ).distinct()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ChatMessageCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ChatMessageUpdateSerializer
        elif self.action == 'list':
            return ChatMessageListSerializer
        elif self.action == 'retrieve':
            return ChatMessageDetailSerializer
        elif self.action == 'reply':
            return ChatMessageReplySerializer
        return ChatMessageSerializer
    
    def perform_create(self, serializer):
        """Create message and handle sender assignment."""
        # Get the participant for the current user in this room
        room = serializer.validated_data['room']
        participant = ChatParticipant.objects.get(room=room, user=self.request.user)
        
        message = serializer.save(sender=participant)
        
        # Mark as delivered for in-app messages
        message.mark_as_delivered()
        
        # Update room last activity
        room.save()  # This triggers auto_now on last_activity
    
    def perform_update(self, serializer):
        """Handle message update logic."""
        message = serializer.save()
        
        # Update room last activity
        message.room.save()
    
    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """Reply to a message."""
        original_message = self.get_object()
        serializer = ChatMessageReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create reply message
        room = original_message.room
        participant = ChatParticipant.objects.get(room=room, user=request.user)
        
        reply_message = ChatMessage.objects.create(
            room=room,
            sender=participant,
            message_type=serializer.validated_data['message_type'],
            content=serializer.validated_data['content'],
            reply_to=original_message
        )
        
        # Mark as delivered
        reply_message.mark_as_delivered()
        
        # Update room last activity
        room.save()
        
        serializer = ChatMessageDetailSerializer(reply_message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark message as read."""
        message = self.get_object()
        message.mark_as_read()
        
        return Response({
            'message': 'Message marked as read',
            'status': message.status,
            'read_at': message.read_at
        })
    
    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        """Edit message content."""
        message = self.get_object()
        new_content = request.data.get('content')
        
        if not new_content:
            return Response({
                'error': 'New content is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        message.edit_message(new_content)
        
        # Update room last activity
        message.room.save()
        
        return Response({
            'message': 'Message edited successfully',
            'content': message.content,
            'is_edited': message.is_edited,
            'edited_at': message.edited_at
        })
    
    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        """Soft delete message."""
        message = self.get_object()
        message.delete_message()
        
        return Response({
            'message': 'Message deleted successfully',
            'is_deleted': message.is_deleted
        })
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Search messages."""
        serializer = ChatSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        queryset = self.get_queryset()
        query = serializer.validated_data['query']
        room_id = serializer.validated_data.get('room_id')
        message_type = serializer.validated_data.get('message_type')
        date_from = serializer.validated_data.get('date_from')
        date_to = serializer.validated_data.get('date_to')
        
        # Apply search filters
        filters = Q(content__icontains=query)
        
        if room_id:
            filters &= Q(room_id=room_id)
        
        if message_type:
            filters &= Q(message_type=message_type)
        
        if date_from:
            filters &= Q(timestamp__date__gte=date_from)
        
        if date_to:
            filters &= Q(timestamp__date__lte=date_to)
        
        queryset = queryset.filter(filters)
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = ChatMessageListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatMessageListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_messages(self, request):
        """Get user's messages."""
        user = self.request.user
        queryset = ChatMessage.objects.filter(sender__user=user)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ChatMessageListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatMessageListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread messages."""
        user = self.request.user
        queryset = ChatMessage.objects.filter(
            room__participants__user=user,
            room__participants__is_active=True,
            status='delivered'
        ).exclude(
            sender__user=user
        ).distinct()
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ChatMessageListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ChatMessageListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all messages as read in a room."""
        room_id = request.data.get('room_id')
        
        if not room_id:
            return Response({
                'error': 'Room ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            room = ChatRoom.objects.get(id=room_id)
            participant = room.participants.get(user=request.user)
        except (ChatRoom.DoesNotExist, ChatParticipant.DoesNotExist):
            return Response({
                'error': 'Room not found or you are not a participant'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Mark all delivered messages as read
        updated_count = ChatMessage.objects.filter(
            room=room,
            status='delivered'
        ).exclude(
            sender=participant
        ).update(
            status='read',
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} messages marked as read',
            'updated_count': updated_count
        })
