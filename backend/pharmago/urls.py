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
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.decorators.csrf import csrf_exempt
from api import views
from api.orders.direct_endpoints import direct_prescription_order_creation, get_order_status
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
import os


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


def direct_rider_stats(request):
    """Direct rider statistics endpoint that bypasses all authentication"""
    try:
        from api.users.models import Rider, UserDocument, ValidID

        total_riders = Rider.objects.filter(status='approved').count()
        pending_approvals = Rider.objects.filter(status='pending').count()
        active_riders = Rider.objects.filter(status='approved').count()
        suspended_riders = Rider.objects.filter(status='suspended').count()

        # Pending riders brief data
        pending_riders_data = []
        for r in Rider.objects.filter(status='pending').select_related('user').order_by('-created_at')[:500]:
            pending_riders_data.append({
                'id': r.id,
                'first_name': r.first_name,
                'last_name': r.last_name,
                'email': getattr(r.user, 'email', None),
                'phone_number': getattr(r.user, 'phone_number', None),
                'vehicle_type': r.vehicle_type,
                'plate_number': r.plate_number,
            })

        return JsonResponse({
            'totalRiders': total_riders,
            'pendingApprovals': pending_approvals,
            'activeRiders': active_riders,
            'suspendedRiders': suspended_riders,
            'pendingRidersData': pending_riders_data,
        })
    except Exception as e:
        print(f"ERROR in direct_rider_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch rider statistics',
            'totalRiders': 0,
            'pendingApprovals': 0,
            'activeRiders': 0,
            'suspendedRiders': 0,
            'pendingRidersData': []
        }, status=500)

@csrf_exempt
def direct_rider_details(request, rider_id):
    """Direct endpoint to fetch detailed rider info, including driver's license documents."""
    try:
        from api.users.models import Rider, UserDocument
        from django.forms.models import model_to_dict

        rider = Rider.objects.select_related('user').get(id=rider_id)
        user = rider.user

        # Collect driver's license docs
        docs_qs = user.documents.all()
        documents = []
        for d in docs_qs:
            is_dl = False
            try:
                if getattr(d.id_type, 'name', '') == 'drivers_license':
                    is_dl = True
            except Exception:
                pass
            if not is_dl and (d.file_url or ''):
                if 'drivers_licenses/' in d.file_url:
                    is_dl = True
            if is_dl:
                documents.append({
                    'id': d.id,
                    'file_url': d.file_url,
                    'status': d.status,
                    'document_type': 'drivers_license',
                })

        payload = {
            'id': rider.id,
            'first_name': rider.first_name,
            'last_name': rider.last_name,
            'middle_name': rider.middle_name,
            'date_of_birth': rider.date_of_birth.isoformat() if rider.date_of_birth else None,
            'gender': rider.gender,
            'vehicle_type': rider.vehicle_type,
            'vehicle_brand': rider.vehicle_brand,
            'vehicle_model': rider.vehicle_model,
            'plate_number': rider.plate_number,
            'vehicle_color': rider.vehicle_color,
            'status': rider.status,
            'email': getattr(user, 'email', None),
            'phone_number': getattr(user, 'phone_number', None),
            'documents': documents,
        }

        return JsonResponse(payload)
    except Rider.DoesNotExist:
        return JsonResponse({'error': 'Rider not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': 'Failed to fetch rider details', 'message': str(e)}, status=500)

@csrf_exempt
def approve_rider_direct(request, rider_id):
    """Direct endpoint to approve a rider application."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    try:
        from api.users.models import Rider, User
        from django.utils import timezone

        rider = Rider.objects.select_related('user').get(id=rider_id)
        # Promote to approved
        rider.status = 'approved'
        rider.is_fully_verified = True
        rider.verified_at = timezone.now()
        try:
            admin_user = User.objects.filter(role='admin', is_superuser=True).first()
            rider.verified_by = admin_user
        except Exception:
            pass
        rider.save()

        # Activate user account
        rider.user.status = 'active'
        rider.user.save(update_fields=['status'])

        return JsonResponse({
            'success': True,
            'email': rider.user.email,
            'phone_number': rider.user.phone_number,
        })
    except Rider.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Rider not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Failed to approve rider', 'message': str(e)}, status=500)


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


def direct_active_pharmacies(request):
    """Direct approved pharmacies endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy, UserDocument, ValidID
        
        active_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=True,
            status='approved',
        ).order_by('pharmacy_name')
        
        data = []
        for p in active_pharmacies:
            # Get storefront image URL from UserDocument
            storefront_image_url = None
            storefront_document_id = None
            try:
                # Look for storefront image document
                storefront_doc = UserDocument.objects.filter(
                    user=p.user,
                    id_type__name__icontains='storefront'
                ).first()
                
                if not storefront_doc:
                    # Try alternative search patterns
                    storefront_doc = UserDocument.objects.filter(
                        user=p.user,
                        document_file__icontains='storefront'
                    ).first()
                
                if storefront_doc:
                    storefront_document_id = storefront_doc.id
                    # Prefer presigned S3 URL for mobile compatibility
                    try:
                        import boto3
                        from urllib.parse import urlparse
                        from botocore.config import Config
                        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
                        region = os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2')
                        parsed = urlparse(storefront_doc.file_url)
                        key = parsed.path.lstrip('/')
                        if key.startswith(f"{bucket_name}/"):
                            key = key[len(bucket_name) + 1:]
                        s3_client = boto3.client(
                            's3',
                            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                            region_name=region,
                            endpoint_url=f"https://s3.{region}.amazonaws.com",
                            config=Config(signature_version='s3v4')
                        )
                        presigned = s3_client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': bucket_name, 'Key': key},
                            ExpiresIn=3600
                        )
                        storefront_image_url = presigned
                    except Exception as _e:
                        # Fallback to backend proxy (new dedicated endpoint preferred)
                        try:
                            storefront_image_url = request.build_absolute_uri(f"/api/pharmacy-storefront/{p.id}/")
                        except Exception:
                            storefront_image_url = request.build_absolute_uri(f"/api/document/{storefront_doc.id}/")
            except Exception as e:
                print(f"Error fetching storefront image for pharmacy {p.id}: {e}")
            
            data.append({
                'id': p.id,
                'pharmacy_name': p.pharmacy_name,
                'business_phone': p.business_phone,
                'business_email': p.business_email,
                'street_address': p.street_address,
                'barangay': p.barangay,
                'city': p.city,
                'province': p.province,
                'postal_code': p.postal_code,
                'latitude': p.latitude,
                'longitude': p.longitude,
                'operating_hours': getattr(p, 'operating_hours', None),
                'status': p.status,
                'is_fully_verified': p.is_fully_verified,
                'storefront_image_url': storefront_image_url,
                'storefront_document_id': storefront_document_id,
            })
        
        return JsonResponse(data, safe=False)
    except Exception as e:
        print(f"ERROR in direct_active_pharmacies: {e}")
        return JsonResponse({
            'error': 'Failed to fetch active pharmacies',
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
            
            # Extract bucket and key from URL robustly
            from urllib.parse import urlparse
            import mimetypes
            bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
            parsed = urlparse(document.file_url)
            path = parsed.path.lstrip('/')  # e.g., 'bucket/key' or just 'key'
            # If path starts with bucket name, strip it
            if path.startswith(f"{bucket_name}/"):
                key = path[len(bucket_name) + 1:]
            else:
                key = path
            
            # Fetch the object from S3
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            file_content = response['Body'].read()
            
            # Determine content type based on file extension in path (ignore query params)
            guessed, _ = mimetypes.guess_type(parsed.path)
            content_type = response.get('ContentType') or guessed or 'application/octet-stream'
            
            # Return the file content
            django_response = HttpResponse(file_content, content_type=content_type)
            # Propagate size headers when available
            content_length = response.get('ContentLength')
            if content_length is not None:
                django_response['Content-Length'] = str(content_length)
            django_response['Accept-Ranges'] = 'bytes'
            django_response['Cache-Control'] = 'public, max-age=86400'
            # Best-effort filename
            filename_ext = os.path.splitext(parsed.path)[1] or ''
            django_response['Content-Disposition'] = f'inline; filename="{(document.id_type.name if document.id_type else "document")} {document.id}{filename_ext}"'
            return django_response
            
        except ClientError as e:
            print(f"ERROR fetching document from S3: {e}")
            # Fallback: redirect to original S3 URL if accessible
            try:
                from django.shortcuts import redirect
                return redirect(document.file_url)
            except Exception as _:
                raise Http404("Unable to fetch document")
        except Exception as e:
            print(f"ERROR unexpected when serving document: {e}")
            try:
                from django.shortcuts import redirect
                return redirect(document.file_url)
            except Exception as _:
                raise Http404("Error serving document")
            
    except UserDocument.DoesNotExist:
        print(f"ERROR: Document with ID {document_id} not found")
        raise Http404("Document not found")
    except Exception as e:
        print(f"ERROR in serve_document: {e}")
        raise Http404("Error serving document")


def serve_pharmacy_storefront(request, pharmacy_id):
    """Serve pharmacy storefront image through backend proxy.
    Looks up the pharmacy's storefront UserDocument and streams via S3 get_object.
    """
    from django.http import HttpResponse, Http404
    import boto3
    from botocore.exceptions import ClientError
    from urllib.parse import urlparse
    from api.users.models import Pharmacy, UserDocument

    try:
        pharmacy = Pharmacy.objects.get(id=pharmacy_id)

        # Find storefront doc by id_type name contains 'storefront' or filename contains 'storefront'
        storefront_doc = UserDocument.objects.filter(
            user=pharmacy.user,
            id_type__name__icontains='storefront'
        ).first()
        if not storefront_doc:
            storefront_doc = UserDocument.objects.filter(
                user=pharmacy.user,
                document_file__icontains='storefront'
            ).first()

        if not storefront_doc or not storefront_doc.file_url:
            raise Http404("Storefront image not found")

        # Use boto3 to fetch the file from S3
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2')
        )

        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
        parsed = urlparse(storefront_doc.file_url)
        path = parsed.path.lstrip('/')
        if path.startswith(f"{bucket_name}/"):
            key = path[len(bucket_name) + 1:]
        else:
            key = path

        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        file_content = response['Body'].read()
        content_type = response.get('ContentType') or 'image/jpeg'

        django_response = HttpResponse(file_content, content_type=content_type)
        content_length = response.get('ContentLength')
        if content_length is not None:
            django_response['Content-Length'] = str(content_length)
        django_response['Cache-Control'] = 'public, max-age=86400'
        django_response['Accept-Ranges'] = 'bytes'
        return django_response

    except Pharmacy.DoesNotExist:
        raise Http404("Pharmacy not found")
    except ClientError as e:
        print(f"ERROR fetching storefront from S3: {e}")
        # Last resort: try redirecting to the original S3 URL
        try:
            from django.shortcuts import redirect
            return redirect(storefront_doc.file_url)
        except Exception:
            raise Http404("Unable to fetch storefront image")
    except Exception as e:
        print(f"ERROR in serve_pharmacy_storefront: {e}")
        raise Http404("Error serving storefront image")

def document_presigned_url(request, document_id):
    """Return a presigned S3 URL for a given UserDocument id (dev-only direct endpoint)."""
    try:
        from api.users.models import UserDocument
        import boto3
        from urllib.parse import urlparse
        import os

        doc = UserDocument.objects.get(id=document_id)
        if not doc.file_url:
            return JsonResponse({'success': False, 'error': 'Document has no file_url'}, status=404)

        bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'pharmago-user-uploads')
        parsed = urlparse(doc.file_url)
        key = parsed.path.lstrip('/')
        if key.startswith(f"{bucket_name}/"):
            key = key[len(bucket_name) + 1:]

        s3 = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2')
        )

        url = s3.generate_presigned_url(
            'get_object', Params={'Bucket': bucket_name, 'Key': key}, ExpiresIn=3600
        )
        return JsonResponse({'success': True, 'url': url})
    except UserDocument.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Document not found'}, status=404)
    except Exception as e:
        print(f"ERROR in document_presigned_url: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


def aws_diagnostics(request):
    """Simple diagnostics endpoint to verify AWS credentials and bucket access in dev."""
    try:
        import boto3
        import os
        sts = boto3.client(
            'sts',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_S3_REGION_NAME', 'ap-southeast-2')
        )
        ident = sts.get_caller_identity()
        return JsonResponse({
            'success': True,
            'account': ident.get('Account'),
            'arn': ident.get('Arn'),
            'user_id': ident.get('UserId'),
            'region': os.getenv('AWS_S3_REGION_NAME'),
            'bucket': os.getenv('AWS_STORAGE_BUCKET_NAME'),
        })
    except Exception as e:
        print(f"ERROR in aws_diagnostics: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def serve_prescription_image(request, order_id):
    """Serve prescription image through Django backend to handle S3 access"""
    from api.orders.models import Order
    from django.http import HttpResponse, Http404
    import boto3
    from botocore.exceptions import ClientError
    import os
    
    try:
        # Get the order
        order = Order.objects.get(id=order_id)
        
        if not order.prescription_image_url:
            raise Http404("Prescription image not found")
        
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
            url_parts = order.prescription_image_url.split('/')
            key = '/'.join(url_parts[3:])  # Everything after the bucket name
            
            # Fetch the object from S3
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            file_content = response['Body'].read()
            
            # Determine content type based on file extension
            content_type = 'application/octet-stream'
            if order.prescription_image_url.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif order.prescription_image_url.lower().endswith('.png'):
                content_type = 'image/png'
            elif order.prescription_image_url.lower().endswith('.pdf'):
                content_type = 'application/pdf'
            elif order.prescription_image_url.lower().endswith('.gif'):
                content_type = 'image/gif'
            
            # Return the file content
            django_response = HttpResponse(
                file_content,
                content_type=content_type
            )
            django_response['Content-Disposition'] = f'inline; filename="prescription_{order_id}.{order.prescription_image_url.split(".")[-1]}"'
            return django_response
            
        except ClientError as e:
            print(f"ERROR fetching prescription image from S3: {e}")
            raise Http404("Unable to fetch prescription image")
            
    except Order.DoesNotExist:
        print(f"ERROR: Order with ID {order_id} not found")
        raise Http404("Order not found")
    except Exception as e:
        print(f"ERROR in serve_prescription_image: {e}")
        raise Http404("Error serving prescription image")


@csrf_exempt
def upload_prescription_image(request):
    """Upload prescription image to default storage (e.g., S3) and return a public URL.
    Optionally updates an order's prescription_image_url when order_id is provided."""
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'error': 'Method not allowed'
        }, status=405)

    try:
        from django.core.files.storage import default_storage
        from django.utils import timezone
        from api.orders.models import Order
        import uuid
        import os

        file_obj = request.FILES.get('file') or request.FILES.get('image')
        if not file_obj:
            return JsonResponse({
                'success': False,
                'error': 'No file uploaded. Use form-data with key "file" or "image".'
            }, status=400)

        # Build deterministic path: prescriptions/YYYY/MM/DD/uuid.ext
        today_path = timezone.now().strftime('%Y/%m/%d')
        _, ext = os.path.splitext(file_obj.name or '')
        if not ext:
            ext = '.jpg'
        filename = f"prescriptions/{today_path}/{uuid.uuid4().hex}{ext}"

        saved_path = default_storage.save(filename, file_obj)
        file_url = default_storage.url(saved_path)

        order_id = request.POST.get('order_id') or request.GET.get('order_id')
        updated = False
        if order_id:
            try:
                order = Order.objects.get(id=int(order_id))
                order.prescription_image_url = file_url
                order.save(update_fields=['prescription_image_url'])
                updated = True
            except (Order.DoesNotExist, ValueError):
                pass

        return JsonResponse({
            'success': True,
            'url': file_url,
            'order_id': order_id,
            'order_updated': updated
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'Upload failed',
            'message': str(e)
        }, status=500)

