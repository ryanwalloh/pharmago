"""
WebSocket URL routing for delivery/dispatch system and chat.
"""
from django.urls import re_path
from . import consumers
from . import pharmacy_consumers
from api.chat import consumers as chat_consumers

websocket_urlpatterns = [
    # Rider dispatch channel
    # ws://localhost:8000/ws/rider/dispatch/<rider_id>/
    re_path(r'ws/rider/dispatch/(?P<rider_id>\d+)/$', consumers.DispatchConsumer.as_asgi()),
    
    # Rider self location channel (for navigation)
    # ws://localhost:8000/ws/rider/location/<rider_id>/
    re_path(r'ws/rider/location/(?P<rider_id>\d+)/$', consumers.RiderLocationConsumer.as_asgi()),
    
    # Rider order count channel (broadcast to all riders)
    # ws://localhost:8000/ws/rider/order-count/
    # wss://pharmago-backend-production.up.railway.app/ws/rider/order-count/
    re_path(r'ws/rider/order-count/$', consumers.OrderCountConsumer.as_asgi()),
    
    # Customer order tracking channel
    # ws://localhost:8000/ws/order/tracking/<order_id>/
    re_path(r'ws/order/tracking/(?P<order_id>\d+)/$', consumers.OrderTrackingConsumer.as_asgi()),
    
    # Pharmacy orders channel (NEW!)
    # ws://localhost:8000/ws/pharmacy/orders/<pharmacy_id>/
    # wss://pharmago-backend-production.up.railway.app/ws/pharmacy/orders/<pharmacy_id>/
    re_path(r'ws/pharmacy/orders/(?P<pharmacy_id>\d+)/$', pharmacy_consumers.PharmacyOrdersConsumer.as_asgi()),
    
    # Chat room channel
    # ws://localhost:8000/ws/chat/<room_id>/
    # wss://pharmago-backend-production.up.railway.app/ws/chat/<room_id>/
    re_path(r'ws/chat/(?P<room_id>\d+)/$', chat_consumers.ChatConsumer.as_asgi()),
    
    # Legacy rider orders channel (for backward compatibility)
    # ws://localhost:8000/ws/rider/orders/
    # This can be used for general order updates
    # re_path(r'ws/rider/orders/$', consumers.RiderOrdersConsumer.as_asgi()),
]

