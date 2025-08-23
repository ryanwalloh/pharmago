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

# API URL patterns
urlpatterns = [
    # API v1
    path('api/v1/', include([
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
    ])),
    
    # Root redirect to API
    path('', include([
        path('', include(router.urls)),
    ])),
]

# Add router URLs to main patterns
urlpatterns += router.urls
