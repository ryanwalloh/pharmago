"""
WebSocket consumers for real-time dispatch offers.

Riders connect to their personal dispatch channel to receive:
- New dispatch offers
- Offer cancellations (if another rider accepts)
- Offer updates
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class DispatchConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for rider dispatch offers.
    Each rider has their own channel: rider_dispatch_{rider_id}
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # Get rider_id from URL route
            self.rider_id = self.scope['url_route']['kwargs']['rider_id']
            self.room_group_name = f'rider_dispatch_{self.rider_id}'
            
            # Join rider's personal dispatch channel
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the WebSocket connection
            await self.accept()
            
            logger.info(f"✅ Rider {self.rider_id} connected to dispatch WebSocket")
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'rider_id': self.rider_id,
                'message': 'Connected to dispatch system'
            }))
            
        except Exception as e:
            logger.error(f"❌ Error in WebSocket connect: {str(e)}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave rider's dispatch channel
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            logger.info(f"🔌 Rider {self.rider_id} disconnected from dispatch WebSocket (code: {close_code})")
            
        except Exception as e:
            logger.error(f"❌ Error in WebSocket disconnect: {str(e)}", exc_info=True)
    
    async def receive(self, text_data):
        """Handle messages from rider (not currently used, but available for future features)."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.debug(f"📨 Received from rider {self.rider_id}: {message_type}")
            
            # For future: Handle rider messages if needed
            # e.g., "ping" for keep-alive, "status_update", etc.
            
        except Exception as e:
            logger.error(f"❌ Error processing rider message: {str(e)}", exc_info=True)
    
    # ========== Event Handlers (triggered from backend) ==========
    
    async def dispatch_offer(self, event):
        """
        Send dispatch offer to rider.
        Triggered when DispatchService sends an offer to this rider.
        
        Event structure from backend:
        {
            'type': 'dispatch_offer',
            'offer_data': {...}
        }
        """
        try:
            offer_data = event['offer_data']
            
            logger.info(f"📤 Sending dispatch offer to rider {self.rider_id}: {offer_data.get('offer_id')}")
            
            # Send offer to rider's WebSocket
            await self.send(text_data=json.dumps({
                'type': 'dispatch_offer',
                'offer': offer_data
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending dispatch offer: {str(e)}", exc_info=True)
    
    async def offer_cancelled(self, event):
        """
        Notify rider that their pending offer was cancelled.
        This happens when another rider accepts the same order.
        
        Event structure:
        {
            'type': 'offer_cancelled',
            'offer_id': 'OFFER_...',
            'reason': 'assigned_to_another_rider'
        }
        """
        try:
            logger.info(f"🚫 Notifying rider {self.rider_id} of offer cancellation")
            
            await self.send(text_data=json.dumps({
                'type': 'offer_cancelled',
                'offer_id': event['offer_id'],
                'reason': event.get('reason', 'unknown')
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending cancellation: {str(e)}", exc_info=True)
    
    async def offer_update(self, event):
        """
        Send offer update to rider (e.g., batch size changed).
        
        Event structure:
        {
            'type': 'offer_update',
            'offer_id': 'OFFER_...',
            'update_data': {...}
        }
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'offer_update',
                'offer_id': event['offer_id'],
                'update': event['update_data']
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending offer update: {str(e)}", exc_info=True)


class OrderTrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for customer order tracking.
    Each customer connects to their order's channel for real-time updates.
    Channel: order_tracking_{order_id}
    """
    
    async def connect(self):
        """Handle WebSocket connection for order tracking."""
        try:
            # Get order_id from URL route
            self.order_id = self.scope['url_route']['kwargs']['order_id']
            self.room_group_name = f'order_tracking_{self.order_id}'
            
            # Join order tracking channel
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the WebSocket connection
            await self.accept()
            
            logger.info(f"✅ Customer connected to order {self.order_id} tracking WebSocket")
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'order_id': self.order_id,
                'message': 'Connected to order tracking'
            }))
            
        except Exception as e:
            logger.error(f"❌ Error in order tracking WebSocket connect: {str(e)}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave order tracking channel
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            logger.info(f"🔌 Customer disconnected from order {self.order_id} tracking (code: {close_code})")
            
        except Exception as e:
            logger.error(f"❌ Error in order tracking disconnect: {str(e)}", exc_info=True)
    
    async def receive(self, text_data):
        """Handle messages from customer (ping for keep-alive)."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': json.dumps(str(__import__('django.utils').utils.timezone.now()), default=str)
                }))
            
        except Exception as e:
            logger.error(f"❌ Error processing customer message: {str(e)}", exc_info=True)
    
    # ========== Event Handlers (triggered from backend) ==========
    
    async def order_status_update(self, event):
        """
        Send order status update to customer.
        Triggered when order status changes.
        """
        try:
            logger.info(f"📤 Sending order status update to customer for order {self.order_id}")
            
            await self.send(text_data=json.dumps({
                'type': 'order_status_update',
                'order_id': self.order_id,
                'order_status': event['order_status'],
                'updated_at': event.get('updated_at'),
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending order status update: {str(e)}", exc_info=True)
    
    async def rider_assigned(self, event):
        """Notify customer that a rider has been assigned."""
        try:
            await self.send(text_data=json.dumps({
                'type': 'rider_assigned',
                'order_id': self.order_id,
                'rider_info': event['rider_info'],
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending rider assigned: {str(e)}", exc_info=True)
    
    async def rider_location_update(self, event):
        """
        Send rider location update to customer.
        Triggered when rider sends location updates during delivery.
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'rider_location_update',
                'order_id': self.order_id,
                'location': event['location'],
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending rider location: {str(e)}", exc_info=True)
    
    async def order_complete(self, event):
        """Notify customer that order is delivered."""
        try:
            await self.send(text_data=json.dumps({
                'type': 'order_complete',
                'order_id': self.order_id,
                'delivered_at': event.get('delivered_at'),
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending order complete: {str(e)}", exc_info=True)


class OrderCountConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for broadcasting available order count to all riders.
    All riders connect to the same channel: rider_order_count
    
    This provides real-time updates when the available order count changes,
    eliminating the need for polling.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # All riders join the same order count broadcast channel
            self.room_group_name = 'rider_order_count'
            
            # Join the order count channel
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the WebSocket connection
            await self.accept()
            
            logger.info(f"✅ Rider connected to order count WebSocket")
            
            # Send connection confirmation with current count
            current_count = await self.get_current_order_count()
            
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Connected to order count updates',
                'count': current_count
            }))
            
        except Exception as e:
            logger.error(f"❌ Error in order count WebSocket connect: {str(e)}", exc_info=True)
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Leave order count channel
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            logger.info(f"🔌 Rider disconnected from order count WebSocket (code: {close_code})")
            
        except Exception as e:
            logger.error(f"❌ Error in order count disconnect: {str(e)}", exc_info=True)
    
    async def receive(self, text_data):
        """Handle messages from rider (ping for keep-alive)."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Respond with current count
                current_count = await self.get_current_order_count()
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'count': current_count
                }))
            elif message_type == 'request_count':
                # Manual count request
                current_count = await self.get_current_order_count()
                await self.send(text_data=json.dumps({
                    'type': 'order_count_update',
                    'count': current_count
                }))
            
        except Exception as e:
            logger.error(f"❌ Error processing rider message: {str(e)}", exc_info=True)
    
    # ========== Event Handlers (triggered from backend) ==========
    
    async def order_count_update(self, event):
        """
        Send order count update to rider.
        Triggered when available order count changes.
        
        Event structure from backend:
        {
            'type': 'order_count_update',
            'count': 5
        }
        """
        try:
            count = event['count']
            
            logger.debug(f"📤 Broadcasting order count update: {count}")
            
            # Send count update to rider's WebSocket
            await self.send(text_data=json.dumps({
                'type': 'order_count_update',
                'count': count
            }))
            
        except Exception as e:
            logger.error(f"❌ Error sending order count update: {str(e)}", exc_info=True)
    
    # ========== Helper Methods ==========
    
    @database_sync_to_async
    def get_current_order_count(self):
        """
        Get current count of available orders.
        This is the same logic as the polling endpoint.
        """
        try:
            from api.orders.models import Order
            
            # Get orders that are accepted, preparing, or ready for pickup - but not assigned to a rider
            available_orders = Order.objects.filter(
                order_status__in=[
                    Order.OrderStatus.ACCEPTED,
                    Order.OrderStatus.PREPARING,
                    Order.OrderStatus.READY_FOR_PICKUP
                ]
            )
            
            # Filter out orders that already have rider assignments
            unassigned_orders = [order for order in available_orders if not order.is_assigned_to_rider()]
            
            count = len(unassigned_orders)
            
            logger.debug(f"📦 Current available orders count: {count}")
            
            return count
            
        except Exception as e:
            logger.error(f"❌ Error getting order count: {str(e)}", exc_info=True)
            return 0