@csrf_exempt
def upload_driver_license_image(request):
    """Upload driver's license image and create/update UserDocument for the current or specified user.

    Form fields:
      - file: binary image
      - user_id (optional): int
    Response: { success, url, document_id? }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    try:
        from django.core.files.storage import default_storage
        from django.utils import timezone
        from api.users.models import User, UserDocument
        import uuid, os

        file_obj = request.FILES.get('file') or request.FILES.get('image')
        if not file_obj:
            return JsonResponse({'success': False, 'error': 'No file uploaded'}, status=400)

        today_path = timezone.now().strftime('%Y/%m/%d')
        _, ext = os.path.splitext(file_obj.name or '')
        if not ext:
            ext = '.jpg'
        filename = f"drivers_licenses/{today_path}/{uuid.uuid4().hex}{ext}"

        saved_path = default_storage.save(filename, file_obj)
        file_url = default_storage.url(saved_path)

        # Resolve user
        user_id_str = request.POST.get('user_id') or request.GET.get('user_id')
        user = None
        if user_id_str:
            try:
                user = User.objects.get(id=int(user_id_str))
            except (User.DoesNotExist, ValueError):
                user = None

        document = None
        if user:
            try:
                document = UserDocument.objects.create(
                    user=user,
                    id_type=None,
                    file_url=file_url,
                    document_file=file_url,
                    status='uploaded'
                )
            except Exception:
                document = None

        return JsonResponse({
            'success': True,
            'url': file_url,
            'document_id': getattr(document, 'id', None)
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Upload failed', 'message': str(e)}, status=500)


    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'Upload failed',
            'message': str(e)
        }, status=500)

@csrf_exempt
def complete_rider_registration(request):
    """Direct endpoint to create User, Rider, and UserDocument entries for a rider registration.

    Expected JSON body:
      {
        user: { username, email, phone_number, password, role='rider', first_name, last_name },
        rider: { first_name, last_name, middle_name, date_of_birth, gender, vehicle_*..., drivers_license_uploaded },
        documents: [{ id_type: 'drivers_license', file_url }]
      }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    import json
    try:
        payload = json.loads(request.body or '{}')

        from api.users.models import User, Rider, UserDocument, ValidID
        from django.db import transaction

        user_data = payload.get('user') or {}
        rider_data = payload.get('rider') or {}
        documents = payload.get('documents') or []

        # Basic validations
        required_user = ['email', 'phone_number', 'password']
        for f in required_user:
            if not user_data.get(f):
                return JsonResponse({'success': False, 'error': f'Missing user field: {f}'}, status=400)

        if user_data.get('role') != 'rider':
            user_data['role'] = 'rider'

        with transaction.atomic():
            # Create user
            username = user_data.get('username') or user_data.get('email')
            # Create as 'customer' first to avoid Rider signal creating an incomplete Rider
            user = User.objects.create_user(
                email=user_data.get('email'),
                phone_number=user_data.get('phone_number'),
                password=user_data.get('password'),
                username=username,
                role='customer',
                first_name=user_data.get('first_name') or rider_data.get('first_name') or '',
                last_name=user_data.get('last_name') or rider_data.get('last_name') or '',
                status=User.UserStatus.PENDING
            )

            # Create rider profile
            # Parse and validate date_of_birth
            from django.utils.dateparse import parse_date
            dob_raw = rider_data.get('date_of_birth')
            dob = None
            if isinstance(dob_raw, str):
                dob = parse_date(dob_raw)
            elif isinstance(dob_raw, (int, float)):
                # Support epoch ms/seconds (rare)
                try:
                    import datetime
                    # assume seconds if small, ms if large
                    ts = int(dob_raw)
                    if ts > 10_000_000_000:
                        ts = ts / 1000
                    dob = datetime.date.fromtimestamp(ts)
                except Exception:
                    dob = None
            elif hasattr(dob_raw, 'year'):
                dob = dob_raw

            if dob is None:
                return JsonResponse({'success': False, 'error': 'Invalid or missing rider.date_of_birth (YYYY-MM-DD)'}, status=400)

            if not rider_data.get('gender'):
                return JsonResponse({'success': False, 'error': 'Missing rider.gender'}, status=400)
            if not rider_data.get('vehicle_type'):
                return JsonResponse({'success': False, 'error': 'Missing rider.vehicle_type'}, status=400)

            rider = Rider.objects.create(
                user=user,
                first_name=rider_data.get('first_name') or user.first_name,
                last_name=rider_data.get('last_name') or user.last_name,
                middle_name=rider_data.get('middle_name') or None,
                date_of_birth=dob,
                gender=rider_data.get('gender'),
                vehicle_type=rider_data.get('vehicle_type'),
                vehicle_brand=rider_data.get('vehicle_brand') or None,
                vehicle_model=rider_data.get('vehicle_model') or None,
                plate_number=rider_data.get('plate_number') or None,
                vehicle_color=rider_data.get('vehicle_color') or None,
                drivers_license_uploaded=bool(rider_data.get('drivers_license_uploaded')),
            )

            # Promote user to rider role after successful rider profile creation
            user.role = 'rider'
            user.save(update_fields=['role'])

            # Create user documents
            for doc in documents:
                id_type_code = doc.get('id_type')
                file_url = doc.get('file_url')
                if not id_type_code or not file_url:
                    continue
                try:
                    id_type = ValidID.objects.get(name=id_type_code)
                except ValidID.DoesNotExist:
                    # Auto-create drivers_license type if not present
                    if id_type_code == 'drivers_license':
                        id_type = ValidID.objects.create(name='drivers_license', category='primary', description='Driver\'s License')
                    else:
                        continue
                UserDocument.objects.create(
                    user=user,
                    id_type=id_type,
                    file_url=file_url,
                    document_file=file_url,
                    status=UserDocument.DocumentStatus.PENDING
                )

        return JsonResponse({'success': True, 'user_id': user.id})
    except Exception as e:
        return JsonResponse({'success': False, 'error': 'Registration failed', 'message': str(e)}, status=500)

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


