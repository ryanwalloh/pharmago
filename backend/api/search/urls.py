from django.urls import path
from . import views

app_name = 'search'

urlpatterns = [
    path('medicines/', views.search_medicines, name='search_medicines'),
    path('pharmacies/', views.search_pharmacies, name='search_pharmacies'),
    path('pharmacies-by-medicine/', views.get_pharmacies_by_medicine, name='pharmacies_by_medicine'),
]

