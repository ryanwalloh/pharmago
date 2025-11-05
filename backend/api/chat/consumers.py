"""
WebSocket consumer for real-time chat functionality.

Handles:
- Real-time message sending/receiving
- Typing indicators
- Read receipts
- User join/leave notifications
- Message delivery confirmations
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for order chat rooms.
    Each chat room has a channel: chat_room_{room_id}
    
    WebSocket URL: ws://localhost:8000/ws/chat/<room_id>/
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # Get room_id from URL route
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'chat_room_{self.room_id}'
            
            # Join chat room channel
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the WebSocket connection
            await self.accept()
            
            logger.info(f"✅ User connected to chat room {self.room_id}")
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'room_id': self.room_id,
                'message': 'Connected to chat room',
                'timestamp': timezone.now().isoformat()
            }))
            
            # Optionally broadcast user joined event to room
            # await self.channel_layer.group_send(
            #     self.room_group_name,
            #     {
            #         'type': 'user_joined',
            #         'user_id': self.scope.get('user_id'),  # If you add auth
            #     }
            # )
            
        except Exception as e:
            logger.error(f"❌ Error in chat WebSocket connect: {str(e)}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave chat room channel
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            logger.info(f"🔌 User disconnected from chat room {self.room_id} (code: {close_code})")
            
        except Exception as e:
            logger.error(f"❌ Error in chat WebSocket disconnect: {str(e)}", exc_info=True)
    
    async def receive(self, text_data):
        """
        Handle messages from client.
        
        Client can send:
        - {'type': 'chat_message', 'content': '...', 'sender_id': X}
        - {'type': 'typing', 'is_typing': true/false, 'sender_id': X}
        - {'type': 'mark_read', 'message_ids': [1, 2, 3]}
        - {'type': 'ping'}
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"📨 Received from client in room {self.room_id}: {message_type}")
            
            if message_type == 'ping':
                # Keepalive ping
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            
            elif message_type == 'chat_message':
                # New chat message
                content = data.get('content', '').strip()
                sender_id = data.get('sender_id')
                
                if not content:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'error': 'Message content cannot be empty'
                    }))
                    return
                
                # Save message to database
                message_data = await self.save_message(
                    room_id=self.room_id,
                    sender_id=sender_id,
                    content=content
                )
                
                if message_data:
                    # Broadcast message to everyone in the room
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message_broadcast',
                            'message': message_data
                        }
                    )
            
            elif message_type == 'typing':
                # Typing indicator
                is_typing = data.get('is_typing', False)
                sender_id = data.get('sender_id')
                sender_name = data.get('sender_name', 'User')
                
                # Broadcast typing status to others in room
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'typing_indicator',
                        'is_typing': is_typing,
                        'sender_id': sender_id,
                        'sender_name': sender_name,
                    }
                )
            
            elif message_type == 'mark_read':
                # Mark messages as read
                message_ids = data.get('message_ids', [])
                reader_id = data.get('reader_id')
                
                if message_ids:
                    await self.mark_messages_read(message_ids, reader_id)
                    
                    # Broadcast read receipts
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'messages_read',
                            'message_ids': message_ids,
                            'reader_id': reader_id,
                            'read_at': timezone.now().isoformat()
                        }
                    )
            
        except json.JSONDecodeError:
            logger.error(f"❌ Invalid JSON received in room {self.room_id}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"❌ Error processing message in room {self.room_id}: {str(e)}", exc_info=True)
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': 'Failed to process message'
            }))
    
    # ========== Event Handlers (triggered from backend) ==========
    
    async def chat_message_broadcast(self, event):
        """
        Broadcast chat message to all clients in room.
        Triggered when someone sends a message.
        """
        try:
            message_data = event['message']
            
            logger.debug(f"📤 Broadcasting message in room {self.room_id}")
            
            # Send message to WebSocket
            await self.send(text_data=json.dumps({
                'type': 'new_message',
                'message': message_data
            }))
            
        except Exception as e:
            logger.error(f"❌ Error broadcasting message: {str(e)}", exc_info=True)
    
    async def typing_indicator(self, event):
        """
        Send typing indicator to all clients.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'typing_status',
                'is_typing': event['is_typing'],
                'sender_id': event['sender_id'],
                'sender_name': event['sender_name'],
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending typing indicator: {str(e)}", exc_info=True)
    
    async def messages_read(self, event):
        """
        Broadcast read receipts to all clients.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'read_receipt',
                'message_ids': event['message_ids'],
                'reader_id': event['reader_id'],
                'read_at': event['read_at']
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending read receipt: {str(e)}", exc_info=True)
    
    async def user_joined(self, event):
        """
        Notify when a user joins the chat room.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event.get('user_id'),
                'user_name': event.get('user_name'),
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending user joined: {str(e)}", exc_info=True)
    
    async def user_left(self, event):
        """
        Notify when a user leaves the chat room.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event.get('user_id'),
                'user_name': event.get('user_name'),
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending user left: {str(e)}", exc_info=True)
    
    # ========== Database Operations ==========
    
    @database_sync_to_async
    def save_message(self, room_id, sender_id, content):
        """
        Save message to database.
        Returns message data for broadcasting.
        """
        try:
            from api.chat.models import ChatRoom, ChatMessage, ChatParticipant
            from api.users.models import User
            
            # Get chat room
            room = ChatRoom.objects.get(id=room_id)
            
            # Get or find sender participant
            # Note: In production, sender_id should come from authenticated user
            # For now, we'll try to find the participant
            if sender_id:
                try:
                    sender_user = User.objects.get(id=sender_id)
                    
                    # Try to get existing participant, or create if doesn't exist
                    sender_participant, created = ChatParticipant.objects.get_or_create(
                        room=room,
                        user=sender_user,
                        defaults={
                            'role': 'customer',  # Assume customer if not exists
                            'last_read_at': timezone.now()
                        }
                    )
                    
                    if created:
                        logger.info(f"✅ Auto-created participant for user {sender_id} in room {room_id}")
                    
                except User.DoesNotExist:
                    logger.error(f"User {sender_id} not found")
                    return None
            else:
                # Fallback: use first customer participant if sender_id not provided
                sender_participant = room.participants.filter(role='customer').first()
                if not sender_participant:
                    logger.error("No sender participant found")
                    return None
            
            # Create message
            message = ChatMessage.objects.create(
                room=room,
                sender=sender_participant,
                content=content,
                message_type='text'
            )
            
            # Update room's last activity
            room.last_activity = timezone.now()
            room.save()
            
            # Return message data for broadcasting
            return {
                'id': message.id,
                'room_id': room.id,
                'sender_id': sender_participant.user.id,
                'sender_name': sender_participant.user.get_full_name() or sender_participant.user.email,
                'sender_role': sender_participant.role,
                'content': message.content,
                'message_type': message.message_type,
                'timestamp': message.timestamp.isoformat(),
                'is_system_message': message.is_system_message,
            }
            
        except ChatRoom.DoesNotExist:
            logger.error(f"Chat room {room_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}", exc_info=True)
            return None
    
    @database_sync_to_async
    def mark_messages_read(self, message_ids, reader_id):
        """
        Mark messages as read in database.
        """
        try:
            from api.chat.models import ChatMessage
            
            messages = ChatMessage.objects.filter(
                id__in=message_ids,
                room_id=self.room_id
            )
            
            for message in messages:
                if message.status != ChatMessage.MessageStatus.READ:
                    message.mark_as_read()
            
            logger.info(f"Marked {len(message_ids)} messages as read by user {reader_id}")
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}", exc_info=True)

