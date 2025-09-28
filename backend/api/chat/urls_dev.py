from django.urls import path
from . import dev_views as views

app_name = 'chat_dev'

urlpatterns = [
    path('order-chat-room/', views.get_or_create_order_chat_room),
    path('order-chat-messages/', views.get_order_chat_messages),
    path('order-chat-typing/', views.set_order_chat_typing),
    path('order-chat-typing-status/', views.get_order_chat_typing_status),
    path('order-chat-mark-read/', views.mark_order_chat_messages_read),
    path('order-chat-send/', views.send_order_chat_message),
    path('order-chat-send-customer/', views.send_order_chat_message_customer),
]


