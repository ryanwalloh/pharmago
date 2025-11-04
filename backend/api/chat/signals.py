"""
Django signals for real-time chat WebSocket broadcasting.

When messages are created via HTTP endpoints, these signals
ensure they're also broadcast via WebSocket to connected clients.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import ChatMessage

logger = logging.getLogger(__name__)


@receiver(post_save, sender=ChatMessage)
def broadcast_new_message(sender, instance, created, **kwargs):
    """
    When a new message is created (via HTTP or WebSocket),
    broadcast it to all connected WebSocket clients in the room.
    """
    if created:  # Only broadcast new messages, not updates
        try:
            channel_layer = get_channel_layer()
            room_group_name = f'chat_room_{instance.room.id}'
            
            # Prepare message data for broadcasting
            message_data = {
                'id': instance.id,
                'room_id': instance.room.id,
                'sender_id': instance.sender.user.id,
                'sender_name': instance.sender.user.get_full_name() or instance.sender.user.email,
                'sender_role': instance.sender.role,
                'content': instance.content,
                'message_type': instance.message_type,
                'timestamp': instance.timestamp.isoformat(),
                'is_system_message': instance.is_system_message,
            }
            
            # Broadcast to WebSocket group
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'chat_message_broadcast',
                    'message': message_data
                }
            )
            
            logger.info(f"📡 Broadcasted message {instance.id} to room {instance.room.id} via WebSocket")
            
        except Exception as e:
            logger.error(f"❌ Failed to broadcast message via WebSocket: {str(e)}", exc_info=True)
            # Don't raise exception - message is still saved in DB


def broadcast_typing_status(room_id, sender_id, sender_name, is_typing):
    """
    Helper function to broadcast typing status via WebSocket.
    Called from HTTP endpoints when users start/stop typing.
    
    Args:
        room_id: Chat room ID
        sender_id: User ID who is typing
        sender_name: Display name of user
        is_typing: True if user is typing, False if stopped
    """
    try:
        channel_layer = get_channel_layer()
        room_group_name = f'chat_room_{room_id}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'typing_indicator',
                'is_typing': is_typing,
                'sender_id': sender_id,
                'sender_name': sender_name,
            }
        )
        
        logger.debug(f"📡 Broadcasted typing status for user {sender_id} in room {room_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to broadcast typing status: {str(e)}", exc_info=True)


def broadcast_read_receipts(room_id, message_ids, reader_id):
    """
    Helper function to broadcast read receipts via WebSocket.
    Called from HTTP endpoints when messages are marked as read.
    
    Args:
        room_id: Chat room ID
        message_ids: List of message IDs that were read
        reader_id: User ID who read the messages
    """
    try:
        from django.utils import timezone
        channel_layer = get_channel_layer()
        room_group_name = f'chat_room_{room_id}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'messages_read',
                'message_ids': message_ids,
                'reader_id': reader_id,
                'read_at': timezone.now().isoformat()
            }
        )
        
        logger.debug(f"📡 Broadcasted read receipts for {len(message_ids)} messages in room {room_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to broadcast read receipts: {str(e)}", exc_info=True)

