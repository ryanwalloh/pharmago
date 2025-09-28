from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SystemHealthViewSet, ApiUsageViewSet, GlobalSearchViewSet,
    BulkOperationsViewSet, ExportImportViewSet, GlobalStatisticsViewSet,
    BulkOperationLogViewSet, admin_login, admin_logout, admin_verify, admin_debug,
)

router = DefaultRouter()
router.register(r'system-health', SystemHealthViewSet, basename='system-health')
router.register(r'api-usage', ApiUsageViewSet, basename='api-usage')
router.register(r'global-search', GlobalSearchViewSet, basename='global-search')
router.register(r'bulk-operations', BulkOperationsViewSet, basename='bulk-operations')
router.register(r'export-import', ExportImportViewSet, basename='export-import')
router.register(r'global-statistics', GlobalStatisticsViewSet, basename='global-statistics')
router.register(r'bulk-operation-logs', BulkOperationLogViewSet, basename='bulk-operation-log')

urlpatterns = [
    path('', include(router.urls)),
    path('system-health/', include([
        path('overall-status/', SystemHealthViewSet.as_view({'get': 'overall_status'}), name='system-health-overall'),
        path('component-status/', SystemHealthViewSet.as_view({'get': 'component_status'}), name='system-health-component'),
        path('check-health/', SystemHealthViewSet.as_view({'post': 'check_health'}), name='system-health-check'),
    ])),
    path('api-usage/', include([
        path('stats/', ApiUsageViewSet.as_view({'get': 'stats'}), name='api-usage-stats'),
        path('my-usage/', ApiUsageViewSet.as_view({'get': 'my_usage'}), name='api-usage-my-usage'),
    ])),
    path('global-search/', include([
        path('searchable-models/', GlobalSearchViewSet.as_view({'get': 'searchable_models'}), name='global-search-models'),
    ])),
    path('bulk-operations/', include([
        path('bulk-create/', BulkOperationsViewSet.as_view({'post': 'bulk_create'}), name='bulk-operations-create'),
        path('bulk-update/', BulkOperationsViewSet.as_view({'post': 'bulk_update'}), name='bulk-operations-update'),
        path('bulk-delete/', BulkOperationsViewSet.as_view({'post': 'bulk_delete'}), name='bulk-operations-delete'),
    ])),
    path('export-import/', include([
        path('export-data/', ExportImportViewSet.as_view({'post': 'export_data'}), name='export-import-export'),
        path('import-data/', ExportImportViewSet.as_view({'post': 'import_data'}), name='export-import-import'),
    ])),
    path('global-statistics/', include([
        path('overview/', GlobalStatisticsViewSet.as_view({'get': 'overview'}), name='global-statistics-overview'),
        path('model-stats/', GlobalStatisticsViewSet.as_view({'get': 'model_stats'}), name='global-statistics-model'),
        path('performance/', GlobalStatisticsViewSet.as_view({'get': 'performance'}), name='global-statistics-performance'),
    ])),
    path('bulk-operation-logs/<int:pk>/', include([
        path('cancel/', BulkOperationLogViewSet.as_view({'post': 'cancel'}), name='bulk-operation-log-cancel'),
    ])),
    path('bulk-operation-logs/', include([
        path('my-operations/', BulkOperationLogViewSet.as_view({'get': 'my_operations'}), name='bulk-operation-log-my-operations'),
    ])),
    path('pharmago-admin/', include([
        path('login/', admin_login, name='admin-login'),
        path('logout/', admin_logout, name='admin-logout'),
        path('verify/', admin_verify, name='admin-verify'),
        path('debug/', admin_debug, name='admin-debug'),
    ])),
]

urlpatterns += router.urls

