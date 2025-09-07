"""
URL configuration for pharmago project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from my_app import views
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from api import views
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


def test_api(request):
    return JsonResponse({"message": "Hello from Django backend!"})


def direct_pharmacy_stats(request):
    """Direct pharmacy statistics endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy
        
        # Count pharmacies by different statuses
        total_pharmacies = Pharmacy.objects.filter(status='approved').count()  # Only count approved pharmacies
        pending_approvals = Pharmacy.objects.filter(is_fully_verified=False).count()
        active_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=True, 
            status='approved'
        ).count()
        suspended_pharmacies = Pharmacy.objects.filter(status='suspended').count()
        
        # Get pending pharmacies data with required fields
        pending_pharmacies_data = []
        pending_pharmacies = Pharmacy.objects.filter(is_fully_verified=False)
        
        for pharmacy in pending_pharmacies:
            pharmacy_data = {
                'id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'owner_first_name': pharmacy.owner_first_name,
                'owner_last_name': pharmacy.owner_last_name,
                'business_phone': pharmacy.business_phone,
                'business_email': pharmacy.business_email,
                'barangay': pharmacy.barangay,
                'city': pharmacy.city
            }
            pending_pharmacies_data.append(pharmacy_data)
        
        # Log the pending pharmacies data to console
        print("=== PENDING PHARMACIES DATA ===")
        print(f"Found {len(pending_pharmacies_data)} pending pharmacies:")
        for pharmacy in pending_pharmacies_data:
            print(f"- {pharmacy['pharmacy_name']} (Owner: {pharmacy['owner_first_name']} {pharmacy['owner_last_name']})")
        print("=== END PENDING PHARMACIES DATA ===")
        
        return JsonResponse({
            'totalPharmacies': total_pharmacies,
            'pendingApprovals': pending_approvals,
            'activePharmacies': active_pharmacies,
            'suspendedPharmacies': suspended_pharmacies,
            'pendingPharmaciesData': pending_pharmacies_data  # Include the actual data
        })
    except Exception as e:
        print(f"ERROR in direct_pharmacy_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch pharmacy statistics',
            'totalPharmacies': 0,
            'pendingApprovals': 0,
            'activePharmacies': 0,
            'suspendedPharmacies': 0,
            'pendingPharmaciesData': []
        }, status=500)


def direct_pending_pharmacies(request):
    """Direct pending pharmacies endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy
        from api.pharmacies.serializers import PharmacyDetailSerializer
        
        pending_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=False
        ).order_by('created_at')
        
        serializer = PharmacyDetailSerializer(pending_pharmacies, many=True)
        
        return JsonResponse(serializer.data, safe=False)
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to fetch pending pharmacies',
            'data': []
        }, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test/', test_api),
    path('api/ping/', views.ping),
    path('api/pharmacy-stats/', direct_pharmacy_stats),  # Direct endpoint bypassing all auth
    path('api/pending-pharmacies/', direct_pending_pharmacies),  # Direct endpoint for pending pharmacies
    
    # Include API URLs at the correct path
    path('api/', include('api.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


