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

