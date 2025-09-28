from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from .views import UserViewSet, CustomerViewSet, PharmacyViewSet, RiderViewSet, DocumentUploadViewSet
from .jwt_views import jwt_login, jwt_refresh, jwt_logout, jwt_verify

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'pharmacies', PharmacyViewSet, basename='pharmacy')
router.register(r'riders', RiderViewSet, basename='rider')
router.register(r'document-uploads', DocumentUploadViewSet, basename='document-upload')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include([
        path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
        path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
        path('jwt/login/', jwt_login, name='jwt_login'),
        path('jwt/refresh/', jwt_refresh, name='jwt_refresh'),
        path('jwt/logout/', jwt_logout, name='jwt_logout'),
        path('jwt/verify/', jwt_verify, name='jwt_verify'),
    ])),
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
    path('customers/', include([
        path('my-profile/', CustomerViewSet.as_view({'get': 'my_profile'}), name='customer-my-profile'),
    ])),
]

urlpatterns += router.urls

