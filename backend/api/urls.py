from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

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

# API URL patterns
urlpatterns = [
    # API v1 (remove duplicate api/v1/ prefix)
    path('v1/', include([
        # Main API endpoints
        path('', include(router.urls)),
        
        # Authentication endpoints
        path('auth/', include([
            path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
                    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
        ])),
        
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
        
        # Order line endpoints
        path('order-lines/', include([
            path('verify-prescription/', OrderLineViewSet.as_view({'post': 'verify_prescription'}), name='orderline-verify-prescription'),
        ])),
        
        # Prescription verification endpoints
        path('prescriptions/', include([
            path('pending/', PrescriptionVerificationViewSet.as_view({'get': 'pending'}), name='prescription-pending'),
            path('bulk-verify/', PrescriptionVerificationViewSet.as_view({'post': 'bulk_verify'}), name='prescription-bulk-verify'),
        ])),
    ])),
    
    # Root redirect to API
    path('', include([
        path('', include(router.urls)),
    ])),
]

# Add router URLs to main patterns
urlpatterns += router.urls
