from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PharmacyViewSet, pharmacy_statistics, simple_pharmacy_statistics

router = DefaultRouter()
router.register(r'pharmacies', PharmacyViewSet, basename='pharmacy')

urlpatterns = [
    path('', include(router.urls)),
    path('pharmacies/', include([
        path('my-pharmacy/', PharmacyViewSet.as_view({'get': 'my_pharmacy'}), name='pharmacy-my-pharmacy'),
        path('verified/', PharmacyViewSet.as_view({'get': 'verified'}), name='pharmacy-verified'),
        path('pending-verification/', PharmacyViewSet.as_view({'get': 'pending_verification'}), name='pharmacy-pending-verification'),
        path('statistics/', PharmacyViewSet.as_view({'get': 'statistics'}), name='pharmacy-statistics'),
        path('statistics-simple/', pharmacy_statistics, name='pharmacy-statistics-simple'),
        path('statistics-basic/', simple_pharmacy_statistics, name='pharmacy-statistics-basic'),
        path('search/', PharmacyViewSet.as_view({'get': 'search'}), name='pharmacy-search'),
        path('nearby/', PharmacyViewSet.as_view({'get': 'nearby'}), name='pharmacy-nearby'),
    ])),
]

urlpatterns += router.urls

