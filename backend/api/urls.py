from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from api.users.views import (
    UserViewSet, CustomerViewSet, PharmacyViewSet, RiderViewSet, DocumentUploadViewSet
)
from api.users.jwt_views import (
    jwt_login, jwt_refresh, jwt_logout, jwt_verify
)
from api.locations.views import AddressViewSet
from api.pharmacies.views import PharmacyViewSet as PharmacyViewSetV2, pharmacy_statistics, simple_pharmacy_statistics
from api.inventory.views import (
    MedicineCategoryViewSet, MedicineCatalogViewSet, PharmacyInventoryViewSet
)
from api.orders.views import (
    OrderViewSet, OrderLineViewSet, PrescriptionVerificationViewSet
)
from api.orders.enhanced_views import EnhancedOrderViewSet
from api.delivery.views import (
    DeliveryZoneViewSet, RiderAssignmentViewSet, RiderLocationViewSet, OrderRiderAssignmentViewSet
)
from api.payments.views import PaymentViewSet
from api.notifications.views import NotificationViewSet
from api.chat.views import ChatRoomViewSet, ChatParticipantViewSet, ChatMessageViewSet
from api.global_api.views import (
    SystemHealthViewSet, ApiUsageViewSet, GlobalSearchViewSet, 
    BulkOperationsViewSet, ExportImportViewSet, GlobalStatisticsViewSet, 
    BulkOperationLogViewSet, admin_login, admin_logout, admin_verify, admin_debug
)

# Create router and register viewsets
router = DefaultRouter()

# User management
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'pharmacies', PharmacyViewSet, basename='pharmacy')
router.register(r'riders', RiderViewSet, basename='rider')
router.register(r'document-uploads', DocumentUploadViewSet, basename='document-upload')

# Location management
router.register(r'addresses', AddressViewSet, basename='address')

# Pharmacy management (separate from user pharmacies)
router.register(r'pharmacy-profiles', PharmacyViewSetV2, basename='pharmacy-profile')

# Inventory management
router.register(r'medicine-categories', MedicineCategoryViewSet, basename='medicine-category')
router.register(r'medicine-catalog', MedicineCatalogViewSet, basename='medicine-catalog')
router.register(r'pharmacy-inventory', PharmacyInventoryViewSet, basename='pharmacy-inventory')

# Order management (moved to api.orders.urls to avoid duplication)

# Enhanced order management with delivery and payment integration
router.register(r'enhanced-orders', EnhancedOrderViewSet, basename='enhanced-order')

# Delivery management
router.register(r'delivery-zones', DeliveryZoneViewSet, basename='delivery-zone')
router.register(r'rider-assignments', RiderAssignmentViewSet, basename='rider-assignment')
router.register(r'rider-locations', RiderLocationViewSet, basename='rider-location')
router.register(r'order-rider-assignments', OrderRiderAssignmentViewSet, basename='order-rider-assignment')

# Payment management
router.register(r'payments', PaymentViewSet, basename='payment')

# Notification management
router.register(r'notifications', NotificationViewSet, basename='notification')

# Chat management
router.register(r'chat-rooms', ChatRoomViewSet, basename='chat-room')
router.register(r'chat-participants', ChatParticipantViewSet, basename='chat-participant')
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-message')

# Global API Infrastructure
router.register(r'system-health', SystemHealthViewSet, basename='system-health')
router.register(r'api-usage', ApiUsageViewSet, basename='api-usage')
router.register(r'global-search', GlobalSearchViewSet, basename='global-search')
router.register(r'bulk-operations', BulkOperationsViewSet, basename='bulk-operations')
router.register(r'export-import', ExportImportViewSet, basename='export-import')
router.register(r'global-statistics', GlobalStatisticsViewSet, basename='global-statistics')
router.register(r'bulk-operation-logs', BulkOperationLogViewSet, basename='bulk-operation-log')

