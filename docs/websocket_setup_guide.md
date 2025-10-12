# WebSocket Setup Guide for Real-Time Order Updates

This guide explains how to set up WebSocket support for real-time order count updates in the Rider app.

## Overview

The Rider app now supports **WebSocket connections** for instant order updates, with automatic fallback to HTTP polling if WebSocket is unavailable.

### Current Behavior:
- **Primary**: WebSocket connection for instant updates (⚡ LIVE badge - green)
- **Fallback**: HTTP polling every 15 seconds (LIVE badge - red)

## Frontend Implementation ✅ COMPLETE

The mobile app (`mobileapp/apps/rider-app/app/home/index.tsx`) is already configured with:
- WebSocket connection management
- Automatic reconnection (5-second retry)
- Fallback to polling when WebSocket unavailable
- Visual indicators for connection status

### Environment Variables

Set these in your Expo app for Railway deployment:

```bash
# Option 1: Direct WebSocket URL
EXPO_PUBLIC_WS_URL=wss://your-app.railway.app/ws/rider/orders/

# Option 2: Derive from API base
EXPO_PUBLIC_API_BASE=https://your-app.railway.app
```

## Backend Implementation (Django Channels)

### Step 1: Install Dependencies

```bash
pip install channels channels-redis daphne
```

Update `backend/requirements.txt`:
```txt
channels>=4.0.0
channels-redis>=4.1.0
daphne>=4.0.0
```

### Step 2: Update Django Settings

In `backend/pharmago/settings.py`:

```python
# Add to INSTALLED_APPS
INSTALLED_APPS = [
    'daphne',  # Must be first
    'django.contrib.admin',
    # ... other apps ...
    'channels',
]

# ASGI Application
ASGI_APPLICATION = 'pharmago.asgi.application'

# Channel Layers (using Redis for Railway)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.environ.get('REDIS_URL', 'redis://localhost:6379')],
        },
    },
}
```

### Step 3: Create ASGI Configuration

Create/update `backend/pharmago/asgi.py`:

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')

# Import your WebSocket consumer
from api.orders.consumers import RiderOrderConsumer

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path('ws/rider/orders/', RiderOrderConsumer.as_asgi()),
        ])
    ),
})
```

### Step 4: Create WebSocket Consumer

Create `backend/api/orders/consumers.py`:

```python
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from api.orders.models import Order

logger = logging.getLogger(__name__)


class RiderOrderConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time rider order updates.
    """
    
    async def connect(self):
        # Add this connection to the riders group
        self.group_name = 'rider_orders'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"✅ Rider connected to WebSocket: {self.channel_name}")
        
        # Send initial order count
        count = await self.get_available_orders_count()
        await self.send(text_data=json.dumps({
            'type': 'order_count_update',
            'count': count
        }))
    
    async def disconnect(self, close_code):
        # Remove from group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info(f"❌ Rider disconnected from WebSocket: {self.channel_name}")
    
    async def receive(self, text_data):
        # Handle messages from WebSocket
        try:
            data = json.loads(text_data)
            
            if data.get('type') == 'subscribe':
                # Send current count on subscription
                count = await self.get_available_orders_count()
                await self.send(text_data=json.dumps({
                    'type': 'order_count_update',
                    'count': count
                }))
        except Exception as e:
            logger.error(f"WebSocket receive error: {str(e)}")
    
    async def order_count_update(self, event):
        # Send order count update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'order_count_update',
            'count': event['count']
        }))
    
    @database_sync_to_async
    def get_available_orders_count(self):
        """Get count of unassigned orders."""
        available_orders = Order.objects.filter(
            order_status__in=[
                Order.OrderStatus.ACCEPTED,
                Order.OrderStatus.PREPARING,
                Order.OrderStatus.READY_FOR_PICKUP
            ]
        )
        
        unassigned_orders = [order for order in available_orders if not order.is_assigned_to_rider()]
        return len(unassigned_orders)
```

### Step 5: Add Signal to Broadcast Updates

Create `backend/api/orders/signals.py`:

```python
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from api.orders.models import Order
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order)
def broadcast_order_count_update(sender, instance, created, **kwargs):
    """
    Broadcast order count update via WebSocket when orders are created or updated.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        
        # Check if order status changed to something riders care about
        relevant_statuses = [
            Order.OrderStatus.ACCEPTED,
            Order.OrderStatus.PREPARING,
            Order.OrderStatus.READY_FOR_PICKUP,
            Order.OrderStatus.PICKED_UP,
        ]
        
        if instance.order_status in relevant_statuses or created:
            # Calculate new count
            available_orders = Order.objects.filter(
                order_status__in=[
                    Order.OrderStatus.ACCEPTED,
                    Order.OrderStatus.PREPARING,
                    Order.OrderStatus.READY_FOR_PICKUP
                ]
            )
            
            unassigned_orders = [order for order in available_orders if not order.is_assigned_to_rider()]
            count = len(unassigned_orders)
            
            # Broadcast to all riders
            async_to_sync(channel_layer.group_send)(
                'rider_orders',
                {
                    'type': 'order_count_update',
                    'count': count
                }
            )
            
            logger.info(f"📡 Broadcasted order count update: {count}")
    
    except Exception as e:
        logger.error(f"❌ Error broadcasting order count: {str(e)}")
