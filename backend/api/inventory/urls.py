from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicineCategoryViewSet, MedicineCatalogViewSet, PharmacyInventoryViewSet
)

# Create router and register viewsets
router = DefaultRouter()

# Medicine categories
router.register(r'categories', MedicineCategoryViewSet, basename='medicine-category')

# Medicine catalog
router.register(r'catalog', MedicineCatalogViewSet, basename='medicine-catalog')

# Pharmacy inventory
router.register(r'inventory', PharmacyInventoryViewSet, basename='pharmacy-inventory')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Custom endpoints for categories
    path('categories/', include([
        path('root/', MedicineCategoryViewSet.as_view({'get': 'root_categories'}), name='category-root'),
        path('tree/', MedicineCategoryViewSet.as_view({'get': 'tree'}), name='category-tree'),
    ])),
    
    # Custom endpoints for catalog
    path('catalog/', include([
        path('featured/', MedicineCatalogViewSet.as_view({'get': 'featured'}), name='catalog-featured'),
        path('by-form/', MedicineCatalogViewSet.as_view({'get': 'by_form'}), name='catalog-by-form'),
        path('prescription-required/', MedicineCatalogViewSet.as_view({'get': 'prescription_required'}), name='catalog-prescription-required'),
        path('controlled-substances/', MedicineCatalogViewSet.as_view({'get': 'controlled_substances'}), name='catalog-controlled-substances'),
    ])),
    
    # Custom endpoints for inventory
    path('inventory/', include([
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
]

# Add router URLs to main patterns
urlpatterns += router.urls
