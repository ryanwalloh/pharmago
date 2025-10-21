from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


def test_api(request):
    return JsonResponse({"message": "Hello from Django backend!"})
from .orders_direct_proxy import direct_prescription_order_creation  # lightweight import alias
from .orders_direct_proxy import get_order_status  # lightweight import alias


def get_cache_value(request):
    """Lightweight cache read for dev polling.
    GET /api/cache-version/?key=...
    Returns { value: str|None }
    """
    try:
        from django.core.cache import cache
        key = request.GET.get('key')
        if not key:
            return JsonResponse({'error': 'key is required'}, status=400)
        val = cache.get(key)
        return JsonResponse({'value': val})
    except Exception as e:
        return JsonResponse({'error': 'Failed to read cache', 'message': str(e)}, status=500)



def direct_pharmacy_stats(request):
    """Direct pharmacy statistics endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy

        total_pharmacies = Pharmacy.objects.filter(status='approved').count()
        pending_approvals = Pharmacy.objects.filter(is_fully_verified=False).count()
        active_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=True,
            status='approved'
        ).count()
        suspended_pharmacies = Pharmacy.objects.filter(status='suspended').count()

        pending_pharmacies_data = []
        pending_pharmacies = Pharmacy.objects.filter(is_fully_verified=False)
        for pharmacy in pending_pharmacies:
            pending_pharmacies_data.append({
                'id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'owner_first_name': pharmacy.owner_first_name,
                'owner_last_name': pharmacy.owner_last_name,
                'business_phone': pharmacy.business_phone,
                'business_email': pharmacy.business_email,
                'barangay': pharmacy.barangay,
                'city': pharmacy.city,
            })

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
            'pendingPharmaciesData': pending_pharmacies_data,
        })
    except Exception as e:
        print(f"ERROR in direct_pharmacy_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch pharmacy statistics',
            'totalPharmacies': 0,
            'pendingApprovals': 0,
            'activePharmacies': 0,
            'suspendedPharmacies': 0,
            'pendingPharmaciesData': [],
        }, status=500)


def direct_rider_stats(request):
    """Direct rider statistics endpoint that bypasses all authentication"""
    try:
        from api.users.models import Rider

        # Counts
        total_riders = Rider.objects.count()
        pending_approvals = Rider.objects.filter(status=Rider.RiderStatus.PENDING).count()
        active_riders = Rider.objects.filter(status=Rider.RiderStatus.APPROVED).count()
        suspended_riders = Rider.objects.filter(status=Rider.RiderStatus.SUSPENDED).count()

        pending_riders_data = []
        for r in Rider.objects.filter(status=Rider.RiderStatus.PENDING).select_related('user').order_by('-created_at')[:500]:
            pending_riders_data.append({
                'id': r.id,
                'first_name': r.first_name,
                'last_name': r.last_name,
                'email': getattr(r.user, 'email', None),
                'phone_number': getattr(r.user, 'phone_number', None),
                'vehicle_type': r.vehicle_type,
                'plate_number': r.plate_number,
            })

        # Active riders list (basic info)
        active_riders_data = []
        for r in Rider.objects.filter(status=Rider.RiderStatus.APPROVED).select_related('user').order_by('-created_at')[:1000]:
            active_riders_data.append({
                'id': r.id,
                'first_name': r.first_name,
                'last_name': r.last_name,
                'email': getattr(r.user, 'email', None),
                'phone_number': getattr(r.user, 'phone_number', None),
                'vehicle_type': r.vehicle_type,
                'plate_number': r.plate_number,
            })

        # Suspended riders list (basic info)
        suspended_riders_data = []
        for r in Rider.objects.filter(status=Rider.RiderStatus.SUSPENDED).select_related('user').order_by('-created_at')[:1000]:
            suspended_riders_data.append({
                'id': r.id,
                'first_name': r.first_name,
                'last_name': r.last_name,
                'email': getattr(r.user, 'email', None),
                'phone_number': getattr(r.user, 'phone_number', None),
                'vehicle_type': r.vehicle_type,
                'plate_number': r.plate_number,
            })

        # All riders list (basic info)
        all_riders_data = []
        for r in Rider.objects.select_related('user').order_by('-created_at')[:1000]:
            all_riders_data.append({
                'id': r.id,
                'first_name': r.first_name,
                'last_name': r.last_name,
                'email': getattr(r.user, 'email', None),
                'phone_number': getattr(r.user, 'phone_number', None),
                'status': r.status,
                'vehicle_type': r.vehicle_type,
                'plate_number': r.plate_number,
            })

        return JsonResponse({
            'totalRiders': total_riders,
            'pendingApprovals': pending_approvals,
            'activeRiders': active_riders,
            'suspendedRiders': suspended_riders,
            'pendingRidersData': pending_riders_data,
            'activeRidersData': active_riders_data,
            'suspendedRidersData': suspended_riders_data,
            'allRidersData': all_riders_data,
        })
    except Exception as e:
        print(f"ERROR in direct_rider_stats: {e}")
        return JsonResponse({
            'error': 'Failed to fetch rider statistics',
            'totalRiders': 0,
            'pendingApprovals': 0,
            'activeRiders': 0,
            'suspendedRiders': 0,
            'pendingRidersData': [],
        }, status=500)


@csrf_exempt
def direct_rider_details(request, rider_id):
    """Direct endpoint to fetch detailed rider info, including driver's license documents."""
    try:
        from api.users.models import Rider

        rider = Rider.objects.select_related('user').get(id=rider_id)
        user = rider.user

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


