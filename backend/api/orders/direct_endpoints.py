"""
Direct order creation endpoints for mobile app
Bypasses authentication middleware for prescription order creation
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
from api.users.models import User, Customer, Pharmacy
from api.locations.models import Address
from api.orders.models import Order, OrderLine
from api.inventory.models import PharmacyInventory, MedicineCategory
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def direct_prescription_order_creation(request):
    """
    Direct prescription order creation endpoint that bypasses authentication middleware.
    Creates order with prescription data from mobile app.
    """
    try:
        # Parse request data
        data = json.loads(request.body)
        
        # Extract order data
        customer_username = data.get('customer_username', '').strip()
        pharmacy_id = data.get('pharmacy_id')
        prescription_image_url = data.get('prescription_image_url', '')
        prescription_notes = data.get('prescription_notes', '')
        
        # Extract address data
        address_data = data.get('address', {})
        street_address = address_data.get('street_address', '').strip()
        barangay = address_data.get('barangay', '').strip()
        city = address_data.get('city', '').strip()
        province = address_data.get('province', '').strip()
        postal_code = address_data.get('postal_code', '').strip()
        latitude = address_data.get('latitude', 0)
        longitude = address_data.get('longitude', 0)
        building_name = address_data.get('building_name', '').strip()
        floor_number = address_data.get('floor_number', '').strip()
        unit_number = address_data.get('unit_number', '').strip()
        landmark = address_data.get('landmark', '').strip()
        address_label = address_data.get('label', 'home')
        is_default = address_data.get('is_default', True)
        
        # Extract payment method
        payment_method = data.get('payment_method', {})
        payment_method_name = payment_method.get('name', 'Cash on Delivery')
        
        # Extract prescription details
        prescription_details = data.get('prescription_details', {})
        doctor_name = prescription_details.get('doctorName', '').strip()
        prescription_date = prescription_details.get('prescriptionDate', '').strip()
        prescription_notes_detail = prescription_details.get('notes', '').strip()
        
        # Validate required fields
        if not customer_username:
            return JsonResponse({
                'success': False,
                'error': 'Customer username is required'
            }, status=400)
        
        if not pharmacy_id:
            return JsonResponse({
                'success': False,
                'error': 'Pharmacy ID is required'
            }, status=400)
        
        if not street_address or not barangay or not city or not province:
            return JsonResponse({
                'success': False,
                'error': 'Complete address information is required'
            }, status=400)
        
        if latitude == 0 or longitude == 0:
            return JsonResponse({
                'success': False,
                'error': 'Valid GPS coordinates are required'
            }, status=400)
        
        # Get customer
        try:
            user = User.objects.get(username=customer_username)
            customer = user.customer
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Customer not found'
            }, status=404)
        except:
            return JsonResponse({
                'success': False,
                'error': 'Customer profile not found'
            }, status=404)
        
        # Get pharmacy
        try:
            pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        except Pharmacy.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Pharmacy not found'
            }, status=404)
        
        # Create or get delivery address
        with transaction.atomic():
            # Reuse existing address with same label to avoid unique constraint issues
            delivery_address = Address.objects.filter(
                customer=customer,
                label=address_label
            ).first()

            if delivery_address:
                # Update fields
                delivery_address.street_address = street_address
                delivery_address.barangay = barangay
                delivery_address.city = city
                delivery_address.province = province
                delivery_address.postal_code = postal_code or delivery_address.postal_code
                delivery_address.latitude = latitude
                delivery_address.longitude = longitude
                delivery_address.building_name = building_name or None
                delivery_address.floor_number = floor_number or None
                delivery_address.unit_number = unit_number or None
                delivery_address.landmark = landmark or None
                delivery_address.is_default = is_default
                delivery_address.save()
            else:
                # Create delivery address
                delivery_address = Address.objects.create(
                    customer=customer,
                    street_address=street_address,
                    barangay=barangay,
                    city=city,
                    province=province,
                    postal_code=postal_code,
                    latitude=latitude,
                    longitude=longitude,
                    building_name=building_name,
                    floor_number=floor_number,
                    unit_number=unit_number,
                    landmark=landmark,
                    label=address_label,
                    is_default=is_default
                )
            
            # Create prescription order
            order = Order.objects.create(
                customer=customer,
                delivery_address=delivery_address,
                order_status=Order.OrderStatus.PENDING,
                payment_status=Order.PaymentStatus.UNPAID,
                delivery_type=Order.DeliveryType.STANDARD,
                subtotal=0.00,  # Will be calculated when pharmacist adds items
                tax_amount=0.00,
                delivery_fee=0.00,
                discount_amount=0.00,
                total_amount=0.00,  # Will be calculated when pharmacist adds items
                source='mobile',
                notes=f"Prescription order - Doctor: {doctor_name}, Date: {prescription_date}. Notes: {prescription_notes_detail}",
                prescription_image_url=prescription_image_url,
                prescription_status='pending',
                prescription_notes=f"Doctor: {doctor_name}, Date: {prescription_date}. {prescription_notes_detail}"
            )
            
            # Create a placeholder order line for prescription review
            # This will be updated when pharmacist reviews and adds actual medicines
            placeholder_inventory = PharmacyInventory.objects.filter(
                pharmacy=pharmacy,
                is_available=True
            ).first()

            if not placeholder_inventory:
                # Ensure a category exists for custom/placeholder products
                category, _ = MedicineCategory.objects.get_or_create(
                    name='Custom Products',
                    defaults={
                        'description': 'Custom products created by pharmacies',
                        'is_active': True,
                        'sort_order': 0,
                    }
                )

                # Create a deterministic placeholder inventory item for this pharmacy
                placeholder_inventory = PharmacyInventory.objects.create(
                    pharmacy=pharmacy,
                    medicine=None,
                    category=category,
                    name='Prescription Review',
                    form='solution',  # valid choice from MedicineCatalog.MedicineForm
                    dosage='N/A',
                    description='Placeholder for prescription-only orders',
                    prescription_required=True,
                    price=0.00,
                    original_price=0.00,
                    cost_price=0.00,
                    stock_quantity=0,
                    is_available=True
                )

            # Link order to pharmacy via placeholder inventory item
            OrderLine.objects.create(
                order=order,
                inventory_item=placeholder_inventory,
                quantity=1,
                unit_price=0.00,
                total_price=0.00,
                prescription_required=True,
                prescription_status='pending',
                prescription_notes=f"Prescription review required. Doctor: {doctor_name}, Date: {prescription_date}",
                notes="Prescription order - awaiting pharmacist review"
            )
            
            logger.info(f"✅ Prescription order created successfully: {order.order_number}")
            
            # Build absolute prescription image URL for client convenience
            absolute_prescription_url = None
            if prescription_image_url:
                try:
                    absolute_prescription_url = request.build_absolute_uri(prescription_image_url)
                except Exception:
                    absolute_prescription_url = prescription_image_url

            return JsonResponse({
                'success': True,
                'message': 'Prescription order created successfully',
                'data': {
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'order_status': order.order_status,
                    'prescription_status': order.prescription_status,
                    'pharmacy_name': pharmacy.pharmacy_name,
                    'pharmacy_id': pharmacy.id,
                    'delivery_address': {
                        'street_address': delivery_address.street_address,
                        'barangay': delivery_address.barangay,
                        'city': delivery_address.city,
                        'province': delivery_address.province,
                        'full_address': delivery_address.full_address
                    },
                    'payment_method': payment_method_name,
                    'prescription_image_url': absolute_prescription_url,
                    'created_at': order.created_at.isoformat(),
                    'estimated_delivery': None  # Will be set when pharmacist processes
                }
            })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    
    except Exception as e:
        logger.error(f"❌ Error creating prescription order: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to create prescription order',
            'message': f'Error: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_order_status(request, order_id):
    """
    Get order status for tracking page
    """
    try:
        order = Order.objects.get(id=order_id)
        
            # Get pharmacy information from the first order line
        pharmacy = None
        pharmacy_name = 'Unknown'
        pharmacy_id = None
        pharmacy_barangay = None
        pharmacy_latitude = None
        pharmacy_longitude = None
        pharmacy_phone = None
        pharmacy_storefront_image_url = None
        
        if order.order_lines.exists():
            pharmacy = order.order_lines.first().inventory_item.pharmacy
            pharmacy_name = pharmacy.pharmacy_name
            pharmacy_id = pharmacy.id
            pharmacy_barangay = pharmacy.barangay
            pharmacy_latitude = pharmacy.latitude
            pharmacy_longitude = pharmacy.longitude
            pharmacy_phone = pharmacy.business_phone
            
            # Get storefront image from user documents using the same pattern as active-pharmacies endpoint
            try:
                from api.users.models import UserDocument
                import os
                import boto3
                from urllib.parse import urlparse
                
                # Look for storefront image document using the same pattern as active-pharmacies
                storefront_doc = UserDocument.objects.filter(
                    user=pharmacy.user,
                    id_type__name__icontains='storefront'
                ).first()
                
                if not storefront_doc:
                    # Try alternative search patterns
                    storefront_doc = UserDocument.objects.filter(
                        user=pharmacy.user,
                        document_file__icontains='storefront'
                    ).first()
                
                if storefront_doc and storefront_doc.file_url:
                    # Prefer presigned S3 URL for mobile compatibility; fallback to backend proxy
                    try:
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
                        pharmacy_storefront_image_url = s3_client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': bucket_name, 'Key': key},
                            ExpiresIn=3600
                        )
                    except Exception:
                        # Prefer dedicated storefront proxy endpoint; fallback to generic document endpoint
                        try:
                            pharmacy_storefront_image_url = request.build_absolute_uri(f"/api/pharmacy-storefront/{pharmacy.id}/")
                        except Exception:
                            pharmacy_storefront_image_url = request.build_absolute_uri(f"/api/document/{storefront_doc.id}/")
                    logger.info(f"Found storefront image for pharmacy {pharmacy.id}: {pharmacy_storefront_image_url}")
                else:
                    logger.info(f"No storefront image found for pharmacy {pharmacy.id}")
                        
            except Exception as e:
                logger.warning(f"Could not fetch pharmacy storefront image: {str(e)}")
        
        # Normalize prescription image URL to absolute
        absolute_prescription_url = None
        if order.prescription_image_url:
            try:
                if str(order.prescription_image_url).startswith('http'):
                    absolute_prescription_url = order.prescription_image_url
                else:
                    absolute_prescription_url = request.build_absolute_uri(order.prescription_image_url)
            except Exception:
                absolute_prescription_url = order.prescription_image_url

        # Build items data (exclude zero-priced placeholder lines)
        items_data = []
        try:
            for line in order.order_lines.select_related('inventory_item').all():
                try:
                    total_price_value = float(line.total_price)
                except Exception:
                    total_price_value = 0.0
                if total_price_value <= 0:
                    continue
                item_name = None
                try:
                    # Prefer display_name if available
                    item_name = getattr(line.inventory_item, 'display_name', None) or getattr(line.inventory_item, 'name', None) or 'Item'
                except Exception:
                    item_name = 'Item'
                items_data.append({
                    'name': item_name,
                    'quantity': line.quantity,
                    'unit_price': float(line.unit_price),
                    'total_price': total_price_value,
                })
        except Exception:
            items_data = []

        return JsonResponse({
            'success': True,
            'data': {
                'order_id': order.id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'prescription_status': order.prescription_status,
                'payment_status': order.payment_status,
                'subtotal': float(order.subtotal),
                'tax_amount': float(order.tax_amount),
                'delivery_fee': float(order.delivery_fee),
                'discount_amount': float(order.discount_amount),
                'total_amount': float(order.total_amount),
                'items': items_data,
                'pharmacy_name': pharmacy_name,
                'pharmacy_id': pharmacy_id,
                'pharmacy_barangay': pharmacy_barangay,
                'pharmacy_latitude': pharmacy_latitude,
                'pharmacy_longitude': pharmacy_longitude,
                'pharmacy_phone': pharmacy_phone,
                'pharmacy_email': pharmacy.business_email if pharmacy else None,
                'pharmacy_storefront_image_url': pharmacy_storefront_image_url,
                'delivery_address': order.delivery_address.full_address,
                'delivery_latitude': float(order.delivery_address.latitude) if getattr(order.delivery_address, 'latitude', None) is not None else None,
                'delivery_longitude': float(order.delivery_address.longitude) if getattr(order.delivery_address, 'longitude', None) is not None else None,
                'prescription_image_url': absolute_prescription_url,
                'prescription_notes': order.prescription_notes,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'estimated_delivery': order.estimated_delivery.isoformat() if order.estimated_delivery else None,
                'actual_delivery': order.actual_delivery.isoformat() if order.actual_delivery else None,
                'notes': order.notes
            }
        })
        
    except Order.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Order not found'
        }, status=404)
    
    except Exception as e:
        logger.error(f"❌ Error getting order status: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to get order status',
            'message': f'Error: {str(e)}'
        }, status=500)
