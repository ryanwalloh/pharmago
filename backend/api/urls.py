from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# from rest_framework_simplejwt.views import (
#     TokenObtainPairView,
#     TokenRefreshView,
#     TokenVerifyView,
# )

from api.users.views import (
    UserViewSet, CustomerViewSet, PharmacyViewSet, RiderViewSet
)
from api.locations.views import AddressViewSet
from api.pharmacies.views import PharmacyViewSet as PharmacyViewSetV2
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

# Create router and register viewsets
router = DefaultRouter()

# User management
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'pharmacies', PharmacyViewSet, basename='pharmacy')
router.register(r'riders', RiderViewSet, basename='rider')

# Location management
router.register(r'addresses', AddressViewSet, basename='address')

# Pharmacy management (separate from user pharmacies)
router.register(r'pharmacy-profiles', PharmacyViewSetV2, basename='pharmacy-profile')

# Inventory management
router.register(r'medicine-categories', MedicineCategoryViewSet, basename='medicine-category')
router.register(r'medicine-catalog', MedicineCatalogViewSet, basename='medicine-catalog')
router.register(r'pharmacy-inventory', PharmacyInventoryViewSet, basename='pharmacy-inventory')

# Order management
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-lines', OrderLineViewSet, basename='order-line')
router.register(r'prescription-verifications', PrescriptionVerificationViewSet, basename='prescription-verification')

# Enhanced order management with delivery and payment integration
router.register(r'enhanced-orders', EnhancedOrderViewSet, basename='enhanced-order')

# Delivery management
router.register(r'delivery-zones', DeliveryZoneViewSet, basename='delivery-zone')
router.register(r'rider-assignments', RiderAssignmentViewSet, basename='rider-assignment')
router.register(r'rider-locations', RiderLocationViewSet, basename='rider-location')
router.register(r'order-rider-assignments', OrderRiderAssignmentViewSet, basename='order-rider-assignment')

# Payment management
router.register(r'payments', PaymentViewSet, basename='payment')

