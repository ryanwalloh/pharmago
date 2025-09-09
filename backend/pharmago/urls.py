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
from django.views.decorators.csrf import csrf_exempt
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


@csrf_exempt
def approve_pharmacy(request, pharmacy_id):
    """Approve pharmacy endpoint that updates status and verification"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.users.models import Pharmacy, User, TemporaryLoginToken
        from django.utils import timezone
        from api.utils.email_utils import send_pharmacy_welcome_email
        import secrets
        
        # Get the pharmacy by ID
        pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        
        # Check if pharmacy is already approved
        if pharmacy.status == 'approved' and pharmacy.is_fully_verified:
            return JsonResponse({
                'error': 'Pharmacy already approved',
                'message': f'Pharmacy {pharmacy.pharmacy_name} is already approved and verified'
            }, status=400)
        
        # Get a default admin user for verification (you can modify this logic)
        try:
            admin_user = User.objects.filter(role='admin', is_superuser=True).first()
            if not admin_user:
                # Create a default admin user if none exists
                admin_user = User.objects.create_user(
                    email='admin@pharmago.com',
                    password='admin123',
                    role='admin',
                    is_staff=True,
                    is_superuser=True,
                    first_name='System',
                    last_name='Admin'
                )
        except Exception as e:
            print(f"ERROR creating admin user: {e}")
            admin_user = None
        
        # Update pharmacy status and verification
        pharmacy.status = 'approved'
        pharmacy.is_fully_verified = True
        pharmacy.verified_at = timezone.now()
        pharmacy.verified_by = admin_user
        pharmacy.save()
        
        # Also update the associated user status
        pharmacy.user.status = 'active'
        pharmacy.user.save()
        
        # Generate login token for first-time setup
        token = secrets.token_urlsafe(48)  # 64 characters when base64 encoded
        expires_at = timezone.now() + timezone.timedelta(hours=48)
        
        # Create the login token
        login_token = TemporaryLoginToken.objects.create(
            user=pharmacy.user,
            token=token,
            expires_at=expires_at
        )
        
        # Send welcome email with login link
        email_sent = send_pharmacy_welcome_email(pharmacy, login_token)
        
        # Log the approval
        print(f"=== PHARMACY APPROVED ===")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"Owner: {pharmacy.owner_first_name} {pharmacy.owner_last_name}")
        print(f"Business Email: {pharmacy.business_email}")
        print(f"Approved by: {admin_user.get_full_name() if admin_user else 'System'}")
        print(f"Approved at: {pharmacy.verified_at}")
        print(f"Login Token Generated: {token}")
        print(f"Token Expires: {expires_at}")
        print(f"Welcome Email Sent: {'Yes' if email_sent else 'No'}")
        print("=== END PHARMACY APPROVAL ===")
        
        return JsonResponse({
            'success': True,
            'message': f'Pharmacy {pharmacy.pharmacy_name} has been successfully approved',
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email,
            'verified_at': pharmacy.verified_at.isoformat(),
            'verified_by': admin_user.get_full_name() if admin_user else 'System Admin',
            'login_token_generated': True,
            'token_expires_at': expires_at.isoformat(),
            'welcome_email_sent': email_sent,
            'email_status': 'sent' if email_sent else 'failed'
        })
        
    except Pharmacy.DoesNotExist:
        print(f"ERROR: Pharmacy with ID {pharmacy_id} not found")
        return JsonResponse({
            'error': 'Pharmacy not found',
            'message': f'No pharmacy found with ID {pharmacy_id}'
        }, status=404)
    except Exception as e:
        print(f"ERROR in approve_pharmacy: {e}")
        return JsonResponse({
            'error': 'Failed to approve pharmacy',
            'message': 'An error occurred while approving the pharmacy. Please try again.'
        }, status=500)


@csrf_exempt
def generate_login_token(request, pharmacy_id):
    """Generate a temporary login token for pharmacy first-time setup"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.users.models import Pharmacy, TemporaryLoginToken
        from django.utils import timezone
        import secrets
        
        # Get the pharmacy by ID
        pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        
        # Check if pharmacy is approved
        if pharmacy.status != 'approved' or not pharmacy.is_fully_verified:
            return JsonResponse({
                'error': 'Pharmacy not approved',
                'message': 'Pharmacy must be approved before generating login token'
            }, status=400)
        
        # Generate a secure random token
        token = secrets.token_urlsafe(48)  # 64 characters when base64 encoded
        
        # Set expiration time (48 hours from now)
        expires_at = timezone.now() + timezone.timedelta(hours=48)
        
        # Create the token
        login_token = TemporaryLoginToken.objects.create(
            user=pharmacy.user,
            token=token,
            expires_at=expires_at
        )
        
        # Log the token generation
        print(f"=== LOGIN TOKEN GENERATED ===")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"User ID: {pharmacy.user.id}")
        print(f"Token: {token}")
        print(f"Expires at: {expires_at}")
        print("=== END TOKEN GENERATION ===")
        
        return JsonResponse({
            'success': True,
            'message': 'Login token generated successfully',
            'token': token,
            'expires_at': expires_at.isoformat(),
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email
        })
        
    except Pharmacy.DoesNotExist:
        print(f"ERROR: Pharmacy with ID {pharmacy_id} not found")
        return JsonResponse({
            'error': 'Pharmacy not found',
            'message': f'No pharmacy found with ID {pharmacy_id}'
        }, status=404)
    except Exception as e:
        print(f"ERROR in generate_login_token: {e}")
        return JsonResponse({
            'error': 'Failed to generate login token',
            'message': 'An error occurred while generating the login token. Please try again.'
        }, status=500)