def direct_medicine_catalog(request):
    """Direct medicine catalog endpoint that bypasses all authentication"""
    try:
        from api.inventory.models import MedicineCatalog, MedicineCategory
        from django.db.models import Q
        
        # Get query parameters
        search_query = request.GET.get('search', '').strip()
        category_id = request.GET.get('category', '').strip()
        form_filter = request.GET.get('form', '').strip()
        prescription_required = request.GET.get('prescription_required', '').strip()
        limit = request.GET.get('limit', '100')
        
        # Start with active, FDA-approved medicines
        medicines = MedicineCatalog.objects.filter(
            is_active=True,
            fda_approval=True
        ).select_related('category')
        
        # Apply filters
        if search_query:
            medicines = medicines.filter(
                Q(name__icontains=search_query) |
                Q(generic_name__icontains=search_query) |
                Q(therapeutic_class__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if category_id:
            try:
                medicines = medicines.filter(category_id=int(category_id))
            except ValueError:
                pass
        
        if form_filter:
            medicines = medicines.filter(form=form_filter)
        
        if prescription_required.lower() in ['true', 'false']:
            medicines = medicines.filter(prescription_required=prescription_required.lower() == 'true')
        
        # Apply limit
        try:
            limit_int = int(limit)
            medicines = medicines[:limit_int]
        except ValueError:
            medicines = medicines[:100]
        
        # Build response data
        medicines_data = []
        for medicine in medicines:
            medicine_data = {
                'id': medicine.id,
                'name': medicine.name,
                'generic_name': medicine.generic_name,
                'form': medicine.form,
                'dosage': medicine.dosage,
                'description': medicine.description,
                'prescription_required': medicine.prescription_required,
                'controlled_substance': medicine.controlled_substance,
                'therapeutic_class': medicine.therapeutic_class,
                'fda_number': medicine.fda_number,
                'category': {
                    'id': medicine.category.id,
                    'name': medicine.category.name
                } if medicine.category else None,
                'active_ingredients': medicine.active_ingredients,
                'storage_conditions': medicine.storage_conditions,
                'shelf_life': medicine.shelf_life
            }
            medicines_data.append(medicine_data)
        
        # Log the request
        print(f"=== MEDICINE CATALOG REQUEST ===")
        print(f"Search: {search_query}")
        print(f"Category: {category_id}")
        print(f"Form: {form_filter}")
        print(f"Prescription Required: {prescription_required}")
        print(f"Found {len(medicines_data)} medicines")
        print("=== END MEDICINE CATALOG REQUEST ===")
        
        return JsonResponse({
            'success': True,
            'count': len(medicines_data),
            'medicines': medicines_data
        })
        
    except Exception as e:
        print(f"ERROR in direct_medicine_catalog: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to fetch medicine catalog',
            'count': 0,
            'medicines': []
        }, status=500)


@csrf_exempt
def add_medicines_to_inventory(request):
    """Add selected medicines to pharmacy inventory"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.inventory.models import MedicineCatalog, MedicineCategory, PharmacyInventory
        from api.users.models import Pharmacy
        import json
        
        # Parse request data
        try:
            data = json.loads(request.body)
            pharmacy_id = data.get('pharmacy_id')
            medicines = data.get('medicines', [])
            default_stock = data.get('default_stock', 0)
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid JSON',
                'message': 'Invalid request data format'
            }, status=400)
        
        # Validate required fields
        if not pharmacy_id:
            return JsonResponse({
                'error': 'Pharmacy ID required',
                'message': 'Pharmacy ID is required'
            }, status=400)
        
        if not medicines or not isinstance(medicines, list):
            return JsonResponse({
                'error': 'Medicines required',
                'message': 'Medicines list is required'
            }, status=400)
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'message': f'No pharmacy found with ID {pharmacy_id}'
            }, status=404)
        
        # Process each medicine
        added_medicines = []
        skipped_medicines = []
        
        for medicine_data in medicines:
            try:
                medicine_id = medicine_data.get('id')
                if not medicine_id:
                    continue
                
                # Get medicine from catalog
                try:
                    medicine = MedicineCatalog.objects.get(id=medicine_id)
                except MedicineCatalog.DoesNotExist:
                    skipped_medicines.append({
                        'id': medicine_id,
                        'name': medicine_data.get('name', 'Unknown'),
                        'reason': 'Medicine not found in catalog'
                    })
                    continue
                
                # Check if already exists in pharmacy inventory
                existing_inventory = PharmacyInventory.objects.filter(
                    pharmacy=pharmacy,
                    medicine=medicine
                ).first()
                
                if existing_inventory:
                    skipped_medicines.append({
                        'id': medicine_id,
                        'name': medicine.name,
                        'reason': 'Already exists in inventory'
                    })
                    continue
                
                # Get pricing data
                pricing = medicine_data.get('pricing', {})
                price = pricing.get('price', 0.00)
                original_price = pricing.get('original_price', price)  # Default to price if not set
                cost_price = pricing.get('cost_price', 0.00)
                
                # Create pharmacy inventory entry
                inventory_item = PharmacyInventory.objects.create(
                    pharmacy=pharmacy,
                    medicine=medicine,
                    category=medicine.category,
                    name=medicine.name,
                    form=medicine.form,
                    dosage=medicine.dosage,
                    description=medicine.description,
                    prescription_required=medicine.prescription_required,
                    price=price,
                    original_price=original_price,
                    cost_price=cost_price,
                    stock_quantity=default_stock,
                    min_stock_level=10,
                    max_stock_level=1000,
                    is_available=True
                )
                
                added_medicines.append({
                    'id': inventory_item.id,
                    'medicine_id': medicine.id,
                    'name': medicine.name,
                    'generic_name': medicine.generic_name,
                    'form': medicine.form,
                    'dosage': medicine.dosage,
                    'category': medicine.category.name if medicine.category else 'Uncategorized',
                    'price': float(inventory_item.price),
                    'original_price': float(inventory_item.original_price),
                    'cost_price': float(inventory_item.cost_price),
                    'stock_quantity': inventory_item.stock_quantity
                })
                
            except Exception as e:
                print(f"Error processing medicine {medicine_data.get('id', 'unknown')}: {e}")
                skipped_medicines.append({
                    'id': medicine_data.get('id', 'unknown'),
                    'name': medicine_data.get('name', 'Unknown'),
                    'reason': f'Error: {str(e)}'
                })
        
        # Log the operation
        print(f"=== ADD MEDICINES TO INVENTORY ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy.id})")
        print(f"Requested: {len(medicines)} medicines")
        print(f"Added: {len(added_medicines)} medicines")
        print(f"Skipped: {len(skipped_medicines)} medicines")
        print("=== END ADD MEDICINES ===")
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully added {len(added_medicines)} medicines to inventory',
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'added_medicines': added_medicines,
            'skipped_medicines': skipped_medicines,
            'total_requested': len(medicines),
            'total_added': len(added_medicines),
            'total_skipped': len(skipped_medicines)
        })
        
    except Exception as e:
        print(f"ERROR in add_medicines_to_inventory: {e}")
        return JsonResponse({
            'error': 'Failed to add medicines to inventory',
            'message': 'An error occurred while adding medicines. Please try again.'
        }, status=500)


@csrf_exempt
def add_custom_products_to_inventory(request):
    """Add custom products to pharmacy inventory"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.inventory.models import PharmacyInventory
        from api.users.models import Pharmacy
        import json
        
        # Parse request data
        try:
            data = json.loads(request.body)
            pharmacy_id = data.get('pharmacy_id')
            custom_products = data.get('custom_products', [])
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid JSON',
                'message': 'Invalid request data format'
            }, status=400)
        
        # Validate input
        if not pharmacy_id:
            return JsonResponse({
                'error': 'Pharmacy ID required',
                'message': 'Pharmacy ID is required'
            }, status=400)
        if not custom_products or not isinstance(custom_products, list):
            return JsonResponse({
                'error': 'Custom products required',
                'message': 'Custom products list is required'
            }, status=400)
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'message': f'No pharmacy found with ID {pharmacy_id}'
            }, status=404)
        
        # Process each custom product
        added_products = []
        skipped_products = []
        
        print(f"=== PROCESSING CUSTOM PRODUCTS ===")
        print(f"Total products to process: {len(custom_products)}")
        
        for i, product_data in enumerate(custom_products):
            print(f"Processing product {i+1}: {product_data}")
            try:
                name = product_data.get('name', '').strip()
                form = product_data.get('form', '').strip()
                dosage = product_data.get('dosage', '').strip()
                description = product_data.get('description', '').strip()
                prescription_required = product_data.get('prescription_required', False)
                price = product_data.get('price', 0)
                original_price = product_data.get('original_price', 0)
                cost_price = product_data.get('cost_price', 0)
                
                print(f"  - Name: '{name}' (length: {len(name)})")
                print(f"  - Form: '{form}' (length: {len(form)})")
                print(f"  - Dosage: '{dosage}'")
                print(f"  - Price: {price}")
                
                if not name or not form:
                    print(f"  - SKIPPED: Missing required fields")
                    skipped_products.append({
                        'name': name or 'Unknown',
                        'reason': 'Missing required fields (name or form)'
                    })
                    continue
                
                # Check if product with same name already exists in pharmacy inventory
                existing_product = PharmacyInventory.objects.filter(
                    pharmacy=pharmacy,
                    name__iexact=name
                ).first()
                
                if existing_product:
                    skipped_products.append({
                        'name': name,
                        'reason': 'Product with this name already exists in inventory'
                    })
                    continue
                
                # Get the selected category
                from api.inventory.models import MedicineCategory
                try:
                    selected_category = MedicineCategory.objects.get(id=product_data.get('category'))
                except MedicineCategory.DoesNotExist:
                    # Fallback to default category if not found
                    selected_category, created = MedicineCategory.objects.get_or_create(
                        name='Custom Products',
                        defaults={
                            'description': 'Custom products created by pharmacies',
                            'is_active': True
                        }
                    )
                
                # Create custom product in pharmacy inventory
                print(f"  - Creating inventory item...")
                inventory_item = PharmacyInventory.objects.create(
                    pharmacy=pharmacy,
                    medicine=None,  # Custom products don't have medicine catalog reference
                    category=selected_category,  # Use selected category for custom products
                    name=name,
                    form=form,
                    dosage=dosage,
                    description=description,
                    prescription_required=prescription_required,
                    price=float(price) if price else 0.00,
                    original_price=float(original_price) if original_price else 0.00,
                    cost_price=float(cost_price) if cost_price else 0.00,
                    stock_quantity=0,  # Default stock
                    min_stock_level=10,
                    max_stock_level=1000,
                    is_available=True
                )
                print(f"  - SUCCESS: Created inventory item with ID {inventory_item.id}")
                
                added_products.append({
                    'id': inventory_item.id,
                    'name': name,
                    'form': form,
                    'dosage': dosage,
                    'description': description,
                    'prescription_required': prescription_required,
                    'price': float(inventory_item.price),
                    'original_price': float(inventory_item.original_price),
                    'cost_price': float(inventory_item.cost_price),
                    'stock_quantity': inventory_item.stock_quantity
                })
                
            except Exception as e:
                print(f"Error processing custom product {product_data.get('name', 'unknown')}: {e}")
                skipped_products.append({
                    'name': product_data.get('name', 'Unknown'),
                    'reason': f'Error: {str(e)}'
                })
        
        print(f"=== ADD CUSTOM PRODUCTS TO INVENTORY ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy.id})")
        print(f"Requested: {len(custom_products)} custom products")
        print(f"Added: {len(added_products)} custom products")
        print(f"Skipped: {len(skipped_products)} custom products")
        print("=== END ADD CUSTOM PRODUCTS ===")
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully added {len(added_products)} custom products to inventory',
            'pharmacy_id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'added_products': added_products,
            'skipped_products': skipped_products,
            'total_requested': len(custom_products),
            'total_added': len(added_products),
            'total_skipped': len(skipped_products)
        })
        
    except Exception as e:
        print(f"ERROR in add_custom_products_to_inventory: {e}")
        return JsonResponse({
            'error': 'Failed to add custom products to inventory',
            'message': 'An error occurred while adding custom products. Please try again.'
        }, status=500)


