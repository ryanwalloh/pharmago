"""
WebSocket consumer for real-time pharmacy order notifications.

Handles:
- New order notifications
- Order status updates
- Order cancellations
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class PharmacyOrdersConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for pharmacy order notifications.
    Each pharmacy has their own channel: pharmacy_orders_{pharmacy_id}
    
    WebSocket URL: ws://localhost:8000/ws/pharmacy/orders/<pharmacy_id>/
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # Get pharmacy_id from URL route
            self.pharmacy_id = self.scope['url_route']['kwargs']['pharmacy_id']
            self.room_group_name = f'pharmacy_orders_{self.pharmacy_id}'
            
            # Join pharmacy's order channel
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the WebSocket connection
            await self.accept()
            
            logger.info(f"✅ Pharmacy {self.pharmacy_id} connected to orders WebSocket")
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'pharmacy_id': self.pharmacy_id,
                'message': 'Connected to pharmacy orders channel',
            }))
            
        except Exception as e:
            logger.error(f"❌ Error in WebSocket connect: {str(e)}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave pharmacy's order channel
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            logger.info(f"🔌 Pharmacy {self.pharmacy_id} disconnected from orders WebSocket (code: {close_code})")
            
        except Exception as e:
            logger.error(f"❌ Error in WebSocket disconnect: {str(e)}", exc_info=True)
    
    async def receive(self, text_data):
        """Handle messages from pharmacy dashboard (e.g., ping for keep-alive)."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"📨 Received from pharmacy {self.pharmacy_id}: {message_type}")
            
            # Handle ping/pong for connection health check
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            
        except Exception as e:
            logger.error(f"❌ Error processing pharmacy message: {str(e)}", exc_info=True)
    
    # ========== Event Handlers (triggered from backend signals) ==========
    
    async def new_order(self, event):
        """
        Notify pharmacy of a new order.
        
        Event structure from backend:
        {
            'type': 'new_order',
            'order_data': {...}
        }
        """
        try:
            order_data = event['order_data']
            
            logger.info(f"📤 Sending new order notification to pharmacy {self.pharmacy_id}: Order #{order_data.get('id')}")
            
            # Send order notification to pharmacy's WebSocket
            await self.send(text_data=json.dumps({
                'type': 'new_order',
                'order': order_data
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending new order notification: {str(e)}", exc_info=True)
    
    async def order_updated(self, event):
        """
        Notify pharmacy of an order update.
        
        Event structure:
        {
            'type': 'order_updated',
            'order_id': 123,
            'update_data': {...}
        }
        """
        try:
            logger.info(f"📤 Sending order update to pharmacy {self.pharmacy_id}: Order #{event['order_id']}")
            
            await self.send(text_data=json.dumps({
                'type': 'order_updated',
                'order_id': event['order_id'],
                'update': event['update_data']
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending order update: {str(e)}", exc_info=True)
    
    async def order_cancelled(self, event):
        """
        Notify pharmacy that an order was cancelled.
        
        Event structure:
        {
            'type': 'order_cancelled',
            'order_id': 123,
            'reason': 'customer_cancelled'
        }
        """
        try:
            logger.info(f"🚫 Notifying pharmacy {self.pharmacy_id} of order cancellation: Order #{event['order_id']}")
            
            await self.send(text_data=json.dumps({
                'type': 'order_cancelled',
                'order_id': event['order_id'],
                'reason': event.get('reason', 'unknown')
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending cancellation notification: {str(e)}", exc_info=True)
    
    async def refresh_orders(self, event):
        """
        Tell pharmacy dashboard to refresh its order list.
        This is a lightweight alternative to sending full order data.
        
        Event structure:
        {
            'type': 'refresh_orders',
            'reason': 'new_order' | 'order_updated' | 'order_cancelled'
        }
        """
        try:
            logger.info(f"🔄 Sending refresh signal to pharmacy {self.pharmacy_id}")
            
            await self.send(text_data=json.dumps({
                'type': 'refresh_orders',
                'reason': event.get('reason', 'update')
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending refresh signal: {str(e)}", exc_info=True)

