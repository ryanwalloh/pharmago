from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
import json
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
async def create_or_update_address(request):
    """
    Create or update a customer address.
    
    Expected JSON body:
    {
        "customer_id": 123,
        "label": "home",
        "street_address": "123 Main St",
        "barangay": "Barangay Name",
        "building_name": "Building Name (optional)",
        "floor_number": "2nd Floor (optional)",
        "unit_number": "Unit 201 (optional)",
        "landmark": "Near Mall (optional)",
        "latitude": 8.123456,
        "longitude": 124.123456,
        "city": "Iligan City",
        "province": "Lanao del Norte",
        "postal_code": "9200 (optional)",
        "is_default": true
    }
    """
    try:
        payload = json.loads(request.body or '{}')
        logger.info(f"📍 Address creation/update payload: {payload}")

        from api.locations.models import Address
        from api.users.models import Customer
        from channels.db import database_sync_to_async

        customer_id = payload.get('customer_id')
        if not customer_id:
            return JsonResponse({
                'success': False,
                'error': 'Customer ID is required'
            }, status=400)

        @database_sync_to_async
        def process_address():
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                return 404, {
                    'success': False,
                    'error': 'Customer not found'
                }

            label = payload.get('label', 'home')
            street_address = payload.get('street_address')
            barangay = payload.get('barangay')
            latitude = payload.get('latitude')
            longitude = payload.get('longitude')

            if not all([street_address, barangay, latitude, longitude]):
                return 400, {
                    'success': False,
                    'error': 'street_address, barangay, latitude, and longitude are required'
                }

            building_name = payload.get('building_name', '')
            floor_number = payload.get('floor_number', '')
            unit_number = payload.get('unit_number', '')
            landmark = payload.get('landmark', '')
            city = payload.get('city', 'Iligan City')
            province = payload.get('province', 'Lanao del Norte')
            postal_code = payload.get('postal_code', '')
            is_default = payload.get('is_default', True)

            with transaction.atomic():
                try:
                    address = Address.objects.get(customer=customer, label=label)

                    address.street_address = street_address
                    address.barangay = barangay
                    address.building_name = building_name
                    address.floor_number = floor_number
                    address.unit_number = unit_number
                    address.landmark = landmark
                    address.city = city
                    address.province = province
                    address.postal_code = postal_code
                    address.latitude = latitude
                    address.longitude = longitude

                    if is_default and not address.is_default:
                        Address.objects.filter(
                            customer=customer,
                            is_default=True
                        ).exclude(id=address.id).update(is_default=False)
                        address.is_default = True

                    address.save()
                    logger.info(f"✅ Address updated successfully: ID {address.id}, Label: {label}")
                    action = 'updated'

                except Address.DoesNotExist:
                    if is_default:
                        Address.objects.filter(
                            customer=customer,
                            is_default=True
                        ).update(is_default=False)

                    address = Address.objects.create(
                        customer=customer,
                        label=label,
                        street_address=street_address,
                        barangay=barangay,
                        building_name=building_name,
                        floor_number=floor_number,
                        unit_number=unit_number,
                        landmark=landmark,
                        city=city,
                        province=province,
                        postal_code=postal_code,
                        latitude=latitude,
                        longitude=longitude,
                        is_default=is_default,
                    )
                    logger.info(f"✅ Address created successfully: ID {address.id}, Label: {label}")
                    action = 'created'

            return 201, {
                'success': True,
                'message': f'Address {action} successfully',
                'action': action,
                'address': {
                    'id': address.id,
                    'label': address.label,
                    'street_address': address.street_address,
                    'barangay': address.barangay,
                    'building_name': address.building_name,
                    'floor_number': address.floor_number,
                    'unit_number': address.unit_number,
                    'landmark': address.landmark,
                    'city': address.city,
                    'province': address.province,
                    'postal_code': address.postal_code,
                    'latitude': float(address.latitude),
                    'longitude': float(address.longitude),
                    'is_default': address.is_default,
                    'full_address': address.full_address,
                    'created_at': address.created_at.isoformat(),
                }
            }

        status_code, payload_response = await process_address()
        return JsonResponse(payload_response, status=status_code)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON payload'
        }, status=400)
    except Exception as e:
        logger.error(f"❌ Failed to create/update address: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to create/update address',
            'message': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
async def get_customer_addresses(request, customer_id):
    """
    Get all addresses for a customer.
    """
    try:
        from api.locations.models import Address
        from api.users.models import Customer
        from channels.db import database_sync_to_async

        @database_sync_to_async
        def fetch_addresses():
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                return None, {
                    'success': False,
                    'error': 'Customer not found'
                }

            addresses = Address.objects.filter(customer=customer).order_by('-is_default', '-created_at')
            address_list = []
            for address in addresses:
                address_list.append({
                    'id': address.id,
                    'label': address.label,
                    'street_address': address.street_address,
                    'barangay': address.barangay,
                    'building_name': address.building_name,
                    'floor_number': address.floor_number,
                    'unit_number': address.unit_number,
                    'landmark': address.landmark,
                    'city': address.city,
                    'province': address.province,
                    'postal_code': address.postal_code,
                    'latitude': float(address.latitude) if address.latitude else None,
                    'longitude': float(address.longitude) if address.longitude else None,
                    'is_default': address.is_default,
                    'full_address': address.full_address,
                    'created_at': address.created_at.isoformat(),
                })

            return address_list, None

        address_list, error_payload = await fetch_addresses()

        if error_payload:
            return JsonResponse(error_payload, status=404)

        logger.info(f"📋 Retrieved {len(address_list)} addresses for customer {customer_id}")

        return JsonResponse({
            'success': True,
            'addresses': address_list,
            'count': len(address_list)
        }, status=200)

    except Exception as e:
        logger.error(f"❌ Failed to get customer addresses: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to get customer addresses',
            'message': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_default_address(request, customer_id):
    """
    Get the default address for a customer.
    """
    try:
        # Import models inside the function
        from api.locations.models import Address
        from api.users.models import Customer
        
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Customer not found'
            }, status=404)
        
        try:
            address = Address.objects.get(
                customer=customer,
                is_default=True
            )
            
            address_data = {
                'id': address.id,
                'label': address.label,
                'street_address': address.street_address,
                'barangay': address.barangay,
                'building_name': address.building_name,
                'floor_number': address.floor_number,
                'unit_number': address.unit_number,
                'landmark': address.landmark,
                'city': address.city,
                'province': address.province,
                'postal_code': address.postal_code,
                'latitude': float(address.latitude) if address.latitude else None,
                'longitude': float(address.longitude) if address.longitude else None,
                'is_default': address.is_default,
                'full_address': address.full_address,
                'created_at': address.created_at.isoformat(),
            }
            
            logger.info(f"🏠 Retrieved default address for customer {customer_id}")
            
            return JsonResponse({
                'success': True,
                'address': address_data
            }, status=200)
            
        except Address.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'No default address found for this customer'
            }, status=404)
            
    except Exception as e:
        logger.error(f"❌ Failed to get default address: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to get default address',
            'message': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["PUT"])