@csrf_exempt
def direct_user_registration(request):
    """Direct user registration endpoint that bypasses all authentication"""
    print(f"=== DIRECT USER REGISTRATION REQUEST ===")
    print(f"Method: {request.method}")
    print(f"Content-Type: {request.content_type}")
    print(f"Body: {request.body}")
    
    if request.method != 'POST':
        print("❌ Method not allowed")
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.users.models import User
        import json
        
        # Parse request data
        try:
            data = json.loads(request.body)
            print(f"Parsed data: {data}")
            username = data.get('username', '').strip()
            first_name = data.get('first_name', '').strip()
            last_name = data.get('last_name', '').strip()
            phone = data.get('phone', '').strip()
            email = data.get('email', '').strip()
            password = data.get('password', '').strip()
            password_confirm = data.get('password_confirm', '').strip()
            role = data.get('role', 'customer').strip()
            print(f"Extracted fields - username: {username}, email: {email}, phone: {phone}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
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
        
        if not first_name:
            return JsonResponse({
                'error': 'First name required',
                'message': 'First name is required'
            }, status=400)
        
        if not last_name:
            return JsonResponse({
                'error': 'Last name required',
                'message': 'Last name is required'
            }, status=400)
        
        if not phone:
            return JsonResponse({
                'error': 'Phone number required',
                'message': 'Phone number is required'
            }, status=400)
        
        if not email:
            return JsonResponse({
                'error': 'Email required',
                'message': 'Email is required'
            }, status=400)
        
        if not password:
            return JsonResponse({
                'error': 'Password required',
                'message': 'Password is required'
            }, status=400)
        
        if not password_confirm:
            return JsonResponse({
                'error': 'Password confirmation required',
                'message': 'Password confirmation is required'
            }, status=400)
        
        # Validate password match
        if password != password_confirm:
            return JsonResponse({
                'error': 'Password mismatch',
                'message': 'Passwords do not match'
            }, status=400)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'error': 'Username taken',
                'message': 'This username is already taken. Please choose another one.'
            }, status=400)
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'error': 'Email taken',
                'message': 'This email is already registered. Please use a different email.'
            }, status=400)
        
        # Create user using the model's create_user method
        try:
            print(f"Creating user with data:")
            print(f"  username: {username}")
            print(f"  email: {email}")
            print(f"  first_name: {first_name}")
            print(f"  last_name: {last_name}")
            print(f"  phone_number: {phone}")
            print(f"  role: {role}")
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone_number=phone,  # Note: model expects phone_number, not phone
                role=role,
                is_staff=False,  # Set to False as requested
                status='active'  # Set to active by default
            )
            print(f"✅ User created successfully with ID: {user.id}")
            
            # Log successful registration
            print(f"=== USER REGISTRATION SUCCESSFUL ===")
            print(f"Username: {username}")
            print(f"Email: {email}")
            print(f"Name: {first_name} {last_name}")
            print(f"Phone: {phone}")
            print(f"Role: {role}")
            print(f"User ID: {user.id}")
            print("=== END USER REGISTRATION ===")
            
            return JsonResponse({
                'success': True,
                'message': 'User registered successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone_number': user.phone_number,
                    'role': user.role,
                    'is_staff': user.is_staff,
                    'status': user.status
                }
            })
            
        except Exception as e:
            print(f"❌ ERROR creating user: {e}")
            print(f"Error type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({
                'error': 'Registration failed',
                'message': f'Failed to create user account: {str(e)}'
            }, status=500)
        
    except Exception as e:
        print(f"ERROR in direct_user_registration: {e}")
        return JsonResponse({
            'error': 'Registration failed',
            'message': 'An error occurred during registration. Please try again.'
        }, status=500)


@csrf_exempt
def pharmacy_login(request):
    """Direct pharmacy login endpoint that bypasses all authentication"""
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'message': 'Only POST requests are allowed'
        }, status=405)
    
    try:
        from api.users.models import User, Pharmacy
        from django.contrib.auth import authenticate
        import json
        
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
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if not user:
            return JsonResponse({
                'error': 'Invalid credentials',
                'message': 'Invalid username or password'
            }, status=401)
        
        # Check if user is a pharmacy user
        if user.role != 'pharmacy':
            return JsonResponse({
                'error': 'Access denied',
                'message': 'This login is only for pharmacy users'
            }, status=403)
        
        # Check if user is active
        if user.status != 'active':
            return JsonResponse({
                'error': 'Account inactive',
                'message': 'Your account is not active. Please contact support.'
            }, status=403)
        
        # Get pharmacy information
        try:
            pharmacy = Pharmacy.objects.get(user=user)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'message': 'No pharmacy found for this user'
            }, status=404)
        
        # Check if pharmacy is approved and verified
        if pharmacy.status != 'approved' or not pharmacy.is_fully_verified:
            return JsonResponse({
                'error': 'Pharmacy not approved',
                'message': 'Your pharmacy is not yet approved. Please wait for admin approval.'
            }, status=403)
        
        # Log successful login
        print(f"=== PHARMACY LOGIN SUCCESSFUL ===")
        print(f"Username: {username}")
        print(f"User ID: {user.id}")
        print(f"Pharmacy ID: {pharmacy.id}")
        print(f"Pharmacy Name: {pharmacy.pharmacy_name}")
        print(f"Business Email: {pharmacy.business_email}")
        print("=== END PHARMACY LOGIN ===")
        
        return JsonResponse({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'status': user.status,
                'first_name': user.first_name,
                'last_name': user.last_name
            },
            'pharmacy': {
                'id': pharmacy.id,
                'name': pharmacy.pharmacy_name,
                'business_email': pharmacy.business_email,
                'owner_first_name': pharmacy.owner_first_name,
                'owner_last_name': pharmacy.owner_last_name,
                'business_phone': pharmacy.business_phone,
                'barangay': pharmacy.barangay,
                'city': pharmacy.city,
                'status': pharmacy.status,
                'is_fully_verified': pharmacy.is_fully_verified
            }
        })
        
    except Exception as e:
        print(f"ERROR in pharmacy_login: {e}")
        return JsonResponse({
            'error': 'Login failed',
            'message': 'An error occurred during login. Please try again.'
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


def direct_medicine_categories(request):
    """Direct medicine categories endpoint that bypasses all authentication"""
    try:
        from api.inventory.models import MedicineCategory
        
        # Get all active categories
        categories = MedicineCategory.objects.filter(is_active=True).order_by('name')
        
        categories_data = []
        for category in categories:
            category_data = {
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'parent_category': category.parent_category.name if category.parent_category else None,
                'icon': category.icon,
                'color': category.color,
                'sort_order': category.sort_order
            }
            categories_data.append(category_data)
        
        print(f"=== MEDICINE CATEGORIES REQUEST ===")
        print(f"Found {len(categories_data)} categories")
        print("=== END MEDICINE CATEGORIES REQUEST ===")
        
        return JsonResponse({
            'success': True,
            'count': len(categories_data),
            'categories': categories_data
        })
        
    except Exception as e:
        print(f"ERROR in direct_medicine_categories: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to fetch medicine categories',
            'count': 0,
            'categories': []
        }, status=500)


def direct_pharmacy_inventory(request, pharmacy_id):
    """Direct pharmacy inventory endpoint that bypasses all authentication"""
    try:
        from api.inventory.models import PharmacyInventory, MedicineCategory
        from api.users.models import Pharmacy
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'pharmacy_id': pharmacy_id
            }, status=404)
        
        # Get all inventory items for this pharmacy
        inventory_items = PharmacyInventory.objects.filter(
            pharmacy=pharmacy
        ).select_related('category', 'medicine').order_by('category__name', 'name')
        
        # Group by category
        categories_data = {}
        for item in inventory_items:
            category_name = item.category.name if item.category else 'Uncategorized'
            
            if category_name not in categories_data:
                categories_data[category_name] = {
                    'category_name': category_name,
                    'items': []
                }
            
            # Build item data
            item_data = {
                'id': item.id,
                'name': item.display_name,
                'form': item.form,
                'dosage': item.dosage,
                'description': item.display_description,
                'prescription_required': item.prescription_required,
                'price': float(item.price),
                'original_price': float(item.original_price) if item.original_price else None,
                'cost_price': float(item.cost_price) if item.cost_price else None,
                'stock_quantity': item.stock_quantity,
                'min_stock_level': item.min_stock_level,
                'max_stock_level': item.max_stock_level,
                'is_available': item.is_available,
                'is_featured': item.is_featured,
                'is_on_sale': item.is_on_sale,
                'discount_percentage': item.discount_percentage,
                'manufacturer': item.manufacturer,
                'batch_number': item.batch_number,
                'expiry_date': item.expiry_date.isoformat() if item.expiry_date else None,
                'is_custom_product': item.is_custom_product,
                'is_from_catalog': item.is_from_catalog,
                'created_at': item.created_at.isoformat(),
                'updated_at': item.updated_at.isoformat()
            }
            
            categories_data[category_name]['items'].append(item_data)
        
        # Convert to list format
        categories_list = list(categories_data.values())
        
        # Calculate statistics
        total_items = inventory_items.count()
        available_items = inventory_items.filter(is_available=True).count()
        out_of_stock_items = inventory_items.filter(stock_quantity=0).count()
        from django.db import models
        low_stock_items = inventory_items.filter(
            stock_quantity__lte=models.F('min_stock_level'),
            stock_quantity__gt=0
        ).count()
        
        # Log the request
        print(f"=== PHARMACY INVENTORY REQUEST ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy_id})")
        print(f"Total items: {total_items}")
        print(f"Available items: {available_items}")
        print(f"Out of stock: {out_of_stock_items}")
        print(f"Low stock: {low_stock_items}")
        print(f"Categories: {len(categories_list)}")
        print("=== END PHARMACY INVENTORY REQUEST ===")
        
        return JsonResponse({
            'success': True,
            'pharmacy_id': pharmacy_id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'total_items': total_items,
            'available_items': available_items,
            'out_of_stock_items': out_of_stock_items,
            'low_stock_items': low_stock_items,
            'categories': categories_list
        })
        
    except Exception as e:
        print(f"ERROR in direct_pharmacy_inventory: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to fetch pharmacy inventory',
            'pharmacy_id': pharmacy_id,
            'categories': []
        }, status=500)


