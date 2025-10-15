from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.core.cache import cache
from django.utils import timezone
import logging

from .models import Order, OrderLine

logger = logging.getLogger(__name__)


def _bump_pharmacy_orders_version(pharmacy_ids):
    """Increment or bump a version marker for each pharmacy's orders stream."""
    if not pharmacy_ids:
        return
    now_str = timezone.now().isoformat()
    for pid in set([p for p in pharmacy_ids if p]):
        try:
            cache.set(f"orders:version:pharmacy:{pid}", now_str, timeout=60 * 60 * 24)
        except Exception:
            # Best-effort; ignore cache failures
            pass


def _get_pharmacy_ids_from_order(order: Order):
    try:
        lines = order.order_lines.select_related('inventory_item__pharmacy').all()
        return [getattr(getattr(l.inventory_item, 'pharmacy', None), 'id', None) for l in lines]
    except Exception:
        return []


@receiver(post_save, sender=Order)
def on_order_saved(sender, instance: Order, **kwargs):
    pharmacy_ids = _get_pharmacy_ids_from_order(instance)
    _bump_pharmacy_orders_version(pharmacy_ids)


@receiver(post_delete, sender=Order)
def on_order_deleted(sender, instance: Order, **kwargs):
    pharmacy_ids = _get_pharmacy_ids_from_order(instance)
    _bump_pharmacy_orders_version(pharmacy_ids)


@receiver(post_save, sender=OrderLine)
def on_orderline_saved(sender, instance: OrderLine, **kwargs):
    try:
        pid = getattr(getattr(instance.inventory_item, 'pharmacy', None), 'id', None)
        _bump_pharmacy_orders_version([pid])
    except Exception:
        pass


@receiver(post_delete, sender=OrderLine)
def on_orderline_deleted(sender, instance: OrderLine, **kwargs):
    try:
        pid = getattr(getattr(instance.inventory_item, 'pharmacy', None), 'id', None)
        _bump_pharmacy_orders_version([pid])
    except Exception:
        pass


# ========== DISPATCH SYSTEM AUTO-TRIGGER ==========

@receiver(post_save, sender=Order)
def auto_dispatch_on_order_acceptance(sender, instance: Order, created, **kwargs):
    """
    Automatically dispatch order to riders when status changes to 'accepted'.
    
    This signal is triggered when:
    - Customer approves the price quote from pharmacy
    - Order status changes to 'accepted'
    
    Safety checks prevent infinite loops and duplicate dispatches.
    """
    # DEBUG: Log every save
    logger.info(f"📝 Order saved: {instance.order_number} | created={created} | status={instance.order_status}")
    
    # Only trigger for existing orders (not newly created)
    if created:
        logger.debug(f"⏭️  Skipping new order {instance.order_number}")
        return
    
    # Only trigger when status is 'accepted'
    if instance.order_status != Order.OrderStatus.ACCEPTED:
        logger.debug(f"⏭️  Order {instance.order_number} status is {instance.order_status}, not 'accepted'")
        return
    
    # Safety check #1: Already assigned to a rider?
    if instance.is_assigned_to_rider():
        logger.debug(f"⏭️  Order {instance.order_number} already assigned, skipping dispatch")
        return
    
    # Safety check #2: Already in dispatch queue?
    from api.delivery.models import DispatchQueue
    existing_queue = DispatchQueue.objects.filter(
        order=instance,
        status__in=[
            DispatchQueue.QueueStatus.PENDING,
            DispatchQueue.QueueStatus.DISPATCHING
        ]
    ).exists()
    
    if existing_queue:
        logger.debug(f"⏭️  Order {instance.order_number} already in dispatch queue")
        return
    
    # All checks passed - trigger dispatch!
    try:
        from api.delivery.dispatch_service import DispatchService
        
        logger.info(f"🚀 Auto-dispatch triggered for order {instance.order_number}")
        
        # Dispatch in background (async recommended for production)
        success = DispatchService.dispatch_order(instance)
        
        if success:
            logger.info(f"✅ Dispatch initiated for {instance.order_number}")
        else:
            logger.warning(f"⚠️  Dispatch failed for {instance.order_number}")
            
    except Exception as e:
        logger.error(f"❌ Error in auto-dispatch signal: {str(e)}", exc_info=True)


