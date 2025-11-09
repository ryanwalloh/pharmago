from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from asgiref.sync import sync_to_async
import logging

logger = logging.getLogger(__name__)


def _get_typing_state(cache, room_id):
    customer = bool(cache.get(f"chat_typing:{room_id}:customer"))
    pharmacy = bool(cache.get(f"chat_typing:{room_id}:pharmacy"))
    return {'customer': customer, 'pharmacy': pharmacy}


@csrf_exempt
async def get_or_create_order_chat_room(request):
    """
    Async endpoint to get or create a chat room for an order.
    Called when user opens chat for the first time.
    """
    try:
        import json
        from api.chat.models import ChatRoom
        from api.orders.models import Order

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        data = json.loads(request.body or '{}')
        order_id = data.get('order_id')
        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        # Wrap ORM operations in sync_to_async
        @sync_to_async
        def get_or_create_room():
            order = Order.objects.get(id=int(order_id))
            room, created = ChatRoom.objects.get_or_create(order=order)
            return room, created
        
        room, created = await get_or_create_room()
        logger.info(f"✅ Async: {'Created' if created else 'Retrieved'} chat room {room.id} for order {order_id}")
        
        return JsonResponse({'success': True, 'room_id': room.id, 'room_key': room.room_id})
    except Order.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)
    except Exception as e:
        logger.error(f"❌ Error creating/fetching chat room: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to create room', 'message': str(e)}, status=500)


@csrf_exempt
async def get_order_chat_messages(request):
    """
    Async endpoint to fetch chat messages for a room.
    Wrapped with sync_to_async to prevent blocking the event loop.
    """
    try:
        from api.chat.models import ChatRoom, ChatMessage

        room_id = request.GET.get('room_id')
        limit = int(request.GET.get('limit') or 50)
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        # Wrap ORM queries in sync_to_async to prevent blocking
        @sync_to_async
        def fetch_room_and_messages():
            room = ChatRoom.objects.select_related('order').get(id=int(room_id))
            messages_qs = ChatMessage.objects.filter(room=room).order_by('timestamp')
            messages = list(messages_qs[:limit])
            return room, messages
        
        room, messages = await fetch_room_and_messages()

        def serialize(msg):
            return {
                'id': msg.id,
                'sender_name': msg.sender_name,
                'sender_role': msg.sender_role,
                'sender_role_code': getattr(msg.sender, 'role', None),
                'message_type': msg.message_type,
                'content': msg.content,
                'file_path': msg.file_path,
                'timestamp': msg.timestamp.isoformat() if msg.timestamp else None,
                'is_system_message': msg.is_system_message,
                'status': getattr(msg, 'status', None),
                'delivered_at': msg.delivered_at.isoformat() if getattr(msg, 'delivered_at', None) else None,
                'read_at': msg.read_at.isoformat() if getattr(msg, 'read_at', None) else None,
            }

        logger.info(f"✅ Async: Fetched {len(messages)} messages for room {room.id}")
        
        return JsonResponse({
            'success': True,
            'room': {'id': room.id, 'room_id': room.room_id},
            'count': len(messages),
            'messages': [serialize(m) for m in messages],
        })
    except ChatRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)
    except Exception as e:
        logger.error(f"❌ Error fetching chat messages: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to fetch messages', 'message': str(e)}, status=500)


@csrf_exempt
async def mark_order_chat_messages_read(request):
    """
    Async endpoint to mark chat messages as read/delivered.
    Performs bulk updates, so async handling is important.
    """
    try:
        import json
        from django.utils import timezone
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        data = json.loads(request.body or '{}')
        room_id = data.get('room_id')
        pharmacy_id = data.get('pharmacy_id')
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        # Wrap all ORM operations in sync_to_async
        @sync_to_async
        def mark_messages_read():
            room = ChatRoom.objects.select_related('order__customer__user').get(id=int(room_id))

            acting_participant = None
            if pharmacy_id:
                pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
                acting_user = pharmacy.user
                acting_participant, _ = ChatParticipant.objects.get_or_create(
                    room=room, user=acting_user, defaults={'role': 'pharmacy'}
                )
            else:
                acting_user = room.order.customer.user
                acting_participant, _ = ChatParticipant.objects.get_or_create(
                    room=room, user=acting_user, defaults={'role': 'customer'}
                )

            now = timezone.now()
            delivered_count = (
                ChatMessage.objects
                .filter(room=room)
                .exclude(sender=acting_participant)
                .filter(delivered_at__isnull=True)
                .update(status='delivered', delivered_at=now)
            )
            read_count = (
                ChatMessage.objects
                .filter(room=room)
                .exclude(sender=acting_participant)
                .filter(read_at__isnull=True)
                .update(status='read', read_at=now)
            )
            
            return room, delivered_count, read_count
        
        room, delivered_count, read_count = await mark_messages_read()
        logger.info(f"✅ Async: Marked {read_count} messages as read in room {room.id}")

        return JsonResponse({
            'success': True,
            'room': {'id': room.id, 'room_id': room.room_id},
            'delivered_count': int(delivered_count),
            'read_count': int(read_count),
        })
    except Exception as e:
        logger.error(f"❌ Error marking messages as read: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to mark messages as read', 'message': str(e)}, status=500)


@csrf_exempt
async def set_order_chat_typing(request):
    """
    ⚠️ DEPRECATED: Typing indicators disabled system-wide (delivery system, not messaging app)
    Endpoint kept for backward compatibility but no longer used by frontend.
    Can be removed in future cleanup.
    
    Async endpoint to set typing indicator status.
    Called frequently during chat interactions.
    """
    try:
        import json
        from django.core.cache import cache
        from api.chat.models import ChatRoom, ChatParticipant
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        data = json.loads(request.body or '{}')
        room_id = data.get('room_id')
        pharmacy_id = data.get('pharmacy_id')
        is_typing = bool(data.get('is_typing', True))
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        # Wrap ORM operations in sync_to_async
        @sync_to_async
        def update_typing_state():
            room = ChatRoom.objects.select_related('order__customer__user').get(id=int(room_id))

            role = 'customer'
            if pharmacy_id:
                pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
                actor_user = pharmacy.user
                role = 'pharmacy'
            else:
                actor_user = room.order.customer.user if getattr(room.order, 'customer', None) else None

            if actor_user:
                ChatParticipant.objects.get_or_create(
                    room=room,
                    user=actor_user,
                    defaults={'role': role},
                )
            
            return room, role
        
        room, role = await update_typing_state()

        # Cache operations are generally thread-safe and don't need sync_to_async
        key = f"chat_typing:{room.id}:{role}"
        if is_typing:
            cache.set(key, True, timeout=7)
        else:
            cache.delete(key)

        return JsonResponse({
            'success': True,
            'room': {'id': room.id, 'room_id': room.room_id},
            'typing': {role: bool(is_typing)},
        })
    except Exception as e:
        logger.error(f"❌ Error setting typing state: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to set typing state', 'message': str(e)}, status=500)


@csrf_exempt
async def get_order_chat_typing_status(request):
    """
    ⚠️ DEPRECATED: Typing indicators disabled system-wide (delivery system, not messaging app)
    Endpoint kept for backward compatibility but no longer used by frontend.
    Can be removed in future cleanup.
    
    Async endpoint to fetch typing status for a chat room.
    This was polled frequently (causing connection issues), so async handling is critical.
    """
    try:
        from django.core.cache import cache
        from api.chat.models import ChatRoom

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'GET':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        room_id = request.GET.get('room_id')
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        # Wrap ORM query in sync_to_async
        room = await sync_to_async(ChatRoom.objects.get)(id=int(room_id))
        typing = _get_typing_state(cache, room.id)
        
        return JsonResponse({'success': True, 'room': {'id': room.id, 'room_id': room.room_id}, 'typing': typing})
    except ChatRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)
    except Exception as e:
        logger.error(f"❌ Error fetching typing status: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to fetch typing status', 'message': str(e)}, status=500)


@csrf_exempt
async def send_order_chat_message(request):
    """
    Async endpoint for pharmacy to send chat messages.
    Creates message and marks as delivered.
    """
    try:
        import json
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        data = json.loads(request.body or '{}')
        room_id = data.get('room_id')
        pharmacy_id = data.get('pharmacy_id')
        content = (data.get('content') or '').trim() if hasattr(str, 'trim') else (data.get('content') or '').strip()

        if not room_id or not pharmacy_id:
            return JsonResponse({'success': False, 'error': 'room_id and pharmacy_id are required'}, status=400)
        if not content:
            return JsonResponse({'success': False, 'error': 'content cannot be empty'}, status=400)

        # Wrap all ORM operations in sync_to_async
        @sync_to_async
        def create_message():
            room = ChatRoom.objects.get(id=int(room_id))
            pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
            sender_user = pharmacy.user

            participant, _ = ChatParticipant.objects.get_or_create(
                room=room,
                user=sender_user,
                defaults={'role': 'pharmacy'},
            )

            message = ChatMessage.objects.create(
                room=room,
                sender=participant,
                message_type='text',
                content=content,
            )

            try:
                message.mark_as_delivered()
            except Exception:
                pass
            
            return message
        
        message = await create_message()
        logger.info(f"✅ Async: Pharmacy sent message {message.id} in room {room_id}")

        return JsonResponse({'success': True, 'message': {
            'id': message.id,
            'sender_name': message.sender_name,
            'sender_role': message.sender_role,
            'message_type': message.message_type,
            'content': message.content,
            'timestamp': message.timestamp.isoformat() if message.timestamp else None,
            'is_system_message': message.is_system_message,
        }}, status=201)
    except Exception as e:
        logger.error(f"❌ Error sending pharmacy message: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to send message', 'message': str(e)}, status=500)


@csrf_exempt
async def send_order_chat_message_customer(request):
    """
    Async endpoint for customer to send chat messages.
    Creates message and marks as delivered.
    """
    try:
        import json
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        
        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        data = json.loads(request.body or '{}')
        room_id = data.get('room_id')
        content = (data.get('content') or '').strip()
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)
        if not content:
            return JsonResponse({'success': False, 'error': 'content cannot be empty'}, status=400)

        # Wrap all ORM operations in sync_to_async
        @sync_to_async
        def create_customer_message():
            room = ChatRoom.objects.select_related('order__customer__user').get(id=int(room_id))
            customer_user = room.order.customer.user
            participant, _ = ChatParticipant.objects.get_or_create(
                room=room,
                user=customer_user,
                defaults={'role': 'customer'},
            )

            message = ChatMessage.objects.create(
                room=room,
                sender=participant,
                message_type='text',
                content=content,
            )

            try:
                message.mark_as_delivered()
            except Exception:
                pass
            
            return message
        
        message = await create_customer_message()
        logger.info(f"✅ Async: Customer sent message {message.id} in room {room_id}")

        return JsonResponse({'success': True, 'message': {
            'id': message.id,
            'sender_name': message.sender_name,
            'sender_role': message.sender_role,
            'message_type': message.message_type,
            'content': message.content,
            'timestamp': message.timestamp.isoformat() if message.timestamp else None,
            'is_system_message': message.is_system_message,
        }}, status=201)
    except Exception as e:
        logger.error(f"❌ Error sending customer message: {str(e)}")
        return JsonResponse({'success': False, 'error': 'Failed to send message', 'message': str(e)}, status=500)