def direct_pharmacy_orders(request, pharmacy_id):
    """Direct pharmacy orders endpoint that bypasses all authentication"""
    try:
        from api.orders.models import Order, OrderLine
        from api.users.models import Pharmacy
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'error': 'Pharmacy not found',
                'pharmacy_id': pharmacy_id
            }, status=404)
        
        # Get orders for this pharmacy using the visibility pattern
        # Order → OrderLine → PharmacyInventory → Pharmacy
        orders = Order.objects.filter(
            order_lines__inventory_item__pharmacy=pharmacy
        ).distinct().select_related('customer', 'delivery_address').order_by('-created_at')
        
        # Group orders by status
        orders_data = {
            'pending': [],
            'preparing': [],
            'ready': []
        }
        
        for order in orders:
            # Get order lines for this pharmacy
            order_lines = order.order_lines.filter(
                inventory_item__pharmacy=pharmacy
            ).select_related('inventory_item')
            
            # Check if this is a prescription order
            is_prescription_order = bool(order.prescription_image_url or order.prescription_status)
            
            # Build customer address (barangay and city only)
            customer_address = f"{order.delivery_address.barangay}, {order.delivery_address.city}"
            
            # Build prescription image URL
            # If it's an absolute URL already, keep it; if it's a local media path, make it absolute
            prescription_image_url = None
            if order.prescription_image_url:
                if str(order.prescription_image_url).startswith('http'):
                    prescription_image_url = order.prescription_image_url
                else:
                    prescription_image_url = request.build_absolute_uri(order.prescription_image_url)
            
            # Build order data
            order_data = {
                'id': order.id,
                'orderNumber': order.order_number,
                'customerName': f"{order.customer.first_name} {order.customer.last_name}",
                'customerAddress': customer_address,
                'riderName': order.get_rider_name() or 'Not Assigned',
                'riderPhone': 'N/A',  # Will be populated when rider is assigned
                'totalAmount': float(order.total_amount),
                'createdAt': order.created_at.isoformat(),
                'orderStatus': order.order_status,
                'paymentStatus': order.payment_status,
                'prescriptionStatus': order.prescription_status,
                'isPrescriptionOrder': is_prescription_order,
                'prescriptionImageUrl': prescription_image_url,
                'prescriptionNotes': order.prescription_notes,
                'items': []
            }
            
            # Add order line items (exclude placeholder items for prescription orders)
            for line in order_lines:
                # Skip placeholder items (unit_price=0) for prescription orders
                if is_prescription_order and line.unit_price == 0:
                    continue
                    
                item_data = {
                    'product': line.inventory_item.display_name,
                    'quantity': line.quantity,
                    'unitPrice': float(line.unit_price),
                    'totalPrice': float(line.total_price)
                }
                order_data['items'].append(item_data)
            
            # Categorize by status
            if order.order_status == 'pending':
                orders_data['pending'].append(order_data)
            elif order.order_status in ['accepted', 'preparing']:
                orders_data['preparing'].append(order_data)
            elif order.order_status in ['ready_for_pickup', 'picked_up']:
                orders_data['ready'].append(order_data)
        
        # Calculate statistics
        total_orders = orders.count()
        pending_count = len(orders_data['pending'])
        preparing_count = len(orders_data['preparing'])
        ready_count = len(orders_data['ready'])
        
        # Log the request
        print(f"=== PHARMACY ORDERS REQUEST ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy_id})")
        print(f"Total orders: {total_orders}")
        print(f"Pending: {pending_count}")
        print(f"Preparing: {preparing_count}")
        print(f"Ready: {ready_count}")
        print("=== END PHARMACY ORDERS REQUEST ===")
        
        return JsonResponse({
            'success': True,
            'pharmacy_id': pharmacy_id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'totalOrders': total_orders,
            'pendingOrders': pending_count,
            'preparingOrders': preparing_count,
            'readyOrders': ready_count,
            'orders': orders_data
        })
        
    except Exception as e:
        print(f"ERROR in direct_pharmacy_orders: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to fetch pharmacy orders',
            'pharmacy_id': pharmacy_id,
            'orders': {'pending': [], 'preparing': [], 'ready': []}
        }, status=500)


@csrf_exempt
def toggle_inventory_availability(request, pharmacy_id, item_id):
    """Toggle availability of a specific inventory item"""
    try:
        from api.inventory.models import PharmacyInventory
        from api.users.models import Pharmacy
        import json
        
        # Handle both GET and POST requests
        if request.method not in ['GET', 'POST']:
            return JsonResponse({
                'success': False,
                'error': 'Method not allowed'
            }, status=405)
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Pharmacy not found',
                'pharmacy_id': pharmacy_id
            }, status=404)
        
        # Get inventory item
        try:
            inventory_item = PharmacyInventory.objects.get(
                id=item_id,
                pharmacy=pharmacy
            )
        except PharmacyInventory.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Inventory item not found',
                'item_id': item_id
            }, status=404)
        
        # Toggle availability
        inventory_item.is_available = not inventory_item.is_available
        inventory_item.save()
        
        # Log the toggle
        print(f"=== TOGGLE AVAILABILITY ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy_id})")
        print(f"Item: {inventory_item.display_name} (ID: {item_id})")
        print(f"New availability: {inventory_item.is_available}")
        print("=== END TOGGLE AVAILABILITY ===")
        
        return JsonResponse({
            'success': True,
            'item_id': item_id,
            'is_available': inventory_item.is_available,
            'message': f'Item is now {"available" if inventory_item.is_available else "unavailable"}'
        })
        
    except Exception as e:
        print(f"ERROR in toggle_inventory_availability: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to toggle item availability',
            'item_id': item_id
        }, status=500)