def validate_login_token(request, token):
    """Validate a temporary login token"""
    if request.method != 'GET':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only GET requests are allowed'
        }, status=405)
    
    try:
        from api.users.models import TemporaryLoginToken, Pharmacy
        
        # Get the token
        login_token = TemporaryLoginToken.objects.get(token=token)
        
        # Check if token is valid
        if not login_token.is_valid():
            if login_token.is_expired():
                return JsonResponse({
                    'error': 'Token expired',
                    'message': 'This login link has expired. Please contact support for a new link.'
                }, status=400)
            elif login_token.is_used:
                return JsonResponse({
                    'error': 'Token already used',
                    'message': 'This login link has already been used. Please contact support for a new link.'
                }, status=400)
        
        # Get pharmacy information
        try:
            pharmacy = Pharmacy.objects.get(user=login_token.user)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'message': 'No pharmacy found for this user'
            }, status=404)
        
        # Log the token validation
        print(f"=== LOGIN TOKEN VALIDATED ===")
        print(f"Token: {token}")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"User ID: {login_token.user.id}")
        print(f"Expires at: {login_token.expires_at}")
        print("=== END TOKEN VALIDATION ===")
        
        return JsonResponse({
            'success': True,
            'message': 'Token is valid',
            'token': token,
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email,
            'pharmacy_email': pharmacy.business_email,  # Add this for compatibility
            'owner_name': f"{pharmacy.owner_first_name} {pharmacy.owner_last_name}",
            'expires_at': login_token.expires_at.isoformat()
        })
        
    except TemporaryLoginToken.DoesNotExist:
        print(f"ERROR: Token {token} not found")
        return JsonResponse({
            'error': 'Invalid token',
            'message': 'This login link is invalid. Please check the link or contact support.'
        }, status=404)
    except Exception as e:
        print(f"ERROR in validate_login_token: {e}")
        return JsonResponse({
            'error': 'Failed to validate token',
            'message': 'An error occurred while validating the token. Please try again.'
        }, status=500)


