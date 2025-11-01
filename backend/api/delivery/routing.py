"""
WebSocket URL routing for delivery/dispatch system.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Rider dispatch channel
    # ws://localhost:8000/ws/rider/dispatch/<rider_id>/
    re_path(r'ws/rider/dispatch/(?P<rider_id>\d+)/$', consumers.DispatchConsumer.as_asgi()),
    
    # Customer order tracking channel
    # ws://localhost:8000/ws/order/tracking/<order_id>/
    re_path(r'ws/order/tracking/(?P<order_id>\d+)/$', consumers.OrderTrackingConsumer.as_asgi()),
    
    # Legacy rider orders channel (for backward compatibility)
    # ws://localhost:8000/ws/rider/orders/
    # This can be used for general order updates
    # re_path(r'ws/rider/orders/$', consumers.RiderOrdersConsumer.as_asgi()),
]