def update_address(request, address_id):
    """
    Update an existing address.
    
    Expected JSON body:
    {
        "label": "home",
        "street_address": "123 Main St",
        "barangay": "Barangay Name",
        "building_name": "Building Name (optional)",
        "floor_number": "2nd Floor (optional)",
        "unit_number": "Unit 201 (optional)",
        "landmark": "Near Mall (optional)",
        "latitude": 8.123456,
        "longitude": 124.123456,
        "city": "Iligan City",
        "province": "Lanao del Norte",
        "postal_code": "9200 (optional)",
        "is_default": true
    }
    """
    try:
        payload = json.loads(request.body or '{}')
        logger.info(f"📍 Address update payload for ID {address_id}: {payload}")
        
        # Import models inside the function
        from api.locations.models import Address
        
        try:
            address = Address.objects.get(id=address_id)
        except Address.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Address not found'
            }, status=404)
        
        # Update fields
        if 'label' in payload:
            address.label = payload['label']
        if 'street_address' in payload:
            address.street_address = payload['street_address']
        if 'barangay' in payload:
            address.barangay = payload['barangay']
        if 'building_name' in payload:
            address.building_name = payload['building_name']
        if 'floor_number' in payload:
            address.floor_number = payload['floor_number']
        if 'unit_number' in payload:
            address.unit_number = payload['unit_number']
        if 'landmark' in payload:
            address.landmark = payload['landmark']
        if 'city' in payload:
            address.city = payload['city']
        if 'province' in payload:
            address.province = payload['province']
        if 'postal_code' in payload:
            address.postal_code = payload['postal_code']
        if 'latitude' in payload:
            address.latitude = payload['latitude']
        if 'longitude' in payload:
            address.longitude = payload['longitude']
        
        # Handle default address logic
        if 'is_default' in payload and payload['is_default']:
            # If setting as default, unset other default addresses for this customer
            Address.objects.filter(
                customer=address.customer,
                is_default=True
            ).exclude(id=address.id).update(is_default=False)
            address.is_default = True
        
        address.save()
        
        logger.info(f"✅ Address updated successfully: ID {address.id}")
        
        return JsonResponse({
            'success': True,
            'message': 'Address updated successfully',
            'address': {
                'id': address.id,
                'label': address.label,
                'street_address': address.street_address,
                'barangay': address.barangay,
                'building_name': address.building_name,
                'floor_number': address.floor_number,
                'unit_number': address.unit_number,
                'landmark': address.landmark,
                'city': address.city,
                'province': address.province,
                'postal_code': address.postal_code,
                'latitude': float(address.latitude) if address.latitude else None,
                'longitude': float(address.longitude) if address.longitude else None,
                'is_default': address.is_default,
                'full_address': address.full_address,
                'created_at': address.created_at.isoformat(),
                'updated_at': address.updated_at.isoformat(),
            }
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON payload'
        }, status=400)
    except Exception as e:
        logger.error(f"❌ Failed to update address: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to update address',
            'message': str(e)
        }, status=500)