@csrf_exempt
def complete_user_setup(request, token):
    """Complete user setup by storing username and password"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.users.models import TemporaryLoginToken, User, Pharmacy
        from django.utils import timezone
        from django.contrib.auth.hashers import make_password
        import json
        
        # Get the token
        login_token = TemporaryLoginToken.objects.get(token=token)
        
        # Check if token is valid
        if not login_token.is_valid():
            if login_token.is_expired():
                return JsonResponse({
                    'error': 'Token expired',
                    'message': 'This login link has expired. Please contact support for a new link.'
                }, status=400)
            elif login_token.is_used:
                return JsonResponse({
                    'error': 'Token already used',
                    'message': 'This login link has already been used. Please contact support for a new link.'
                }, status=400)
        
        # Parse request data
        try:
            data = json.loads(request.body)
            username = data.get('username', '').strip()
            password = data.get('password', '').strip()
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid JSON',
                'message': 'Invalid request data format'
            }, status=400)
        
        # Validate required fields
        if not username:
            return JsonResponse({
                'error': 'Username required',
                'message': 'Username is required'
            }, status=400)
        
        if not password:
            return JsonResponse({
                'error': 'Password required',
                'message': 'Password is required'
            }, status=400)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'error': 'Username taken',
                'message': 'This username is already taken. Please choose another one.'
            }, status=400)
        
        # Validate password strength using the model's method
        user = login_token.user
        user.password = password  # Temporarily set for validation
        
        if not user._is_strong_password():
            return JsonResponse({
                'error': 'Weak password',
                'message': 'Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.'
            }, status=400)
        
        # Update user with username and password
        user.username = username
        user.set_password(password)  # This properly hashes the password
        user.status = User.UserStatus.ACTIVE
        user.is_email_verified = True  # Since they came through email verification
        user.save()
        
        # Mark token as used
        login_token.mark_as_used()
        
        # Get pharmacy information for response
        try:
            pharmacy = Pharmacy.objects.get(user=user)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'message': 'No pharmacy found for this user'
            }, status=404)
        
        # Log the successful setup
        print(f"=== USER SETUP COMPLETED ===")
        print(f"Token: {token}")
        print(f"User ID: {user.id}")
        print(f"Username: {username}")
        print(f"Email: {user.email}")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"Setup completed at: {timezone.now()}")
        print("=== END USER SETUP ===")
        
        return JsonResponse({
            'success': True,
            'message': 'User setup completed successfully',
            'user': {
                'id': user.id,
                'username': username,
                'email': user.email,
                'role': user.role,
                'status': user.status
            },
            'pharmacy': {
                'id': pharmacy.id,
                'name': pharmacy.pharmacy_name,
                'business_email': pharmacy.business_email
            }
        })
        
    except TemporaryLoginToken.DoesNotExist:
        print(f"ERROR: Token {token} not found")
        return JsonResponse({
            'error': 'Invalid token',
            'message': 'This login link is invalid. Please check the link or contact support.'
        }, status=404)
    except Exception as e:
        print(f"ERROR in complete_user_setup: {e}")
        return JsonResponse({
            'error': 'Failed to complete setup',
            'message': 'An error occurred while completing the setup. Please try again.'
        }, status=500)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test/', test_api),
    path('api/ping/', views.ping),
    path('api/pharmacy-stats/', direct_pharmacy_stats),  # Direct endpoint bypassing all auth
    path('api/pending-pharmacies/', direct_pending_pharmacies),  # Direct endpoint for pending pharmacies
    path('api/pharmacy-details/<int:pharmacy_id>/', direct_pharmacy_details),  # Direct endpoint for pharmacy details
    path('api/document/<int:document_id>/', serve_document),  # Direct endpoint for serving documents
    path('api/approve-pharmacy/<int:pharmacy_id>/', approve_pharmacy),  # Direct endpoint for approving pharmacy
    path('api/generate-login-token/<int:pharmacy_id>/', generate_login_token),  # Direct endpoint for generating login token
    path('api/validate-login-token/<str:token>/', validate_login_token),  # Direct endpoint for validating login token
    path('api/complete-user-setup/<str:token>/', complete_user_setup),  # Direct endpoint for completing user setup
    
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