```

Register signals in `backend/api/orders/apps.py`:

```python
from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.orders'

    def ready(self):
        import api.orders.signals  # Register signals
```

### Step 6: Railway Deployment

#### Procfile

Update your `Procfile`:

```
web: daphne pharmago.asgi:application --port $PORT --bind 0.0.0.0
```

#### Environment Variables on Railway

```bash
# Redis (add Redis service in Railway)
REDIS_URL=redis://default:password@redis.railway.internal:6379

# Django settings
DJANGO_SETTINGS_MODULE=pharmago.settings
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app
```

#### Railway Services

1. **Web Service** (Django with Channels)
   - Deploy from `backend/`
   - Uses `daphne` ASGI server
   
2. **Redis Service** (Required for Channels)
   - Add Redis from Railway marketplace
   - Link to web service
   - Will auto-populate `REDIS_URL`

## Testing

### Local Testing

1. Start Redis:
   ```bash
   docker run -p 6379:6379 redis:alpine
   ```

2. Run Django with Daphne:
   ```bash
   cd backend
   daphne pharmago.asgi:application --port 8000
   ```

3. Test WebSocket connection:
   ```bash
   wscat -c ws://localhost:8000/ws/rider/orders/
   ```

### Production Testing (Railway)

1. Open browser console on rider app
2. Look for logs:
   ```
   🔌 Connecting to WebSocket: wss://your-app.railway.app/ws/rider/orders/
   ✅ WebSocket connected
   📨 WebSocket message: {type: "order_count_update", count: 3}
   ```

3. Create a new order in admin/pharmacy app
4. Should see instant update: `⚡ [timestamp] WebSocket: Order count updated: 3 → 4`

## Monitoring

### Frontend Logs

- `✅ WebSocket connected` - Connection successful
- `⚡ [timestamp] WebSocket: Order count updated` - Instant update via WebSocket
- `📡 Polling (WebSocket disconnected)` - Fallback to polling
- `🔄 Attempting to reconnect WebSocket...` - Auto-reconnection

### Backend Logs

- `✅ Rider connected to WebSocket` - New connection
- `📡 Broadcasted order count update` - Signal triggered
- `❌ Rider disconnected from WebSocket` - Connection closed

## Visual Indicators

| Badge | Color | Meaning |
|-------|-------|---------|
| ⚡ LIVE | 🟢 Green | WebSocket connected - instant updates |
| LIVE | 🔴 Red | Polling mode - 15s intervals |

## Troubleshooting

### WebSocket not connecting

1. Check Redis is running
2. Verify `REDIS_URL` environment variable
3. Check Railway logs for ASGI errors
4. Ensure `daphne` is in requirements.txt

### Updates not broadcasting

1. Check signals are registered (`apps.py`)
2. Verify channel layer configuration
3. Check Redis connectivity
4. Look for signal errors in logs

### Polling still active

- This is normal! Polling runs as backup
- Only triggers if WebSocket disconnected
- Provides redundancy

## Performance Considerations

- **WebSocket**: Instant updates, lower latency, persistent connection
- **Polling**: 15s intervals, higher latency, HTTP overhead
- **Redis**: Required for channel layers, scales horizontally
- **Daphne**: ASGI server, handles both HTTP and WebSocket

## Next Steps

1. ✅ Frontend WebSocket client (DONE)
2. ⏳ Backend Django Channels setup (TODO)
3. ⏳ Railway deployment with Redis (TODO)
4. ⏳ Production testing (TODO)

## Resources

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [Railway WebSocket Support](https://docs.railway.app/guides/websockets)
- [Daphne Documentation](https://github.com/django/daphne)

