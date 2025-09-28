"""
Thin import shim to expose order direct endpoints under api.direct.views_read namespace
without creating circular imports.
"""

from api.orders.direct_endpoints import direct_prescription_order_creation  # re-export
from api.orders.direct_endpoints import get_order_status  # re-export


