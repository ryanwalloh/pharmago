from django.urls import path
from . import direct_endpoints as views

app_name = 'users_direct'

urlpatterns = [
    path('approve-rider/<int:rider_id>/', views.approve_rider_direct),
    path('complete-rider-registration/', views.complete_rider_registration),
    path('approve-pharmacy/<int:pharmacy_id>/', views.approve_pharmacy),
    path('generate-login-token/<int:pharmacy_id>/', views.generate_login_token),
    path('validate-login-token/<str:token>/', views.validate_login_token),
    path('pharmacy-login/', views.pharmacy_login),
]


