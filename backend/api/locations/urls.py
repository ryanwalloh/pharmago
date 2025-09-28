from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AddressViewSet

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('', include(router.urls)),
    path('addresses/', include([
        path('my-addresses/', AddressViewSet.as_view({'get': 'my_addresses'}), name='address-my-addresses'),
        path('default/', AddressViewSet.as_view({'get': 'default_address'}), name='address-default'),
        path('search/', AddressViewSet.as_view({'get': 'search'}), name='address-search'),
        path('nearby/', AddressViewSet.as_view({'get': 'nearby'}), name='address-nearby'),
        path('bulk-update/', AddressViewSet.as_view({'post': 'bulk_update'}), name='address-bulk-update'),
    ])),
]

urlpatterns += router.urls