# API URL patterns
urlpatterns = [
    # API v1 (remove duplicate api/v1/ prefix)
    path('v1/', include([
        # Main API endpoints
        path('', include(router.urls)),
        
        # Users and auth (delegated)
        path('', include('api.users.urls')),
        
        # User-specific endpoints
        path('users/', include([
            path('register/', UserViewSet.as_view({'post': 'register'}), name='user-register'),
            path('register-pharmacy/', UserViewSet.as_view({'post': 'register_pharmacy'}), name='pharmacy-register'),
            path('login/', UserViewSet.as_view({'post': 'login'}), name='user-login'),
            path('logout/', UserViewSet.as_view({'post': 'logout'}), name='user-logout'),
            path('profile/', UserViewSet.as_view({'get': 'profile'}), name='user-profile'),
            path('me/', UserViewSet.as_view({'get': 'me'}), name='user-me'),
            path('change-password/', UserViewSet.as_view({'put': 'change_password'}), name='user-change-password'),
            path('reset-password/', UserViewSet.as_view({'post': 'reset_password_request'}), name='user-reset-password'),
            path('reset-password-confirm/', UserViewSet.as_view({'post': 'reset_password_confirm'}), name='user-reset-password-confirm'),
        ])),
        
        # Locations (delegated)
        path('', include('api.locations.urls')),
        
        # Pharmacies (delegated)
        path('', include('api.pharmacies.urls')),
        
        # Address-specific endpoints
        path('addresses/', include([
            path('my-addresses/', AddressViewSet.as_view({'get': 'my_addresses'}), name='address-my-addresses'),
            path('default/', AddressViewSet.as_view({'get': 'default_address'}), name='address-default'),
            path('search/', AddressViewSet.as_view({'get': 'search'}), name='address-search'),
            path('nearby/', AddressViewSet.as_view({'get': 'nearby'}), name='address-nearby'),
            path('bulk-update/', AddressViewSet.as_view({'post': 'bulk_update'}), name='address-bulk-update'),
        ])),
        
        # Pharmacy profile endpoints
        path('pharmacy-profiles/', include([
            path('search/', PharmacyViewSetV2.as_view({'get': 'search'}), name='pharmacy-profile-search'),
            path('nearby/', PharmacyViewSetV2.as_view({'get': 'nearby'}), name='pharmacy-profile-nearby'),
            path('verified/', PharmacyViewSetV2.as_view({'get': 'verified'}), name='pharmacy-profile-verified'),
            path('pending-verification/', PharmacyViewSetV2.as_view({'get': 'pending_verification'}), name='pharmacy-profile-pending-verification'),
        ])),
        
        # Inventory (delegated to per-app urls; existing top-level router names preserved)
        path('inventory/', include(('api.inventory.urls', 'inventory'), namespace='inventory')),
        
        # Orders (router + custom endpoints consolidated in api.orders.urls)
        path('', include('api.orders.urls')),

        # Individual order delivery and payment endpoints
        path('orders/<int:pk>/', include([
            path('assign-rider/', EnhancedOrderViewSet.as_view({'post': 'assign_rider'}), name='order-assign-rider'),
            path('batch-with-orders/', EnhancedOrderViewSet.as_view({'post': 'batch_with_orders'}), name='order-batch-with-orders'),
            path('create-payment/', EnhancedOrderViewSet.as_view({'post': 'create_payment'}), name='order-create-payment'),
            path('delivery-tracking/', EnhancedOrderViewSet.as_view({'get': 'delivery_tracking'}), name='order-delivery-tracking'),
            path('payment-history/', EnhancedOrderViewSet.as_view({'get': 'payment_history'}), name='order-payment-history'),
        ])),

        
        # Enhanced order endpoints with delivery and payment integration
        path('enhanced-orders/', include([
            path('with-delivery-status/', EnhancedOrderViewSet.as_view({'get': 'with_delivery_status'}), name='enhanced-order-delivery-status'),
            path('with-payment-status/', EnhancedOrderViewSet.as_view({'get': 'with_payment_status'}), name='enhanced-order-payment-status'),
            path('delivery-ready/', EnhancedOrderViewSet.as_view({'get': 'delivery_ready'}), name='enhanced-order-delivery-ready'),
            path('in-delivery/', EnhancedOrderViewSet.as_view({'get': 'in_delivery'}), name='enhanced-order-in-delivery'),
            path('delivery-completed/', EnhancedOrderViewSet.as_view({'get': 'delivery_completed'}), name='enhanced-order-delivery-completed'),
            path('delivery-analytics/', EnhancedOrderViewSet.as_view({'get': 'delivery_analytics'}), name='enhanced-order-delivery-analytics'),
            path('payment-analytics/', EnhancedOrderViewSet.as_view({'get': 'payment_analytics'}), name='enhanced-order-payment-analytics'),
            path('bulk-update-status/', EnhancedOrderViewSet.as_view({'post': 'bulk_update_status'}), name='enhanced-order-bulk-update'),
            path('export-delivery-data/', EnhancedOrderViewSet.as_view({'get': 'export_delivery_data'}), name='enhanced-order-export-delivery'),
        ])),
        
        # Delivery endpoints
        path('delivery/', include([
            path('zones/', include([
                path('active/', DeliveryZoneViewSet.as_view({'get': 'active'}), name='delivery-zone-active'),
                path('by-location/', DeliveryZoneViewSet.as_view({'get': 'by_location'}), name='delivery-zone-by-location'),
            ])),
            
            # Individual delivery zone endpoints
            path('zones/<int:pk>/', include([
                path('toggle-status/', DeliveryZoneViewSet.as_view({'post': 'toggle_status'}), name='delivery-zone-toggle-status'),
            ])),
            path('assignments/', include([
                path('my-assignments/', RiderAssignmentViewSet.as_view({'get': 'my_assignments'}), name='rider-assignment-my'),
                path('active/', RiderAssignmentViewSet.as_view({'get': 'active'}), name='rider-assignment-active'),
                path('completed/', RiderAssignmentViewSet.as_view({'get': 'completed'}), name='rider-assignment-completed'),
                path('cancelled/', RiderAssignmentViewSet.as_view({'get': 'cancelled'}), name='rider-assignment-cancelled'),
                path('bulk-assign/', RiderAssignmentViewSet.as_view({'post': 'bulk_assign'}), name='rider-assignment-bulk'),
                path('analytics/', RiderAssignmentViewSet.as_view({'get': 'analytics'}), name='rider-assignment-analytics'),
            ])),
            path('locations/', include([
                path('current/', RiderLocationViewSet.as_view({'get': 'current'}), name='rider-location-current'),
                path('by-assignment/', RiderLocationViewSet.as_view({'get': 'by_assignment'}), name='rider-location-by-assignment'),
                path('nearby-riders/', RiderLocationViewSet.as_view({'get': 'nearby_riders'}), name='rider-location-nearby'),
            ])),
            path('order-assignments/', include([
                path('batch-orders/', OrderRiderAssignmentViewSet.as_view({'post': 'batch_orders'}), name='order-rider-batch'),
            ])),
        ])),
        
        # Individual rider assignment endpoints
        path('rider-assignments/<int:pk>/', include([
            path('accept/', RiderAssignmentViewSet.as_view({'post': 'accept'}), name='rider-assignment-accept'),
            path('pickup/', RiderAssignmentViewSet.as_view({'post': 'pickup'}), name='rider-assignment-pickup'),
            path('start-delivery/', RiderAssignmentViewSet.as_view({'post': 'start_delivery'}), name='rider-assignment-start-delivery'),
            path('complete/', RiderAssignmentViewSet.as_view({'post': 'complete'}), name='rider-assignment-complete'),
            path('cancel/', RiderAssignmentViewSet.as_view({'post': 'cancel'}), name='rider-assignment-cancel'),
        ])),
        
        # Individual order-rider assignment endpoints
        path('order-rider-assignments/<int:pk>/', include([
            path('mark-picked-up/', OrderRiderAssignmentViewSet.as_view({'post': 'mark_picked_up'}), name='order-rider-mark-picked-up'),
            path('mark-delivered/', OrderRiderAssignmentViewSet.as_view({'post': 'mark_delivered'}), name='order-rider-mark-delivered'),
        ])),
        
        # Payments (delegated to per-app urls)
        path('', include('api.payments.urls')),
        
        # Notifications (delegated)
        path('', include('api.notifications.urls')),
        
        # Chat (delegated)
        path('', include('api.chat.urls')),
        
        # Global API (delegated)
        path('', include('api.global_api.urls')),
    ])),
    
    # Root redirect to API
    path('', include([
        path('', include(router.urls)),
    ])),
]

# Add router URLs to main patterns
urlpatterns += router.urls
