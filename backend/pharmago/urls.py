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


def direct_pharmacy_details(request, pharmacy_id):
    """Direct pharmacy details endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy, UserDocument
        
        # Get the pharmacy by ID
        pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        
        # Get user documents for this pharmacy
        user_documents = UserDocument.objects.filter(user=pharmacy.user)
        
        # Build detailed pharmacy data
        pharmacy_data = {
            # Basic information (already available)
            'id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'owner_first_name': pharmacy.owner_first_name,
            'owner_last_name': pharmacy.owner_last_name,
            'business_phone': pharmacy.business_phone,
            'business_email': pharmacy.business_email,
            'barangay': pharmacy.barangay,
            'city': pharmacy.city,
            
            # Additional pharmacy fields
            'business_permit_number': pharmacy.business_permit_number,
            'business_permit_expiry': pharmacy.business_permit_expiry.isoformat() if pharmacy.business_permit_expiry else None,
            'pharmacy_license_number': pharmacy.pharmacy_license_number,
            'pharmacy_license_expiry': pharmacy.pharmacy_license_expiry.isoformat() if pharmacy.pharmacy_license_expiry else None,
            'owner_date_of_birth': pharmacy.owner_date_of_birth.isoformat() if pharmacy.owner_date_of_birth else None,
            'owner_gender': pharmacy.owner_gender,
            'services_offered': pharmacy.services_offered,
            'user_id': pharmacy.user.id,
            
            # User documents (AWS S3 URLs)
            'documents': []
        }
        
        # Add user documents
        for doc in user_documents:
            document_data = {
                'id': doc.id,
                'file_url': doc.file_url,
                'document_type': doc.id_type.name if doc.id_type else 'Unknown',
                'document_number': doc.document_number,
                'expiry_date': doc.expiry_date.isoformat() if doc.expiry_date else None,
                'status': doc.status
            }
            pharmacy_data['documents'].append(document_data)
        
        # Log the detailed pharmacy data
        print(f"=== PHARMACY DETAILS FOR ID {pharmacy_id} ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name}")
        print(f"Owner: {pharmacy.owner_first_name} {pharmacy.owner_last_name}")
        print(f"Business Permit: {pharmacy.business_permit_number}")
        print(f"License: {pharmacy.pharmacy_license_number}")
        print(f"Documents: {len(pharmacy_data['documents'])} uploaded")
        print("=== END PHARMACY DETAILS ===")
        
        return JsonResponse(pharmacy_data)
        
    except Pharmacy.DoesNotExist:
        print(f"ERROR: Pharmacy with ID {pharmacy_id} not found")
        return JsonResponse({
            'error': 'Pharmacy not found',
            'pharmacy_id': pharmacy_id
        }, status=404)
    except Exception as e:
        print(f"ERROR in direct_pharmacy_details: {e}")
        return JsonResponse({
            'error': 'Failed to fetch pharmacy details',
            'pharmacy_id': pharmacy_id
        }, status=500)


def serve_document(request, document_id):
    """Serve document file through Django backend to handle S3 access"""
    from api.users.models import UserDocument
    from django.http import HttpResponse, Http404
    from django.core.files.storage import default_storage
    import boto3
    from botocore.exceptions import ClientError
    import os
    
    try:
        # Get the document
        document = UserDocument.objects.get(id=document_id)
        
        if not document.file_url:
            raise Http404("Document file not found")
        
        # Use boto3 to fetch the file from S3
        try:
            # Initialize S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2')
            )
            
            # Extract bucket and key from URL
            bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
            # Extract key from URL like: https://bucket.s3.region.amazonaws.com/key
            url_parts = document.file_url.split('/')
            key = '/'.join(url_parts[3:])  # Everything after the bucket name
            
            # Fetch the object from S3
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            file_content = response['Body'].read()
            
            # Determine content type based on file extension
            content_type = 'application/octet-stream'
            if document.file_url.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif document.file_url.lower().endswith('.png'):
                content_type = 'image/png'
            elif document.file_url.lower().endswith('.pdf'):
                content_type = 'application/pdf'
            elif document.file_url.lower().endswith('.gif'):
                content_type = 'image/gif'
            
            # Return the file content
            django_response = HttpResponse(
                file_content,
                content_type=content_type
            )
            django_response['Content-Disposition'] = f'inline; filename="{document.id_type.name if document.id_type else "document"}.{document.file_url.split(".")[-1]}"'
            return django_response
            
        except ClientError as e:
            print(f"ERROR fetching document from S3: {e}")
            raise Http404("Unable to fetch document")
            
    except UserDocument.DoesNotExist:
        print(f"ERROR: Document with ID {document_id} not found")
        raise Http404("Document not found")
    except Exception as e:
        print(f"ERROR in serve_document: {e}")
        raise Http404("Error serving document")


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test/', test_api),
    path('api/ping/', views.ping),
    path('api/pharmacy-stats/', direct_pharmacy_stats),  # Direct endpoint bypassing all auth
    path('api/pending-pharmacies/', direct_pending_pharmacies),  # Direct endpoint for pending pharmacies
    path('api/pharmacy-details/<int:pharmacy_id>/', direct_pharmacy_details),  # Direct endpoint for pharmacy details
    path('api/document/<int:document_id>/', serve_document),  # Direct endpoint for serving documents
    
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


