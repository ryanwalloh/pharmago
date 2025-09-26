from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from django.core.cache import cache
from django.utils import timezone

from .models import Order, OrderLine


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