def direct_riders_all(request):
    """Direct endpoint to list all riders (basic info)."""
    from api.users.models import Rider
    data = []
    for r in Rider.objects.select_related('user').order_by('-created_at')[:1000]:
        data.append({
            'id': r.id,
            'first_name': r.first_name,
            'last_name': r.last_name,
            'email': getattr(r.user, 'email', None),
            'phone_number': getattr(r.user, 'phone_number', None),
            'status': r.status,
            'vehicle_type': r.vehicle_type,
            'plate_number': r.plate_number,
        })
    return JsonResponse(data, safe=False)


def direct_riders_active(request):
    """Direct endpoint to list approved/active riders."""
    from api.users.models import Rider
    qs = Rider.objects.filter(status=Rider.RiderStatus.APPROVED).select_related('user').order_by('-created_at')[:1000]
    data = []
    for r in qs:
        data.append({
            'id': r.id,
            'first_name': r.first_name,
            'last_name': r.last_name,
            'email': getattr(r.user, 'email', None),
            'phone_number': getattr(r.user, 'phone_number', None),
            'status': r.status,
            'vehicle_type': r.vehicle_type,
            'plate_number': r.plate_number,
        })
    return JsonResponse(data, safe=False)


def direct_riders_suspended(request):
    """Direct endpoint to list suspended riders."""
    from api.users.models import Rider
    qs = Rider.objects.filter(status=Rider.RiderStatus.SUSPENDED).select_related('user').order_by('-created_at')[:1000]
    data = []
    for r in qs:
        data.append({
            'id': r.id,
            'first_name': r.first_name,
            'last_name': r.last_name,
            'email': getattr(r.user, 'email', None),
            'phone_number': getattr(r.user, 'phone_number', None),
            'status': r.status,
            'vehicle_type': r.vehicle_type,
            'plate_number': r.plate_number,
        })
    return JsonResponse(data, safe=False)

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
            'data': [],
        }, status=500)


