from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, ChatParticipantViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register(r'chat-rooms', ChatRoomViewSet, basename='chat-room')
router.register(r'chat-participants', ChatParticipantViewSet, basename='chat-participant')
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-message')

urlpatterns = [
    path('', include(router.urls)),
    path('chat-rooms/', include([
        path('my-rooms/', ChatRoomViewSet.as_view({'get': 'my_rooms'}), name='chat-room-my-rooms'),
        path('active/', ChatRoomViewSet.as_view({'get': 'active'}), name='chat-room-active'),
        path('create-with-participants/', ChatRoomViewSet.as_view({'post': 'create_with_participants'}), name='chat-room-create-with-participants'),
        path('get-or-create-by-order/', ChatRoomViewSet.as_view({'post': 'get_or_create_by_order'}), name='chat-room-get-or-create-by-order'),
    ])),
    path('chat-rooms/<int:pk>/', include([
        path('close/', ChatRoomViewSet.as_view({'post': 'close_room'}), name='chat-room-close'),
        path('archive/', ChatRoomViewSet.as_view({'post': 'archive_room'}), name='chat-room-archive'),
        path('participants/', ChatRoomViewSet.as_view({'get': 'participants'}), name='chat-room-participants'),
        path('messages/', ChatRoomViewSet.as_view({'get': 'messages'}), name='chat-room-messages'),
        path('send/', ChatRoomViewSet.as_view({'post': 'send'}), name='chat-room-send'),
        path('mark-read/', ChatRoomViewSet.as_view({'post': 'mark_read_room'}), name='chat-room-mark-read'),
        path('typing/', ChatRoomViewSet.as_view({'post': 'set_typing'}), name='chat-room-typing'),
        path('typing-status/', ChatRoomViewSet.as_view({'get': 'typing_status'}), name='chat-room-typing-status'),
        path('stats/', ChatRoomViewSet.as_view({'get': 'stats'}), name='chat-room-stats'),
    ])),
    path('chat-participants/<int:pk>/', include([
        path('leave-room/', ChatParticipantViewSet.as_view({'post': 'leave_room'}), name='chat-participant-leave'),
        path('mute/', ChatParticipantViewSet.as_view({'post': 'mute'}), name='chat-participant-mute'),
        path('unmute/', ChatParticipantViewSet.as_view({'post': 'unmute'}), name='chat-participant-unmute'),
        path('block/', ChatParticipantViewSet.as_view({'post': 'block'}), name='chat-participant-block'),
        path('unblock/', ChatParticipantViewSet.as_view({'post': 'unblock'}), name='chat-participant-unblock'),
    ])),
    path('chat-messages/', include([
        path('search/', ChatMessageViewSet.as_view({'post': 'search'}), name='chat-message-search'),
        path('my-messages/', ChatMessageViewSet.as_view({'get': 'my_messages'}), name='chat-message-my-messages'),
        path('unread/', ChatMessageViewSet.as_view({'get': 'unread'}), name='chat-message-unread'),
        path('mark-all-read/', ChatMessageViewSet.as_view({'post': 'mark_all_read'}), name='chat-message-mark-all-read'),
    ])),
    path('chat-messages/<int:pk>/', include([
        path('reply/', ChatMessageViewSet.as_view({'post': 'reply'}), name='chat-message-reply'),
        path('mark-read/', ChatMessageViewSet.as_view({'post': 'mark_as_read'}), name='chat-message-mark-read'),
        path('edit/', ChatMessageViewSet.as_view({'post': 'edit'}), name='chat-message-edit'),
        path('delete/', ChatMessageViewSet.as_view({'post': 'delete'}), name='chat-message-delete'),
    ])),
]

urlpatterns += router.urls

