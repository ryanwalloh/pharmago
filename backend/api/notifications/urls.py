from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('notifications/', include([
        path('unread/', NotificationViewSet.as_view({'get': 'unread'}), name='notification-unread'),
        path('urgent/', NotificationViewSet.as_view({'get': 'urgent'}), name='notification-urgent'),
        path('scheduled/', NotificationViewSet.as_view({'get': 'scheduled'}), name='notification-scheduled'),
        path('expired/', NotificationViewSet.as_view({'get': 'expired'}), name='notification-expired'),
        path('by-type/', NotificationViewSet.as_view({'get': 'by_type'}), name='notification-by-type'),
        path('by-priority/', NotificationViewSet.as_view({'get': 'by_priority'}), name='notification-by-priority'),
        path('stats/', NotificationViewSet.as_view({'get': 'stats'}), name='notification-stats'),
        path('filter/', NotificationViewSet.as_view({'post': 'filter'}), name='notification-filter'),
        path('bulk-update/', NotificationViewSet.as_view({'post': 'bulk_update'}), name='notification-bulk-update'),
        path('mark-all-read/', NotificationViewSet.as_view({'post': 'mark_all_read'}), name='notification-mark-all-read'),
        path('create-system/', NotificationViewSet.as_view({'post': 'create_system_notification'}), name='notification-create-system'),
        path('create-order/', NotificationViewSet.as_view({'post': 'create_order_notification'}), name='notification-create-order'),
        path('create-payment/', NotificationViewSet.as_view({'post': 'create_payment_notification'}), name='notification-create-payment'),
    ])),
    path('notifications/<int:pk>/', include([
        path('mark-read/', NotificationViewSet.as_view({'post': 'mark_as_read'}), name='notification-mark-read'),
        path('mark-unread/', NotificationViewSet.as_view({'post': 'mark_as_unread'}), name='notification-mark-unread'),
        path('send-now/', NotificationViewSet.as_view({'post': 'send_now'}), name='notification-send-now'),
        path('schedule/', NotificationViewSet.as_view({'post': 'schedule'}), name='notification-schedule'),
        path('cancel-schedule/', NotificationViewSet.as_view({'post': 'cancel_schedule'}), name='notification-cancel-schedule'),
        path('extend-expiration/', NotificationViewSet.as_view({'post': 'extend_expiration'}), name='notification-extend-expiration'),
    ])),
]

urlpatterns += router.urls

