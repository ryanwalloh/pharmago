"""
WebSocket URL routing for delivery/dispatch system and chat.
"""
from django.urls import re_path
from . import consumers
from api.chat import consumers as chat_consumers

websocket_urlpatterns = [
    # Rider dispatch channel
    # ws://localhost:8000/ws/rider/dispatch/<rider_id>/
    re_path(r'ws/rider/dispatch/(?P<rider_id>\d+)/$', consumers.DispatchConsumer.as_asgi()),
    
    # Customer order tracking channel
    # ws://localhost:8000/ws/order/tracking/<order_id>/
    re_path(r'ws/order/tracking/(?P<order_id>\d+)/$', consumers.OrderTrackingConsumer.as_asgi()),
    
    # Chat room channel (NEW!)
    # ws://localhost:8000/ws/chat/<room_id>/
    # wss://pharmago-backend-production.up.railway.app/ws/chat/<room_id>/
    re_path(r'ws/chat/(?P<room_id>\d+)/$', chat_consumers.ChatConsumer.as_asgi()),
    
    # Legacy rider orders channel (for backward compatibility)
    # ws://localhost:8000/ws/rider/orders/
    # This can be used for general order updates
    # re_path(r'ws/rider/orders/$', consumers.RiderOrdersConsumer.as_asgi()),
]