# API URL patterns
urlpatterns = [
    # API v1 (remove duplicate api/v1/ prefix)
    path('v1/', include([
        # Main API endpoints
        path('', include(router.urls)),
        
        # Authentication endpoints
        # path('auth/', include([
        #     path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
        #     path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        #     path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
        # ])),
        
        # User-specific endpoints
        path('users/', include([
            path('register/', UserViewSet.as_view({'post': 'register'}), name='user-register'),
            path('login/', UserViewSet.as_view({'post': 'login'}), name='user-login'),
            path('logout/', UserViewSet.as_view({'post': 'logout'}), name='user-logout'),
            path('profile/', UserViewSet.as_view({'get': 'profile'}), name='user-profile'),
            path('me/', UserViewSet.as_view({'get': 'me'}), name='user-me'),
            path('change-password/', UserViewSet.as_view({'put': 'change_password'}), name='user-change-password'),
            path('reset-password/', UserViewSet.as_view({'post': 'reset_password_request'}), name='user-reset-password'),
            path('reset-password-confirm/', UserViewSet.as_view({'post': 'reset_password_confirm'}), name='user-reset-password-confirm'),
        ])),
        
        # Customer-specific endpoints
        path('customers/', include([
            path('my-profile/', CustomerViewSet.as_view({'get': 'my_profile'}), name='customer-my-profile'),
        ])),
        
        # Pharmacy-specific endpoints
        path('pharmacies/', include([
            path('my-pharmacy/', PharmacyViewSet.as_view({'get': 'my_pharmacy'}), name='pharmacy-my-pharmacy'),
            path('verified/', PharmacyViewSet.as_view({'get': 'verified'}), name='pharmacy-verified'),
            path('pending-verification/', PharmacyViewSet.as_view({'get': 'pending_verification'}), name='pharmacy-pending-verification'),
            path('search/', PharmacyViewSet.as_view({'get': 'search'}), name='pharmacy-search'),
            path('nearby/', PharmacyViewSet.as_view({'get': 'nearby'}), name='pharmacy-nearby'),
        ])),
        
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
        
        # Inventory endpoints
        path('inventory/', include([
            path('categories/', include([
                path('root/', MedicineCategoryViewSet.as_view({'get': 'root_categories'}), name='inventory-category-root'),
                path('tree/', MedicineCategoryViewSet.as_view({'get': 'tree'}), name='inventory-category-tree'),
            ])),
            path('catalog/', include([
                path('featured/', MedicineCatalogViewSet.as_view({'get': 'featured'}), name='inventory-catalog-featured'),
                path('by-form/', MedicineCatalogViewSet.as_view({'get': 'by_form'}), name='inventory-catalog-by-form'),
                path('prescription-required/', MedicineCatalogViewSet.as_view({'get': 'prescription_required'}), name='inventory-catalog-prescription-required'),
                path('controlled-substances/', MedicineCatalogViewSet.as_view({'get': 'controlled_substances'}), name='inventory-catalog-controlled-substances'),
            ])),
            path('pharmacy-inventory/', include([
                path('my-inventory/', PharmacyInventoryViewSet.as_view({'get': 'my_inventory'}), name='inventory-my-inventory'),
                path('available/', PharmacyInventoryViewSet.as_view({'get': 'available'}), name='inventory-available'),
                path('featured/', PharmacyInventoryViewSet.as_view({'get': 'featured'}), name='inventory-featured'),
                path('on-sale/', PharmacyInventoryViewSet.as_view({'get': 'on_sale'}), name='inventory-on-sale'),
                path('low-stock/', PharmacyInventoryViewSet.as_view({'get': 'low_stock'}), name='inventory-low-stock'),
                path('out-of-stock/', PharmacyInventoryViewSet.as_view({'get': 'out_of_stock'}), name='inventory-out-of-stock'),
                path('expiring-soon/', PharmacyInventoryViewSet.as_view({'get': 'expiring_soon'}), name='inventory-expiring-soon'),
                path('search/', PharmacyInventoryViewSet.as_view({'get': 'search'}), name='inventory-search'),
                path('stats/', PharmacyInventoryViewSet.as_view({'get': 'stats'}), name='inventory-stats'),
                path('export/', PharmacyInventoryViewSet.as_view({'get': 'export'}), name='inventory-export'),
                path('bulk-update/', PharmacyInventoryViewSet.as_view({'post': 'bulk_update'}), name='inventory-bulk-update'),
            ])),
        ])),
        
        # Order endpoints
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
        
        # Individual order delivery and payment endpoints
        path('orders/<int:pk>/', include([
            path('assign-rider/', EnhancedOrderViewSet.as_view({'post': 'assign_rider'}), name='order-assign-rider'),
            path('batch-with-orders/', EnhancedOrderViewSet.as_view({'post': 'batch_with_orders'}), name='order-batch-with-orders'),
            path('create-payment/', EnhancedOrderViewSet.as_view({'post': 'create_payment'}), name='order-create-payment'),
            path('delivery-tracking/', EnhancedOrderViewSet.as_view({'get': 'delivery_tracking'}), name='order-delivery-tracking'),
            path('payment-history/', EnhancedOrderViewSet.as_view({'get': 'payment_history'}), name='order-payment-history'),
        ])),
        
        # Order line endpoints
        path('order-lines/', include([
            path('verify-prescription/', OrderLineViewSet.as_view({'post': 'verify_prescription'}), name='orderline-verify-prescription'),
        ])),
        
        # Prescription verification endpoints
        path('prescriptions/', include([
            path('pending/', PrescriptionVerificationViewSet.as_view({'get': 'pending'}), name='prescription-pending'),
            path('bulk-verify/', PrescriptionVerificationViewSet.as_view({'post': 'bulk_verify'}), name='prescription-bulk-verify'),
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
        
        # Payment endpoints
        path('payments/', include([
            path('my-payments/', PaymentViewSet.as_view({'get': 'my_payments'}), name='payment-my'),
            path('pending/', PaymentViewSet.as_view({'get': 'pending'}), name='payment-pending'),
            path('processing/', PaymentViewSet.as_view({'get': 'processing'}), name='payment-processing'),
            path('paid/', PaymentViewSet.as_view({'get': 'paid'}), name='payment-paid'),
            path('failed/', PaymentViewSet.as_view({'get': 'failed'}), name='payment-failed'),
            path('refunded/', PaymentViewSet.as_view({'get': 'refunded'}), name='payment-refunded'),
            path('by-method/', PaymentViewSet.as_view({'get': 'by_method'}), name='payment-by-method'),
            path('by-order/', PaymentViewSet.as_view({'get': 'by_order'}), name='payment-by-order'),
            path('search/', PaymentViewSet.as_view({'post': 'search'}), name='payment-search'),
            path('analytics/', PaymentViewSet.as_view({'get': 'analytics'}), name='payment-analytics'),
            path('available-methods/', PaymentViewSet.as_view({'get': 'available_methods'}), name='payment-methods'),
            path('verify/', PaymentViewSet.as_view({'post': 'verify'}), name='payment-verify'),
            path('export/', PaymentViewSet.as_view({'get': 'export'}), name='payment-export'),
        ])),
        
        # Individual payment endpoints
        path('payments/<int:pk>/', include([
            path('process/', PaymentViewSet.as_view({'post': 'process_payment'}), name='payment-process'),
            path('complete/', PaymentViewSet.as_view({'post': 'complete_payment'}), name='payment-complete'),
            path('fail/', PaymentViewSet.as_view({'post': 'fail_payment'}), name='payment-fail'),
            path('refund/', PaymentViewSet.as_view({'post': 'refund'}), name='payment-refund'),
            path('cancel/', PaymentViewSet.as_view({'post': 'cancel_payment'}), name='payment-cancel'),
            path('receipt/', PaymentViewSet.as_view({'get': 'receipt'}), name='payment-receipt'),
        ])),
    ])),
    
    # Root redirect to API
    path('', include([
        path('', include(router.urls)),
    ])),
]

# Add router URLs to main patterns
urlpatterns += router.urls