def direct_active_pharmacies(request):
    """Direct approved pharmacies endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy, UserDocument
        import os

        active_pharmacies = Pharmacy.objects.filter(
            is_fully_verified=True,
            status='approved',
        ).order_by('pharmacy_name')

        data = []
        for p in active_pharmacies:
            storefront_image_url = None
            storefront_document_id = None
            try:
                storefront_doc = UserDocument.objects.filter(
                    user=p.user,
                    id_type__name__icontains='storefront'
                ).first()
                if not storefront_doc:
                    storefront_doc = UserDocument.objects.filter(
                        user=p.user,
                        document_file__icontains='storefront'
                    ).first()
                if storefront_doc:
                    storefront_document_id = storefront_doc.id
                    # Check if it's a Cloudinary URL - use it directly
                    if storefront_doc.file_url and ('cloudinary.com' in storefront_doc.file_url or storefront_doc.file_url.startswith('http')):
                        storefront_image_url = storefront_doc.file_url
                    else:
                        # Legacy S3 URL - generate presigned URL or use backend proxy
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
                                config=Config(signature_version='s3v4'),
                            )
                            presigned = s3_client.generate_presigned_url(
                                'get_object',
                                Params={'Bucket': bucket_name, 'Key': key},
                                ExpiresIn=3600,
                            )
                            storefront_image_url = presigned
                        except Exception:
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
            'data': [],
        }, status=500)


def direct_pharmacy_details(request, pharmacy_id):
    """Direct pharmacy details endpoint that bypasses all authentication"""
    try:
        from api.users.models import Pharmacy, UserDocument

        pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        user_documents = UserDocument.objects.filter(user=pharmacy.user)

        pharmacy_data = {
            'id': pharmacy.id,
            'pharmacy_name': pharmacy.pharmacy_name,
            'owner_first_name': pharmacy.owner_first_name,
            'owner_last_name': pharmacy.owner_last_name,
            'business_phone': pharmacy.business_phone,
            'business_email': pharmacy.business_email,
            'barangay': pharmacy.barangay,
            'city': pharmacy.city,
            'business_permit_number': pharmacy.business_permit_number,
            'business_permit_expiry': pharmacy.business_permit_expiry.isoformat() if pharmacy.business_permit_expiry else None,
            'pharmacy_license_number': pharmacy.pharmacy_license_number,
            'pharmacy_license_expiry': pharmacy.pharmacy_license_expiry.isoformat() if pharmacy.pharmacy_license_expiry else None,
            'owner_date_of_birth': pharmacy.owner_date_of_birth.isoformat() if pharmacy.owner_date_of_birth else None,
            'owner_gender': pharmacy.owner_gender,
            'services_offered': pharmacy.services_offered,
            'user_id': pharmacy.user.id,
            'documents': [],
        }

        for doc in user_documents:
            pharmacy_data['documents'].append({
                'id': doc.id,
                'file_url': doc.file_url,
                'document_type': doc.id_type.name if doc.id_type else 'Unknown',
                'document_number': doc.document_number,
                'expiry_date': doc.expiry_date.isoformat() if doc.expiry_date else None,
                'status': doc.status,
            })

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
            'pharmacy_id': pharmacy_id,
        }, status=404)
    except Exception as e:
        print(f"ERROR in direct_pharmacy_details: {e}")
        return JsonResponse({
            'error': 'Failed to fetch pharmacy details',
            'pharmacy_id': pharmacy_id,
        }, status=500)


@csrf_exempt
def direct_search_medicines(request):
    """
    Direct search for medicines in pharmacy inventories.
    Query parameters:
    - q: search query (required)
    - limit: max results (default: 10)
    """
    try:
        from api.inventory.models import PharmacyInventory
        from django.db.models import Q
        
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 10))
        
        if not query or len(query) < 2:
            return JsonResponse({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }, status=400)
        
        # Search in pharmacy inventory (available items only)
        medicines = PharmacyInventory.objects.filter(
            Q(name__icontains=query) | 
            Q(custom_name__icontains=query) |
            Q(medicine__name__icontains=query) |
            Q(medicine__generic_name__icontains=query),
            is_available=True,
            pharmacy__status='approved'
        ).select_related('pharmacy', 'medicine', 'category').order_by('name', 'dosage', 'form').distinct('name', 'dosage', 'form')[:limit]
        
        results = []
        for medicine in medicines:
            # Get count of pharmacies that have this medicine AVAILABLE
            # Using is_available toggle instead of stock_quantity
            pharmacy_count = PharmacyInventory.objects.filter(
                name=medicine.name,
                dosage=medicine.dosage,
                form=medicine.form,
                is_available=True,  # Only check availability toggle
                pharmacy__status='approved'
            ).values('pharmacy').distinct().count()
            
            # Get price range (only from available pharmacies)
            prices = PharmacyInventory.objects.filter(
                name__iexact=medicine.name,
                dosage__iexact=medicine.dosage,
                form=medicine.form,
                is_available=True,  # Only check availability toggle
                pharmacy__status='approved'
            ).values_list('price', flat=True)
            
            price_range = None
            if prices:
                price_range = {
                    'min': float(min(prices)),
                    'max': float(max(prices))
                }
            
            results.append({
                'id': medicine.id,
                'name': medicine.display_name,
                'dosage': medicine.dosage,
                'form': medicine.get_form_display(),
                'category': medicine.category.name if medicine.category else None,
                'prescription_required': medicine.prescription_required,
                'price_range': price_range,
                'pharmacy_count': pharmacy_count,
                'type': 'medicine'
            })
        
        return JsonResponse({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        print(f"ERROR in direct_search_medicines: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
def direct_search_pharmacies(request):
    """
    Direct search for pharmacies by name or location.
    Query parameters:
    - q: search query (required)
    - limit: max results (default: 10)
    """
    try:
        from api.users.models import Pharmacy
        from django.db.models import Q
        
        query = request.GET.get('q', '').strip()
        limit = int(request.GET.get('limit', 10))
        
        if not query or len(query) < 2:
            return JsonResponse({
                'success': False,
                'error': 'Search query must be at least 2 characters'
            }, status=400)
        
        # Search pharmacies by name, address
        pharmacies = Pharmacy.objects.filter(
            Q(pharmacy_name__icontains=query) |
            Q(street_address__icontains=query) |
            Q(barangay__icontains=query) |
            Q(city__icontains=query),
            status='approved'
        ).order_by('pharmacy_name')[:limit]
        
        results = []
        for pharmacy in pharmacies:
            # Get storefront image URL
            storefront_image_url = None
            try:
                from api.users.models import UserDocument
                storefront_doc = UserDocument.objects.filter(
                    user=pharmacy.user,
                    id_type__name__icontains='storefront'
                ).first()
                
                if storefront_doc and storefront_doc.file_url:
                    # Check if it's a Cloudinary URL
                    if 'cloudinary.com' in storefront_doc.file_url or storefront_doc.file_url.startswith('http'):
                        storefront_image_url = storefront_doc.file_url
            except Exception as e:
                print(f"Error fetching storefront for pharmacy {pharmacy.id}: {e}")
            
            results.append({
                'id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'address': f"{pharmacy.street_address}, {pharmacy.barangay}",
                'barangay': pharmacy.barangay,
                'city': pharmacy.city,
                'province': pharmacy.province,
                'latitude': float(pharmacy.latitude) if pharmacy.latitude else None,
                'longitude': float(pharmacy.longitude) if pharmacy.longitude else None,
                'storefront_image_url': storefront_image_url,
                'type': 'pharmacy'
            })
        
        return JsonResponse({
            'success': True,
            'data': results,
            'count': len(results)
        })
        
    except Exception as e:
        print(f"ERROR in direct_search_pharmacies: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
def direct_pharmacies_by_medicine(request):
    """
    Direct endpoint to get all pharmacies that have a specific medicine in stock.
    Query parameters:
    - medicine_name: medicine name (required)
    - dosage: medicine dosage (required)
    - form: medicine form (required)
    """
    try:
        from api.inventory.models import PharmacyInventory
        
        medicine_name = request.GET.get('medicine_name', '').strip()
        dosage = request.GET.get('dosage', '').strip()
        form = request.GET.get('form', '').strip()
        
        if not medicine_name or not dosage or not form:
            return JsonResponse({
                'success': False,
                'error': 'medicine_name, dosage, and form are required'
            }, status=400)
        
        # Get all pharmacies that have this medicine
        # Use icontains for name to be more flexible (handles partial matches)
        # Use is_available instead of stock_quantity (stock managed by toggle)
        inventory_items = PharmacyInventory.objects.filter(
            name__icontains=medicine_name,
            dosage__iexact=dosage,
            form=form,
            is_available=True,  # Only check availability toggle
            pharmacy__status='approved'
        ).select_related('pharmacy').order_by('price')
        
        # Log the query for debugging
        print(f"🔍 Searching for medicine: name contains '{medicine_name}', dosage='{dosage}', form='{form}'")
        print(f"✅ Found {inventory_items.count()} available inventory items")
        
        if not inventory_items.exists():
            return JsonResponse({
                'success': True,
                'data': [],
                'count': 0,
                'message': 'No pharmacies found with this medicine in stock'
            })
        
        results = []
        for item in inventory_items:
            pharmacy = item.pharmacy
            
            # Get storefront image URL
            storefront_image_url = None
            try:
                from api.users.models import UserDocument
                storefront_doc = UserDocument.objects.filter(
                    user=pharmacy.user,
                    id_type__name__icontains='storefront'
                ).first()
                
                if storefront_doc and storefront_doc.file_url:
                    # Check if it's a Cloudinary URL
                    if 'cloudinary.com' in storefront_doc.file_url or storefront_doc.file_url.startswith('http'):
                        storefront_image_url = storefront_doc.file_url
            except Exception as e:
                print(f"Error fetching storefront for pharmacy {pharmacy.id}: {e}")
            
            results.append({
                'inventory_id': item.id,
                'pharmacy_id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'address': f"{pharmacy.street_address}, {pharmacy.barangay}",
                'barangay': pharmacy.barangay,
                'city': pharmacy.city,
                'province': pharmacy.province,
                'latitude': float(pharmacy.latitude) if pharmacy.latitude else None,
                'longitude': float(pharmacy.longitude) if pharmacy.longitude else None,
                'storefront_image_url': storefront_image_url,
                'phone': pharmacy.business_phone if pharmacy.business_phone else None,
                'price': float(item.price),
                'original_price': float(item.original_price) if item.original_price else float(item.price),
                'is_on_sale': item.is_on_sale,
                'discount_percentage': item.discount_percentage,
                'stock_quantity': item.stock_quantity,
                'prescription_required': item.prescription_required
            })
        
        return JsonResponse({
            'success': True,
            'data': results,
            'count': len(results),
            'medicine': {
                'name': medicine_name,
                'dosage': dosage,
                'form': form
            }
        })
        
    except Exception as e:
        print(f"ERROR in direct_pharmacies_by_medicine: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
def bulk_set_inventory_max_stock(request):
    """
    Bulk update all inventory items to maximum stock level.
    POST /api/bulk-set-max-stock/
    Optional body: { "pharmacy_id": 123 } to update single pharmacy
    """
    try:
        from api.inventory.models import PharmacyInventory
        from django.db.models import F
        import json
        
        # Check if updating single pharmacy or all
        pharmacy_id = None
        if request.body:
            try:
                data = json.loads(request.body)
                pharmacy_id = data.get('pharmacy_id')
            except:
                pass
        
        # Build query
        if pharmacy_id:
            items = PharmacyInventory.objects.filter(
                pharmacy_id=pharmacy_id,
                stock_quantity__lt=F('max_stock_level')
            )
            scope = f"pharmacy #{pharmacy_id}"
        else:
            items = PharmacyInventory.objects.filter(
                stock_quantity__lt=F('max_stock_level')
            )
            scope = "all pharmacies"
        
        count_to_update = items.count()
        
        if count_to_update == 0:
            return JsonResponse({
                'success': True,
                'message': f'All items already at max stock for {scope}',
                'updated_count': 0
            })
        
        # Perform bulk update
        updated = items.update(stock_quantity=F('max_stock_level'))
        
        print(f"✅ Updated {updated} inventory items to max stock for {scope}")
        
        return JsonResponse({
            'success': True,
            'message': f'Updated {updated} items to maximum stock',
            'updated_count': updated,
            'scope': scope
        })
        
    except Exception as e:
        print(f"ERROR in bulk_set_inventory_max_stock: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
def calculate_distance_and_fee(request):
    """
    Calculate distance and delivery fee between two points.
    Query parameters:
    - pharmacy_lat, pharmacy_lng: Pharmacy coordinates
    - customer_lat, customer_lng: Customer coordinates
    """
    try:
        from api.orders.pricing_service import DeliveryPricingService
        
        pharmacy_lat = request.GET.get('pharmacy_lat')
        pharmacy_lng = request.GET.get('pharmacy_lng')
        customer_lat = request.GET.get('customer_lat')
        customer_lng = request.GET.get('customer_lng')
        
        if not all([pharmacy_lat, pharmacy_lng, customer_lat, customer_lng]):
            return JsonResponse({
                'success': False,
                'error': 'All coordinates are required'
            }, status=400)
        
        # Convert to float
        pharmacy_lat = float(pharmacy_lat)
        pharmacy_lng = float(pharmacy_lng)
        customer_lat = float(customer_lat)
        customer_lng = float(customer_lng)
        
        # Calculate delivery fee and distance
        delivery_fee, distance_km = DeliveryPricingService.calculate_delivery_fee(
            pharmacy_lat,
            pharmacy_lng,
            customer_lat,
            customer_lng,
            use_google_maps=True
        )
        
        # Get pricing breakdown
        breakdown = DeliveryPricingService.get_pricing_breakdown(distance_km or 0)
        
        return JsonResponse({
            'success': True,
            'data': {
                'distance_km': distance_km,
                'delivery_fee': float(delivery_fee),
                'breakdown': breakdown
            }
        })
        
    except Exception as e:
        print(f"ERROR in calculate_distance_and_fee: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