@csrf_exempt
def update_inventory_item(request, pharmacy_id, item_id):
    """Update a specific inventory item"""
    try:
        from api.inventory.models import PharmacyInventory, MedicineCategory
        from api.users.models import Pharmacy
        import json
        
        # Handle both GET and POST requests
        if request.method not in ['GET', 'POST', 'PUT']:
            return JsonResponse({
                'success': False,
                'error': 'Method not allowed'
            }, status=405)
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Pharmacy not found',
                'pharmacy_id': pharmacy_id
            }, status=404)
        
        # Get inventory item
        try:
            inventory_item = PharmacyInventory.objects.get(
                id=item_id,
                pharmacy=pharmacy
            )
        except PharmacyInventory.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Inventory item not found',
                'item_id': item_id
            }, status=404)
        
        if request.method == 'GET':
            # Return current item data for editing
            return JsonResponse({
                'success': True,
                'item': {
                    'id': inventory_item.id,
                    'name': inventory_item.display_name,
                    'form': inventory_item.form,
                    'dosage': inventory_item.dosage,
                    'description': inventory_item.display_description,
                    'prescription_required': inventory_item.prescription_required,
                    'price': float(inventory_item.price),
                    'original_price': float(inventory_item.original_price) if inventory_item.original_price else None,
                    'cost_price': float(inventory_item.cost_price) if inventory_item.cost_price else None,
                    'is_available': inventory_item.is_available,
                    'is_featured': inventory_item.is_featured,
                    'is_on_sale': inventory_item.is_on_sale,
                    'discount_percentage': inventory_item.discount_percentage,
                    'expiry_date': inventory_item.expiry_date.isoformat() if inventory_item.expiry_date else None
                }
            })
        
        # Handle POST/PUT for updates
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON data'
            }, status=400)
        
        # Update fields (handle empty strings gracefully)
        if 'name' in data:
            inventory_item.custom_name = data['name'] or ''
        if 'form' in data:
            inventory_item.form = data['form'] or ''
        if 'dosage' in data:
            inventory_item.dosage = data['dosage'] or ''
        if 'description' in data:
            inventory_item.custom_description = data['description'] or ''
        if 'prescription_required' in data:
            inventory_item.prescription_required = data['prescription_required']
        if 'price' in data:
            inventory_item.price = data['price'] or 0
        if 'original_price' in data:
            inventory_item.original_price = data['original_price'] or None
        if 'cost_price' in data:
            inventory_item.cost_price = data['cost_price'] or None
        if 'is_available' in data:
            inventory_item.is_available = data['is_available']
        if 'is_featured' in data:
            inventory_item.is_featured = data['is_featured']
        if 'is_on_sale' in data:
            inventory_item.is_on_sale = data['is_on_sale']
        if 'discount_percentage' in data:
            inventory_item.discount_percentage = data['discount_percentage'] or 0
        if 'expiry_date' in data and data['expiry_date']:
            from datetime import datetime
            try:
                inventory_item.expiry_date = datetime.fromisoformat(data['expiry_date'].replace('Z', '+00:00'))
            except ValueError:
                # Handle date format issues gracefully
                inventory_item.expiry_date = None
        
        # Save the updated item
        inventory_item.save()
        
        # Log the update
        print(f"=== UPDATE INVENTORY ITEM ===")
        print(f"Pharmacy: {pharmacy.pharmacy_name} (ID: {pharmacy_id})")
        print(f"Item: {inventory_item.display_name} (ID: {item_id})")
        print(f"Updated fields: {list(data.keys())}")
        print("=== END UPDATE INVENTORY ITEM ===")
        
        return JsonResponse({
            'success': True,
            'item_id': item_id,
            'message': 'Item updated successfully',
            'item': {
                'id': inventory_item.id,
                'name': inventory_item.display_name,
                'form': inventory_item.form,
                'dosage': inventory_item.dosage,
                'description': inventory_item.display_description,
                'prescription_required': inventory_item.prescription_required,
                'price': float(inventory_item.price),
                'original_price': float(inventory_item.original_price) if inventory_item.original_price else None,
                'cost_price': float(inventory_item.cost_price) if inventory_item.cost_price else None,
                'is_available': inventory_item.is_available,
                'is_featured': inventory_item.is_featured,
                'is_on_sale': inventory_item.is_on_sale,
                'discount_percentage': inventory_item.discount_percentage,
                'expiry_date': inventory_item.expiry_date.isoformat() if inventory_item.expiry_date else None
            }
        })
        
    except Exception as e:
        print(f"ERROR in update_inventory_item: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to update inventory item',
            'item_id': item_id
        }, status=500)


