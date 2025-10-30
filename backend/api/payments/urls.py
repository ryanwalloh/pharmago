from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet
from .stripe_views import create_payment_intent, stripe_webhook, confirm_payment

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    
    # Stripe payment endpoints
    path('stripe/create-payment-intent/', create_payment_intent, name='stripe-create-payment-intent'),
    path('stripe/webhook/', stripe_webhook, name='stripe-webhook'),
    path('stripe/confirm-payment/', confirm_payment, name='stripe-confirm-payment'),
    
    path('payments/', include([
        path('my-payments/', PaymentViewSet.as_view({'get': 'my_payments'}), name='payment-my'),
        path('pending/', PaymentViewSet.as_view({'get': 'pending'}), name='payment-pending'),
        path('processing/', PaymentViewSet.as_view({'get': 'processing'}), name='payment-processing'),
        path('paid/', PaymentViewSet.as_view({'get': 'paid'}), name='payment-paid'),
        path('failed/', PaymentViewSet.as_view({'get': 'failed'}), name='payment-failed'),
        path('refunded/', PaymentViewSet.as_view({'get': 'refunded'}), name='payment-refunded'),
        path('by-method/', PaymentViewSet.as_view({'get': 'by_method'}), name='payment-by-method'),
        path('by-order/', PaymentViewSet.as_view({'get': 'by_order'}), name='payment-by-order'),
        path('search/', PaymentViewSet.as_view({'post': 'search'}), name='payment-search'),
        path('analytics/', PaymentViewSet.as_view({'get': 'analytics'}), name='payment-analytics'),
        path('available-methods/', PaymentViewSet.as_view({'get': 'available_methods'}), name='payment-methods'),
        path('verify/', PaymentViewSet.as_view({'post': 'verify'}), name='payment-verify'),
        path('export/', PaymentViewSet.as_view({'get': 'export'}), name='payment-export'),
    ])),
    path('payments/<int:pk>/', include([
        path('process/', PaymentViewSet.as_view({'post': 'process_payment'}), name='payment-process'),
        path('complete/', PaymentViewSet.as_view({'post': 'complete_payment'}), name='payment-complete'),
        path('fail/', PaymentViewSet.as_view({'post': 'fail_payment'}), name='payment-fail'),
        path('refund/', PaymentViewSet.as_view({'post': 'refund'}), name='payment-refund'),
        path('cancel/', PaymentViewSet.as_view({'post': 'cancel_payment'}), name='payment-cancel'),
        path('receipt/', PaymentViewSet.as_view({'get': 'receipt'}), name='payment-receipt'),
    ])),
]

urlpatterns += router.urls
