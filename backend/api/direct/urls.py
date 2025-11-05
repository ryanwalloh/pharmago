from django.urls import path
from . import views_read as views
from . import views_ops as ops
from . import address_views
from . import cart_order_views
from . import customer_orders_views
from api.payments.stripe_views import create_payment_intent, stripe_webhook, confirm_payment

app_name = 'direct'

urlpatterns = [
    path('test/', views.test_api),
    path('pharmacy-stats/', views.direct_pharmacy_stats),
    path('pending-pharmacies/', views.direct_pending_pharmacies),
    path('active-pharmacies/', views.direct_active_pharmacies),
    path('rider-stats/', views.direct_rider_stats),
    path('rider-details/<int:rider_id>/', views.direct_rider_details),
    path('cache-version/', views.get_cache_value),
    path('riders-list/all/', views.direct_riders_all),
    path('riders-list/active/', views.direct_riders_active),
    path('riders-list/suspended/', views.direct_riders_suspended),
    path('pharmacy-details/<int:pharmacy_id>/', views.direct_pharmacy_details),
    # Operations used by PharmacyDashboard
    path('medicine-categories/', ops.direct_medicine_categories),
    path('medicine-catalog/', ops.direct_medicine_catalog),
    path('pharmacy-inventory/<int:pharmacy_id>/', ops.direct_pharmacy_inventory),
    path('pharmacy-orders/<int:pharmacy_id>/', ops.direct_pharmacy_orders),
    path('add-medicines-to-inventory/', ops.add_medicines_to_inventory),
    path('add-custom-products-to-inventory/', ops.add_custom_products_to_inventory),
    path('toggle-availability/<int:pharmacy_id>/<int:item_id>/', ops.toggle_inventory_availability),
    path('update-inventory-item/<int:pharmacy_id>/<int:item_id>/', ops.update_inventory_item),
    path('attach-prescription-items/', ops.attach_prescription_items),
    path('prepare-price-quote/', ops.prepare_price_quote),
    path('customer-approve-pricing/', ops.customer_approve_pricing),
    path('accept-cart-order/<int:order_id>/', ops.accept_cart_order),
    path('mark-order-ready/<int:order_id>/', ops.mark_order_ready),
    # Mobile app direct endpoints
    path('create-prescription-order/', views.direct_prescription_order_creation),
    path('create-cart-order/', cart_order_views.create_cart_order),
    path('order-status/<int:order_id>/', views.get_order_status),
    # Search endpoints
    path('search-medicines/', views.direct_search_medicines),
    path('search-pharmacies/', views.direct_search_pharmacies),
    path('pharmacies-by-medicine/', views.direct_pharmacies_by_medicine),
    path('calculate-distance-and-fee/', views.calculate_distance_and_fee),
    path('search-pharmacy-inventory/<int:pharmacy_id>/', views.search_pharmacy_inventory),
    path('bulk-set-inventory-max-stock/', views.bulk_set_inventory_max_stock),
    # Address endpoints
    path('create-or-update-address/', address_views.create_or_update_address),
    path('customer-addresses/<int:customer_id>/', address_views.get_customer_addresses),
    path('default-address/<int:customer_id>/', address_views.get_default_address),
    path('update-address/<int:address_id>/', address_views.update_address),
    # Customer orders endpoints
    path('customer-orders/<int:customer_id>/', customer_orders_views.get_customer_orders),
    # Stripe payment endpoints
    path('stripe/create-payment-intent/', create_payment_intent),
    path('stripe/webhook/', stripe_webhook),
    path('stripe/confirm-payment/', confirm_payment),
]