@csrf_exempt
def attach_prescription_items(request):
    """Attach selected inventory items to an existing prescription order (direct endpoint).

    Request body JSON:
    {
      "order_id": 123,
      "pharmacy_id": 45,
      "items": [{"inventory_item_id": 1, "quantity": 2}, ...],
      "notes": "optional pharmacist notes"
    }
    """
    if request.method == 'OPTIONS':
        # Allow CORS preflight in dev
        return JsonResponse({'success': True})
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    try:
        print("=== ATTACH PRESCRIPTION ITEMS - START ===")
        print(f"Method: {request.method}")
        print(f"Content-Type: {request.content_type}")
        try:
            print(f"Raw body: {request.body[:1000]}")
        except Exception:
            pass
        import json
        from decimal import Decimal
        from api.orders.models import Order, OrderLine
        from api.inventory.models import PharmacyInventory, MedicineCategory
        from api.users.models import Pharmacy
        from django.db.models import Sum

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        order_id = data.get('order_id')
        pharmacy_id = data.get('pharmacy_id')
        items = data.get('items', [])
        pharmacist_notes = data.get('notes', '')

        print(f"Parsed payload → order_id: {order_id}, pharmacy_id: {pharmacy_id}, items: {len(items)}, notes: {bool(pharmacist_notes)}")
        if not order_id or not pharmacy_id:
            print("Validation failed: missing order_id or pharmacy_id")
            return JsonResponse({'success': False, 'error': 'order_id and pharmacy_id are required'}, status=400)
        if not isinstance(items, list) or len(items) == 0:
            print("Validation failed: empty items list")
            return JsonResponse({'success': False, 'error': 'items must be a non-empty list'}, status=400)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            print(f"Order not found: {order_id}")
            return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)

        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            print(f"Pharmacy not found: {pharmacy_id}")
            return JsonResponse({'success': False, 'error': 'Pharmacy not found'}, status=404)

        # Ensure order is linked to this pharmacy via at least a placeholder order line
        if not order.order_lines.filter(inventory_item__pharmacy=pharmacy).exists():
            print("Order not linked to pharmacy yet → creating placeholder line")
            # Create or reuse placeholder inventory
            category, _ = MedicineCategory.objects.get_or_create(
                name='Custom Products',
                defaults={
                    'description': 'Custom products created by pharmacies',
                    'is_active': True,
                    'sort_order': 0,
                }
            )
            placeholder_inventory, _ = PharmacyInventory.objects.get_or_create(
                pharmacy=pharmacy,
                medicine=None,
                defaults={
                    'category': category,
                    'name': 'Prescription Review',
                    'form': 'solution',
                    'dosage': 'N/A',
                    'description': 'Placeholder for prescription-only orders',
                    'prescription_required': True,
                    'price': Decimal('0.00'),
                    'original_price': Decimal('0.00'),
                    'cost_price': Decimal('0.00'),
                    'stock_quantity': 0,
                    'is_available': True,
                }
            )
            OrderLine.objects.create(
                order=order,
                inventory_item=placeholder_inventory,
                quantity=1,
                unit_price=Decimal('0.00'),
                total_price=Decimal('0.00'),
                prescription_required=True,
                prescription_status='pending',
                prescription_notes='Prescription review placeholder created automatically',
                notes='Auto-linked to pharmacy during attach'
            )

        added_lines = []
        errors = []

        for entry in items:
            print(f"Processing item: {entry}")
            inv_id = entry.get('inventory_item_id') or entry.get('id')
            quantity = entry.get('quantity', 1)
            try:
                quantity = int(quantity)
            except Exception:
                quantity = 1
            if not inv_id or quantity <= 0:
                errors.append({'inventory_item_id': inv_id, 'error': 'Invalid item or quantity'})
                print(f"  → skipped: invalid item or quantity (id={inv_id}, qty={quantity})")
                continue

            inv_item = PharmacyInventory.objects.filter(id=inv_id, pharmacy=pharmacy).first()
            if not inv_item:
                errors.append({'inventory_item_id': inv_id, 'error': 'Inventory item not found for this pharmacy'})
                print(f"  → skipped: inventory item not found (id={inv_id})")
                continue

            # No stock decrement/validation in this flow; availability toggle handles visibility

            unit_price = inv_item.price
            total_price = unit_price * quantity

            line = OrderLine.objects.create(
                order=order,
                inventory_item=inv_item,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
                prescription_required=inv_item.prescription_required,
                prescription_status='approved' if inv_item.prescription_required else '',
                notes='Added from pharmacist prescription review'
            )
            print(f"  → created order line id={line.id} for inventory id={inv_item.id}")

            added_lines.append({
                'order_line_id': line.id,
                'inventory_item_id': inv_item.id,
                'name': inv_item.display_name,
                'quantity': quantity,
                'unit_price': float(unit_price),
                'total_price': float(total_price),
            })

        # Update order and totals
        if pharmacist_notes:
            order.prescription_notes = (order.prescription_notes or '') + (f"\n{pharmacist_notes}" if order.prescription_notes else pharmacist_notes)

        # Keep prescription status pending until customer approves pricing
        # if added_lines: leave as pending

        print("Recalculating order totals (bypassing model.calculate_totals)...")
        try:
            line_total = order.order_lines.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
        except Exception as e:
            print(f"Aggregate subtotal error: {e}")
            line_total = Decimal('0.00')

        # Coerce delivery_fee and discount_amount to Decimal safely
        delivery_fee = order.delivery_fee if isinstance(getattr(order, 'delivery_fee', Decimal('0.00')), Decimal) else Decimal(str(order.delivery_fee or 0))
        discount_amount = order.discount_amount if isinstance(getattr(order, 'discount_amount', Decimal('0.00')), Decimal) else Decimal(str(order.discount_amount or 0))

        order.subtotal = line_total
        order.tax_amount = Decimal('0.00')
        order.total_amount = (order.subtotal + delivery_fee) - discount_amount
        # Do not move order to preparing; wait for customer approval
        order.save()

        print("=== ATTACH PRESCRIPTION ITEMS - SUCCESS ===")
        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'total_added': len(added_lines),
            'added_lines': added_lines,
            'errors': errors,
            'order_total_amount': float(order.total_amount),
            'order_status': order.order_status,
            'prescription_status': order.prescription_status,
        })

    except Exception as e:
        import traceback
        print("=== ATTACH PRESCRIPTION ITEMS - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to attach items to order'}, status=500)


@csrf_exempt
def prepare_price_quote(request):
    """Set pricing fees (service fee and delivery fee) and recalculate totals for an order.

    Request JSON: { "order_id": 123 }
    Behavior: Sets tax_amount=19.00 (Service Fee), delivery_fee=29.00, recomputes total_amount.
    Leaves status as-is (pending) so the customer can approve.
    """
    try:
        import json
        from decimal import Decimal
        from django.db.models import Sum
        from api.orders.models import Order

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        order_id = data.get('order_id')
        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        try:
            order = Order.objects.get(id=int(order_id))
        except (Order.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)

        # Recalculate subtotal from order lines if needed
        try:
            subtotal = order.order_lines.aggregate(total=Sum('total_price'))['total'] or Decimal('0.00')
        except Exception:
            subtotal = Decimal('0.00')

        order.subtotal = subtotal
        order.tax_amount = Decimal('19.00')
        order.delivery_fee = Decimal('29.00')

        try:
            discount_amount = order.discount_amount if isinstance(getattr(order, 'discount_amount', Decimal('0.00')), Decimal) else Decimal(str(order.discount_amount or 0))
        except Exception:
            discount_amount = Decimal('0.00')

        order.total_amount = (order.subtotal + order.tax_amount + order.delivery_fee) - discount_amount
        order.save()

        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'subtotal': float(order.subtotal),
            'service_fee': float(order.tax_amount),
            'delivery_fee': float(order.delivery_fee),
            'discount_amount': float(discount_amount),
            'total_amount': float(order.total_amount),
            'order_status': order.order_status,
        })

    except Exception as e:
        import traceback
        print("=== PREPARE PRICE QUOTE - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to prepare price quote'}, status=500)

@csrf_exempt
def customer_pricing_approval(request):
    """Customer approves pricing for a prescription order (direct endpoint).

    Request JSON:
      { "order_id": 123, "approve": true, "notes": "optional" }

    Behavior:
      - When approve=true: sets order_status=accepted if currently pending, and locks in totals
      - When approve=false: keeps order pending and appends note; optional future: allow reject flow
    """
    try:
        import json
        from api.orders.models import Order
        from api.chat.models import ChatRoom, ChatMessage

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        order_id = data.get('order_id')
        approve = bool(data.get('approve', True))
        notes = (data.get('notes') or '').strip()

        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        try:
            order = Order.objects.get(id=int(order_id))
        except (Order.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)

        # Only handle pending orders; otherwise return current state
        previous_status = order.order_status
        if approve and order.order_status == Order.OrderStatus.PENDING:
            # Hardcode fees per request
            from decimal import Decimal
            order.tax_amount = Decimal('19.00')
            order.delivery_fee = Decimal('29.00')
            # Recompute total: subtotal + tax + delivery (discount already applied on order)
            try:
                discount_amount = order.discount_amount if isinstance(getattr(order, 'discount_amount', Decimal('0.00')), Decimal) else Decimal(str(order.discount_amount or 0))
            except Exception:
                discount_amount = Decimal('0.00')
            order.total_amount = (order.subtotal + order.tax_amount + order.delivery_fee) - discount_amount
            # Advance status to preparing
            order.order_status = Order.OrderStatus.PREPARING
            if notes:
                order.notes = f"{order.notes or ''}\nCustomer approved pricing: {notes}".strip()
            order.save()

            # Post a system message into chat (if room exists/creatable)
            try:
                room = None
                from api.chat.models import ChatRoom
                room = ChatRoom.objects.filter(order=order).first()
                if not room:
                    room = ChatRoom.objects.create(order=order, title=f"Order #{order.order_number} Chat")
                ChatMessage.create_system_message(room, f"Customer approved pricing. Tax ₱19, Delivery ₱29 added. Status set to 'preparing'.")
            except Exception:
                pass

            return JsonResponse({
                'success': True,
                'order_id': order.id,
                'order_status': order.order_status,
                'total_amount': float(order.total_amount),
            })

        # Not approved or already processed: keep pending, append note if any
        if notes:
            order.notes = f"{order.notes or ''}\nCustomer response: {notes}".strip()
            order.save()

        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'order_status': order.order_status,
            'total_amount': float(order.total_amount),
        })

    except Exception as e:
        import traceback
        print("=== CUSTOMER PRICING APPROVAL - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to process approval'}, status=500)


@csrf_exempt
def get_or_create_order_chat_room(request):
    """Dev endpoint: Get or create a ChatRoom for a given order and ensure participants.

    Request JSON:
      { "order_id": 123, "pharmacy_id": 45 (optional fallback) }

    Response JSON:
      { "success": true, "room": { "id": 1, "room_id": "CHAT...", "order_id": 123, "title": "...", "status": "open" } }
    """
    try:
        import json
        from api.orders.models import Order
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        order_id = data.get('order_id')
        pharmacy_id = data.get('pharmacy_id')
        if not order_id:
            return JsonResponse({'success': False, 'error': 'order_id is required'}, status=400)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Order not found'}, status=404)

        # Resolve pharmacy via first order line if possible
        pharmacy = None
        try:
            first_line = order.order_lines.select_related('inventory_item__pharmacy').first()
            if first_line and getattr(first_line.inventory_item, 'pharmacy', None):
                pharmacy = first_line.inventory_item.pharmacy
        except Exception:
            pharmacy = None

        if not pharmacy and pharmacy_id:
            try:
                pharmacy = Pharmacy.objects.get(id=pharmacy_id)
            except Pharmacy.DoesNotExist:
                pass

        # Get or create room for this order
        room = ChatRoom.objects.filter(order=order).first()
        if not room:
            room = ChatRoom.objects.create(
                order=order,
                title=f"Order #{order.order_number} Chat"
            )
            # System message
            ChatMessage.create_system_message(room, f"Chat room created for Order #{order.order_number}")

        # Ensure participants: customer and pharmacy (if available)
        try:
            customer_user = order.customer.user
            ChatParticipant.objects.get_or_create(room=room, user=customer_user, defaults={'role': 'customer'})
        except Exception:
            pass

        if pharmacy and getattr(pharmacy, 'user', None):
            ChatParticipant.objects.get_or_create(room=room, user=pharmacy.user, defaults={'role': 'pharmacy'})

        return JsonResponse({
            'success': True,
            'room': {
                'id': room.id,
                'room_id': room.room_id,
                'order_id': order.id,
                'title': room.title,
                'status': room.status,
            }
        })

    except Exception as e:
        import traceback
        print("=== ORDER CHAT ROOM - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to create or fetch chat room'}, status=500)


@csrf_exempt
def get_order_chat_messages(request):
    """Dev endpoint: List messages for a chat room.

    Query params:
      room_id: int (required)
      limit: int (optional, default 50, max 200)
    """
    try:
        from api.chat.models import ChatRoom, ChatMessage
        from django.utils.dateparse import parse_datetime

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'GET':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        room_id = request.GET.get('room_id')
        limit_param = request.GET.get('limit', '50')
        try:
            limit = max(1, min(200, int(limit_param)))
        except ValueError:
            limit = 50

        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        try:
            room = ChatRoom.objects.get(id=int(room_id))
        except (ChatRoom.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

        messages_qs = ChatMessage.objects.filter(room=room, is_deleted=False).order_by('timestamp')
        messages = list(messages_qs[:limit])

        def serialize(msg):
            return {
                'id': msg.id,
                'sender_name': msg.sender_name,
                'sender_role': msg.sender_role,
                'sender_role_code': getattr(msg.sender, 'role', None),
                'message_type': msg.message_type,
                'content': msg.content,
                'file_path': msg.file_path,
                'timestamp': msg.timestamp.isoformat() if msg.timestamp else None,
                'is_system_message': msg.is_system_message,
                'status': getattr(msg, 'status', None),
                'delivered_at': msg.delivered_at.isoformat() if getattr(msg, 'delivered_at', None) else None,
                'read_at': msg.read_at.isoformat() if getattr(msg, 'read_at', None) else None,
            }

        return JsonResponse({
            'success': True,
            'room': {
                'id': room.id,
                'room_id': room.room_id,
            },
            'count': len(messages),
            'messages': [serialize(m) for m in messages],
        })

    except Exception as e:
        import traceback
        print("=== ORDER CHAT MESSAGES - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to fetch messages'}, status=500)


@csrf_exempt
def mark_order_chat_messages_read(request):
    """Dev endpoint: Mark messages in a room as read for the acting participant.

    Request JSON:
      { "room_id": 45, "pharmacy_id": 22 }    # pharmacy marks customer messages as read
      { "room_id": 45 }                         # customer marks pharmacy messages as read
    """
    try:
        import json
        from django.utils import timezone
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        room_id = data.get('room_id')
        pharmacy_id = data.get('pharmacy_id')
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        try:
            room = ChatRoom.objects.select_related('order__customer__user').get(id=int(room_id))
        except (ChatRoom.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

        # Determine acting participant (pharmacy if pharmacy_id provided; otherwise customer)
        acting_participant = None
        if pharmacy_id:
            try:
                pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
                acting_user = pharmacy.user
            except (Pharmacy.DoesNotExist, ValueError):
                return JsonResponse({'success': False, 'error': 'Pharmacy not found'}, status=404)
            acting_participant, _ = ChatParticipant.objects.get_or_create(
                room=room, user=acting_user, defaults={'role': 'pharmacy'}
            )
        else:
            # Customer inferred from order
            try:
                acting_user = room.order.customer.user
            except Exception:
                return JsonResponse({'success': False, 'error': 'Customer not found for this order'}, status=404)
            acting_participant, _ = ChatParticipant.objects.get_or_create(
                room=room, user=acting_user, defaults={'role': 'customer'}
            )

        # First, mark any non-self messages as delivered if not yet delivered
        now = timezone.now()
        delivered_count = (
            ChatMessage.objects
            .filter(room=room)
            .exclude(sender=acting_participant)
            .filter(delivered_at__isnull=True)
            .update(status='delivered', delivered_at=now)
        )

        # Then, mark any non-self messages as read if not yet read
        read_count = (
            ChatMessage.objects
            .filter(room=room)
            .exclude(sender=acting_participant)
            .filter(read_at__isnull=True)
            .update(status='read', read_at=now)
        )

        return JsonResponse({
            'success': True,
            'room': { 'id': room.id, 'room_id': room.room_id },
            'delivered_count': int(delivered_count),
            'read_count': int(read_count),
        })

    except Exception as e:
        import traceback
        print("=== ORDER CHAT MARK READ - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to mark messages as read'}, status=500)


@csrf_exempt
def set_order_chat_typing(request):
    """Dev endpoint: Set typing flag for a participant in a chat room with TTL.

    Request JSON:
      { "room_id": 45, "pharmacy_id": 22, "is_typing": true }
      { "room_id": 45, "is_typing": true }
    """
    try:
        import json
        from django.core.cache import cache
        from api.chat.models import ChatRoom, ChatParticipant
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        room_id = data.get('room_id')
        pharmacy_id = data.get('pharmacy_id')
        is_typing = bool(data.get('is_typing', True))
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        try:
            room = ChatRoom.objects.select_related('order__customer__user').get(id=int(room_id))
        except (ChatRoom.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

        # Resolve actor role
        role = 'customer'
        if pharmacy_id:
            try:
                pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
                actor_user = pharmacy.user
                role = 'pharmacy'
            except (Pharmacy.DoesNotExist, ValueError):
                return JsonResponse({'success': False, 'error': 'Pharmacy not found'}, status=404)
        else:
            # Default to customer side
            actor_user = room.order.customer.user if getattr(room.order, 'customer', None) else None

        if actor_user:
            ChatParticipant.objects.get_or_create(
                room=room,
                user=actor_user,
                defaults={'role': role}
            )

        key = f"chat_typing:{room.id}:{role}"
        if is_typing:
            cache.set(key, True, timeout=7)
        else:
            cache.delete(key)

        return JsonResponse({
            'success': True,
            'room': { 'id': room.id, 'room_id': room.room_id },
            'typing': { role: bool(is_typing) }
        })

    except Exception as e:
        import traceback
        print("=== ORDER CHAT SET TYPING - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to set typing state'}, status=500)


def _get_typing_state(cache, room_id):
    customer = bool(cache.get(f"chat_typing:{room_id}:customer"))
    pharmacy = bool(cache.get(f"chat_typing:{room_id}:pharmacy"))
    return {'customer': customer, 'pharmacy': pharmacy}


@csrf_exempt
def get_order_chat_typing_status(request):
    """Dev endpoint: Get current typing state for a room.

    Query params:
      room_id: int
    """
    try:
        from django.core.cache import cache
        from api.chat.models import ChatRoom

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'GET':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        room_id = request.GET.get('room_id')
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)

        try:
            room = ChatRoom.objects.get(id=int(room_id))
        except (ChatRoom.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

        typing = _get_typing_state(cache, room.id)
        return JsonResponse({
            'success': True,
            'room': { 'id': room.id, 'room_id': room.room_id },
            'typing': typing,
        })

    except Exception as e:
        import traceback
        print("=== ORDER CHAT TYPING STATUS - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to fetch typing status'}, status=500)

@csrf_exempt
def send_order_chat_message(request):
    """Dev endpoint: Send a text chat message to a room as the pharmacy user.

    Request JSON:
      { "room_id": 45, "pharmacy_id": 22, "content": "Hello" }
    """
    try:
        import json
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        from api.users.models import Pharmacy

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        room_id = data.get('room_id')
        pharmacy_id = data.get('pharmacy_id')
        content = (data.get('content') or '').strip()

        if not room_id or not pharmacy_id:
            return JsonResponse({'success': False, 'error': 'room_id and pharmacy_id are required'}, status=400)
        if not content:
            return JsonResponse({'success': False, 'error': 'content cannot be empty'}, status=400)

        try:
            room = ChatRoom.objects.get(id=int(room_id))
        except (ChatRoom.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

        try:
            pharmacy = Pharmacy.objects.get(id=int(pharmacy_id))
            sender_user = pharmacy.user
        except (Pharmacy.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Pharmacy not found'}, status=404)

        participant, _ = ChatParticipant.objects.get_or_create(
            room=room,
            user=sender_user,
            defaults={'role': 'pharmacy'}
        )

        message = ChatMessage.objects.create(
            room=room,
            sender=participant,
            message_type='text',
            content=content
        )

        # Mark as delivered for dev flow
        try:
            message.mark_as_delivered()
        except Exception:
            pass

        return JsonResponse({
            'success': True,
            'message': {
                'id': message.id,
                'sender_name': message.sender_name,
                'sender_role': message.sender_role,
                'message_type': message.message_type,
                'content': message.content,
                'timestamp': message.timestamp.isoformat() if message.timestamp else None,
                'is_system_message': message.is_system_message,
            }
        }, status=201)

    except Exception as e:
        import traceback
        print("=== ORDER CHAT SEND - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to send message'}, status=500)


@csrf_exempt
def send_order_chat_message_customer(request):
    """Dev endpoint: Send a text chat message to a room as the customer user.

    Request JSON:
      { "room_id": 45, "content": "Hello" }
    """
    try:
        import json
        from api.chat.models import ChatRoom, ChatParticipant, ChatMessage
        from api.orders.models import Order

        if request.method == 'OPTIONS':
            return JsonResponse({'success': True})
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)

        room_id = data.get('room_id')
        content = (data.get('content') or '').strip()
        if not room_id:
            return JsonResponse({'success': False, 'error': 'room_id is required'}, status=400)
        if not content:
            return JsonResponse({'success': False, 'error': 'content cannot be empty'}, status=400)

        try:
            room = ChatRoom.objects.select_related('order__customer__user').get(id=int(room_id))
        except (ChatRoom.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

        # Resolve customer user from room.order
        try:
            customer_user = room.order.customer.user
        except Exception:
            return JsonResponse({'success': False, 'error': 'Customer not found for this order'}, status=404)

        participant, _ = ChatParticipant.objects.get_or_create(
            room=room,
            user=customer_user,
            defaults={'role': 'customer'}
        )

        message = ChatMessage.objects.create(
            room=room,
            sender=participant,
            message_type='text',
            content=content
        )

        try:
            message.mark_as_delivered()
        except Exception:
            pass

        return JsonResponse({
            'success': True,
            'message': {
                'id': message.id,
                'sender_name': message.sender_name,
                'sender_role': message.sender_role,
                'message_type': message.message_type,
                'content': message.content,
                'timestamp': message.timestamp.isoformat() if message.timestamp else None,
                'is_system_message': message.is_system_message,
            }
        }, status=201)

    except Exception as e:
        import traceback
        print("=== ORDER CHAT SEND (CUSTOMER) - ERROR ===")
        print(f"Error: {e}")
        print(traceback.format_exc())
        return JsonResponse({'success': False, 'error': 'Failed to send message'}, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test/', test_api),
    path('api/ping/', views.ping),
    path('api/pharmacy-stats/', direct_pharmacy_stats),  # Direct endpoint bypassing all auth
    path('api/pending-pharmacies/', direct_pending_pharmacies),  # Direct endpoint for pending pharmacies
    path('api/active-pharmacies/', direct_active_pharmacies),  # Direct endpoint for approved & active pharmacies
    path('api/pharmacy-details/<int:pharmacy_id>/', direct_pharmacy_details),  # Direct endpoint for pharmacy details
    path('api/document/<int:document_id>/', serve_document),  # Direct endpoint for serving documents
    path('api/pharmacy-storefront/<int:pharmacy_id>/', serve_pharmacy_storefront),  # Direct endpoint for storefront image
    path('api/document-presigned/<int:document_id>/', document_presigned_url),  # Dev: presigned URL for a document
    path('api/aws-diagnostics/', aws_diagnostics),  # Dev: verify credentials
    path('api/prescription-image/<int:order_id>/', serve_prescription_image),  # Direct endpoint for serving prescription images
    path('api/upload-prescription-image/', upload_prescription_image),  # Direct endpoint for uploading prescription images
    path('api/upload-driver-license/', upload_driver_license_image),  # Direct endpoint for rider driver's license upload
    path('api/complete-rider-registration/', complete_rider_registration),  # Direct endpoint for rider registration completion
    path('api/rider-stats/', direct_rider_stats),  # Direct endpoint for rider statistics
    path('api/rider-details/<int:rider_id>/', direct_rider_details),  # Direct endpoint for rider details
    path('api/approve-rider/<int:rider_id>/', approve_rider_direct),  # Direct endpoint for rider approval
    path('api/approve-pharmacy/<int:pharmacy_id>/', approve_pharmacy),  # Direct endpoint for approving pharmacy
    path('api/generate-login-token/<int:pharmacy_id>/', generate_login_token),  # Direct endpoint for generating login token
    path('api/validate-login-token/<str:token>/', validate_login_token),  # Direct endpoint for validating login token
    path('api/complete-user-setup/<str:token>/', complete_user_setup),  # Direct endpoint for completing user setup
    path('api/user-register/', direct_user_registration),  # Direct endpoint for user registration
    path('api/pharmacy-login/', pharmacy_login),  # Direct endpoint for pharmacy login
    path('api/medicine-catalog/', direct_medicine_catalog),  # Direct endpoint for medicine catalog
    path('api/add-medicines-to-inventory/', add_medicines_to_inventory),
    path('api/add-custom-products-to-inventory/', add_custom_products_to_inventory),  # Direct endpoint for adding custom products to inventory
    path('api/medicine-categories/', direct_medicine_categories),  # Direct endpoint for medicine categories
    path('api/pharmacy-inventory/<int:pharmacy_id>/', direct_pharmacy_inventory),
    path('api/pharmacy-orders/<int:pharmacy_id>/', direct_pharmacy_orders),  # Direct endpoint for pharmacy orders
    path('api/toggle-availability/<int:pharmacy_id>/<int:item_id>/', toggle_inventory_availability),  # Direct endpoint for pharmacy inventory
    path('api/update-inventory-item/<int:pharmacy_id>/<int:item_id>/', update_inventory_item),  # Direct endpoint for updating inventory items
    path('api/attach-prescription-items/', attach_prescription_items),  # Direct endpoint for attaching items to order
    path('api/prepare-price-quote/', prepare_price_quote),  # Direct endpoint to set service & delivery fees
    
    # Order endpoints
    path('api/create-prescription-order/', direct_prescription_order_creation),  # Direct endpoint for prescription order creation
    path('api/order-status/<int:order_id>/', get_order_status),  # Direct endpoint for order status
    path('api/customer-approve-pricing/', customer_pricing_approval),  # Direct endpoint for customer pricing approval
    path('api/cache-version/', lambda request: (
        __import__('django.http').http.JsonResponse({
            'success': True,
            'value': __import__('django.core.cache').core.cache.cache.get(request.GET.get('key') or '', None)
        })
    )),  # Minimal direct cache read for version keys
    
    # Include API URLs at the correct path
    path('api/', include('api.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve static files in development using staticfiles finders (admin assets, app static)
if settings.DEBUG:
    urlpatterns += [
        path('api/order-chat-room/', get_or_create_order_chat_room),  # Dev: order chat room
        path('api/order-chat-messages/', get_order_chat_messages),  # Dev: list chat messages
        path('api/order-chat-typing/', set_order_chat_typing),  # Dev: typing flag
        path('api/order-chat-typing-status/', get_order_chat_typing_status),  # Dev: typing status
        path('api/order-chat-mark-read/', mark_order_chat_messages_read),  # Dev: mark read
        path('api/order-chat-send/', send_order_chat_message),  # Dev: send (pharmacy)
        path('api/order-chat-send-customer/', send_order_chat_message_customer),  # Dev: send (customer)
    ]
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


