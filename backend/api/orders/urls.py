from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, OrderLineViewSet, PrescriptionVerificationViewSet
)

# Create router and register viewsets
router = DefaultRouter()

# Orders
router.register(r'orders', OrderViewSet, basename='order')

# Order lines
router.register(r'order-lines', OrderLineViewSet, basename='order-line')

# Prescription verification
router.register(r'prescriptions', PrescriptionVerificationViewSet, basename='prescription-verification')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Custom endpoints for orders
    path('orders/', include([
        path('my-orders/', OrderViewSet.as_view({'get': 'my_orders'}), name='order-my-orders'),
        path('pharmacy-orders/', OrderViewSet.as_view({'get': 'pharmacy_orders'}), name='order-pharmacy-orders'),
        path('rider-orders/', OrderViewSet.as_view({'get': 'rider_orders'}), name='order-rider-orders'),
        path('pending/', OrderViewSet.as_view({'get': 'pending'}), name='order-pending'),
        path('preparing/', OrderViewSet.as_view({'get': 'preparing'}), name='order-preparing'),
        path('ready-for-pickup/', OrderViewSet.as_view({'get': 'ready_for_pickup'}), name='order-ready-for-pickup'),
        path('in-delivery/', OrderViewSet.as_view({'get': 'in_delivery'}), name='order-in-delivery'),
        path('completed/', OrderViewSet.as_view({'get': 'completed'}), name='order-completed'),
        path('cancelled/', OrderViewSet.as_view({'get': 'cancelled'}), name='order-cancelled'),
        path('search/', OrderViewSet.as_view({'get': 'search'}), name='order-search'),
        path('stats/', OrderViewSet.as_view({'get': 'stats'}), name='order-stats'),
        path('analytics/', OrderViewSet.as_view({'get': 'analytics'}), name='order-analytics'),
        path('export/', OrderViewSet.as_view({'get': 'export'}), name='order-export'),
    ])),
    
    # Custom endpoints for order lines
    path('order-lines/', include([
        path('verify-prescription/', OrderLineViewSet.as_view({'post': 'verify_prescription'}), name='orderline-verify-prescription'),
    ])),
    
    # Custom endpoints for prescription verification
    path('prescriptions/', include([
        path('pending/', PrescriptionVerificationViewSet.as_view({'get': 'pending'}), name='prescription-pending'),
        path('bulk-verify/', PrescriptionVerificationViewSet.as_view({'post': 'bulk_verify'}), name='prescription-bulk-verify'),
    ])),
]

# Add router URLs to main patterns
urlpatterns += router.urls
