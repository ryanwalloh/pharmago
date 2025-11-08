"""
WebSocket notification service for order tracking.
Broadcasts updates to customers when order status changes or rider location updates.
"""
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


class OrderTrackingWebSocket:
    """Service for sending WebSocket updates to customers tracking their orders."""
    
    @staticmethod
    def notify_order_status_change(order_id, order_status, updated_at=None):
        """
        Notify customer that order status has changed.
        
        Args:
            order_id: The order ID
            order_status: New order status
            updated_at: When the status was updated
        """
        try:
            channel_layer = get_channel_layer()
            group_name = f'order_tracking_{order_id}'
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'order_status_update',
                    'order_id': order_id,
                    'order_status': order_status,
                    'updated_at': str(updated_at) if updated_at else None,
                }
            )
            
            logger.info(f"📡 Sent order status update via WebSocket: Order {order_id} → {order_status}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send WebSocket order status update: {str(e)}")
    
    @staticmethod
    def notify_rider_assigned(order_id, rider_info):
        """
        Notify customer that a rider has been assigned to their order.
        
        Args:
            order_id: The order ID
            rider_info: Dictionary with rider details (name, phone, vehicle)
        """
        try:
            channel_layer = get_channel_layer()
            group_name = f'order_tracking_{order_id}'
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'rider_assigned',
                    'order_id': order_id,
                    'rider_info': rider_info,
                }
            )
            
            logger.info(f"📡 Sent rider assignment via WebSocket: Order {order_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send WebSocket rider assignment: {str(e)}")
    
    @staticmethod
    def notify_rider_location(order_id, location):
        """
        Notify customer of rider's current location during delivery.
        
        Args:
            order_id: The order ID
            location: Dictionary with lat, lng, heading, speed, timestamp
        """
        try:
            channel_layer = get_channel_layer()
            group_name = f'order_tracking_{order_id}'
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'rider_location_update',
                    'order_id': order_id,
                    'location': location,
                }
            )
            
            # Only log occasionally to avoid spam
            # logger.debug(f"📍 Sent rider location via WebSocket: Order {order_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send WebSocket rider location: {str(e)}")
    
    @staticmethod
    def notify_order_complete(order_id, delivered_at=None):
        """
        Notify customer that order has been delivered.
        
        Args:
            order_id: The order ID
            delivered_at: When the order was delivered
        """
        try:
            channel_layer = get_channel_layer()
            group_name = f'order_tracking_{order_id}'
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'order_complete',
                    'order_id': order_id,
                    'delivered_at': str(delivered_at) if delivered_at else None,
                }
            )
            
            logger.info(f"📡 Sent order complete via WebSocket: Order {order_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send WebSocket order complete: {str(e)}")


# Convenience function for quick access
def broadcast_order_update(order_id, order_status, **kwargs):
    """Broadcast order status update to customer via WebSocket."""
    OrderTrackingWebSocket.notify_order_status_change(order_id, order_status, kwargs.get('updated_at'))


def broadcast_rider_location(order_id, latitude, longitude, heading=None, speed=None):
    """Broadcast rider location update to customer via WebSocket."""
    location = {
        'latitude': float(latitude),
        'longitude': float(longitude),
        'heading': float(heading) if heading else None,
        'speed': float(speed) if speed else None,
    }
    OrderTrackingWebSocket.notify_rider_location(order_id, location)


# ✅ NEW: Pharmacy Order Notifications
def broadcast_pharmacy_order_notification(pharmacy_id, order, event_type='new_order'):
    """
    Broadcast order notification to pharmacy dashboard via WebSocket.
    
    Args:
        pharmacy_id: The pharmacy ID
        order: Order instance
        event_type: Type of event ('new_order', 'order_updated', 'order_cancelled')
    """
    try:
        channel_layer = get_channel_layer()
        group_name = f'pharmacy_orders_{pharmacy_id}'
        
        # Use refresh signal for lightweight notification
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'refresh_orders',
                'reason': event_type,
            }
        )
        
        logger.info(f"📡 Sent pharmacy order notification via WebSocket: Pharmacy {pharmacy_id} → {event_type} (Order #{order.id})")
        
    except Exception as e:
        logger.error(f"❌ Failed to send WebSocket pharmacy order notification: {str(e)}")


# ✅ NEW: Rider Order Count Notifications
class RiderOrderCountWebSocket:
    """Service for broadcasting available order count updates to all riders."""
    
    @staticmethod
    def broadcast_order_count(count):
        """
        Broadcast updated order count to all connected riders.
        This replaces polling with real-time WebSocket updates.
        
        Args:
            count: Current count of available orders
        """
        try:
            channel_layer = get_channel_layer()
            group_name = 'rider_order_count'
            
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'order_count_update',
                    'count': count,
                }
            )
            
            logger.info(f"📡 Broadcasted order count update to all riders: {count}")
            
        except Exception as e:
            logger.error(f"❌ Failed to broadcast order count: {str(e)}")
    
    @staticmethod
    def get_current_count():
        """
        Calculate current available order count.
        Same logic as the polling endpoint.
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
            
            logger.debug(f"📦 Calculated available orders count: {count}")
            
            return count
            
        except Exception as e:
            logger.error(f"❌ Error calculating order count: {str(e)}", exc_info=True)
            return 0
    
    @staticmethod
    def broadcast_current_count():
        """
        Calculate and broadcast current order count.
        Convenience method that combines get_current_count() and broadcast_order_count().
        """
        count = RiderOrderCountWebSocket.get_current_count()
        RiderOrderCountWebSocket.broadcast_order_count(count)
        return count


# Convenience function for quick access
def broadcast_rider_order_count_update():
    """
    Calculate and broadcast updated order count to all riders.
    Call this whenever orders change status that affects availability.
    """
    return RiderOrderCountWebSocket.broadcast_current_count()