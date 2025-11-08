from django.urls import path
from . import direct_endpoints as views
from . import rider_endpoints
from api.delivery import rider_endpoints as delivery_rider_endpoints
from api.delivery import assignment_endpoints

app_name = 'users_direct'

urlpatterns = [
    path('approve-rider/<int:rider_id>/', views.approve_rider_direct),
    path('complete-rider-registration/', views.complete_rider_registration),
    path('approve-pharmacy/<int:pharmacy_id>/', views.approve_pharmacy),
    path('generate-login-token/<int:pharmacy_id>/', views.generate_login_token),
    path('validate-login-token/<str:token>/', views.validate_login_token),
    path('complete-user-setup/<str:token>/', views.complete_user_setup),
    path('pharmacy-login/', views.pharmacy_login),
    path('pharmacy-register/', views.pharmacy_register),
    path('rider-login/', rider_endpoints.rider_login),
    path('rider-session/', rider_endpoints.rider_session),
    path('available-orders-count/', rider_endpoints.available_orders_count),
    path('available-orders/', delivery_rider_endpoints.get_available_orders),
    
    # Dispatch System Endpoints
    path('rider/accept-offer/', delivery_rider_endpoints.accept_dispatch_offer),
    path('rider/reject-offer/', delivery_rider_endpoints.reject_dispatch_offer),
    path('rider/update-status/', delivery_rider_endpoints.update_rider_status),
    path('rider/update-location/', delivery_rider_endpoints.update_rider_location),
    path('rider/current-offer/', delivery_rider_endpoints.get_current_dispatch_offer),
    
    # Manual Order Acceptance (from available orders list)
    path('rider/manual-accept-orders/', delivery_rider_endpoints.manual_accept_orders),
    
    # Assignment Details Endpoint
    path('assignment/<int:assignment_id>/', assignment_endpoints.get_assignment_details),
    
    # Assignment Actions
    path('assignment/<int:assignment_id>/mark-picked-up/', assignment_endpoints.mark_orders_picked_up),
    path('assignment/<int:assignment_id>/order/<int:order_id>/mark-delivered/', assignment_endpoints.mark_order_delivered),
]


