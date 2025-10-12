"""
Rider-specific API endpoints with full session data support.
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .authentication import CustomAuthenticationBackend
from .models import User, Rider
from .jwt_views import token_manager

logger = logging.getLogger(__name__)


@csrf_exempt
def rider_login(request):
    """
    Rider login endpoint with full session data.
    
    Returns complete rider profile including user info, rider details,
    vehicle information, and statistics.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        import json
        
        try:
            payload = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON body'}, status=400)
        
        identifier = (payload.get('email') or payload.get('username') or '').strip()
        password = (payload.get('password') or '').strip()
        
        if not identifier or not password:
            return JsonResponse({'success': False, 'error': 'Email/username and password are required'}, status=400)
        
        # Authenticate user
        auth_backend = CustomAuthenticationBackend()
        user = auth_backend.authenticate(request, username=identifier, password=password)
        
        if not user:
            logger.warning(f"Failed login attempt for: {identifier}")
            return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=401)
        
        # Check if user is a rider
        if user.role != User.UserRole.RIDER:
            return JsonResponse({'success': False, 'error': 'Only rider accounts can login here'}, status=403)
        
        # Check if account is active
        if not user.is_active:
            return JsonResponse({'success': False, 'error': 'Account is deactivated'}, status=401)
        
        if user.status != User.UserStatus.ACTIVE:
            return JsonResponse({'success': False, 'error': f'Account status: {user.get_status_display()}'}, status=401)
        
        # Get rider profile
        try:
            rider = Rider.objects.get(user=user)
        except Rider.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Rider profile not found'}, status=404)
        
        # Create JWT tokens
        tokens = token_manager.create_tokens(user)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"✅ Rider login successful: {user.email} (ID: {user.id})")
        
        # Prepare complete session data
        session_data = {
            'success': True,
            'message': 'Login successful',
            'tokens': tokens,
            'user': {
                'id': user.id,
                'email': user.email,
                'phone_number': user.phone_number,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'status': user.status,
                'is_email_verified': user.is_email_verified,
                'is_phone_verified': user.is_phone_verified,
                'last_login': user.last_login.isoformat() if user.last_login else None,
            },
            'rider': {
                'id': rider.id,
                'first_name': rider.first_name,
                'last_name': rider.last_name,
                'middle_name': rider.middle_name,
                'date_of_birth': rider.date_of_birth.isoformat() if rider.date_of_birth else None,
                'gender': rider.gender,
                'vehicle_type': rider.vehicle_type,
                'vehicle_brand': rider.vehicle_brand,
                'vehicle_model': rider.vehicle_model,
                'vehicle_color': rider.vehicle_color,
                'plate_number': rider.plate_number,
                'drivers_license_uploaded': rider.drivers_license_uploaded,
                'status': rider.status,
                'is_fully_verified': rider.is_fully_verified,
                'average_rating': float(rider.average_rating) if rider.average_rating else 0.0,
                'total_deliveries': rider.total_deliveries,
                'total_earnings': float(rider.total_earnings) if rider.total_earnings else 0.0,
                'verified_at': rider.verified_at.isoformat() if rider.verified_at else None,
            },
            'stats': {
                'rating': float(rider.average_rating) if rider.average_rating else 0.0,
                'total_deliveries': rider.total_deliveries,
                'successful_deliveries': rider.total_deliveries,  # Same as total_deliveries
                'success_rate': 100.0 if rider.total_deliveries > 0 else 0.0,  # Assume all deliveries are successful
                'total_earnings': float(rider.total_earnings) if rider.total_earnings else 0.0,
            }
        }
        
        return JsonResponse(session_data, status=200)
        
    except Exception as e:
        logger.error(f"❌ Rider login error: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Login failed. Please try again.'
        }, status=500)


@csrf_exempt
def rider_session(request):
    """
    Get current rider session data using auth token.
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        # Get token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse({'success': False, 'error': 'Missing or invalid authorization header'}, status=401)
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Validate token and get user info
        token_info = token_manager.validate_token(token)
        if not token_info:
            return JsonResponse({'success': False, 'error': 'Invalid or expired token'}, status=401)
        
        user_id = token_info.get('user_id')
        user = User.objects.get(id=user_id)
        
        if user.role != User.UserRole.RIDER:
            return JsonResponse({'success': False, 'error': 'Not a rider account'}, status=403)
        
        # Get rider profile
        rider = Rider.objects.get(user=user)
        
        # Return complete session data
        session_data = {
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'phone_number': user.phone_number,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'status': user.status,
            },
            'rider': {
                'id': rider.id,
                'first_name': rider.first_name,
                'last_name': rider.last_name,
                'middle_name': rider.middle_name,
                'date_of_birth': rider.date_of_birth.isoformat() if rider.date_of_birth else None,
                'gender': rider.gender,
                'vehicle_type': rider.vehicle_type,
                'vehicle_brand': rider.vehicle_brand,
                'vehicle_model': rider.vehicle_model,
                'vehicle_color': rider.vehicle_color,
                'plate_number': rider.plate_number,
                'status': rider.status,
                'is_fully_verified': rider.is_fully_verified,
                'average_rating': float(rider.average_rating) if rider.average_rating else 0.0,
                'total_deliveries': rider.total_deliveries,
                'total_earnings': float(rider.total_earnings) if rider.total_earnings else 0.0,
            },
            'stats': {
                'rating': float(rider.average_rating) if rider.average_rating else 0.0,
                'total_deliveries': rider.total_deliveries,
                'successful_deliveries': rider.total_deliveries,  # Same as total_deliveries
                'success_rate': 100.0 if rider.total_deliveries > 0 else 0.0,  # Assume all deliveries are successful
                'total_earnings': float(rider.total_earnings) if rider.total_earnings else 0.0,
            }
        }
        
        return JsonResponse(session_data, status=200)
        
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
    except Rider.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Rider profile not found'}, status=404)
    except Exception as e:
        logger.error(f"❌ Rider session error: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'Failed to fetch session'}, status=500)


@csrf_exempt
def available_orders_count(request):
    """
    Get count of orders that are ready for pickup but not assigned to any rider.
    """
    if request.method != 'GET':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
    
    try:
        from api.orders.models import Order
        
        # Get orders that are accepted, preparing, or ready for pickup - but not assigned to a rider
        available_orders = Order.objects.filter(
            order_status__in=[
                Order.OrderStatus.ACCEPTED,
                Order.OrderStatus.PREPARING,
                Order.OrderStatus.READY_FOR_PICKUP
            ]
        )
        
        # Filter out orders that already have rider assignments
        unassigned_orders = [order for order in available_orders if not order.is_assigned_to_rider()]
        
        count = len(unassigned_orders)
        
        logger.info(f"📦 Found {count} available orders for riders (accepted/preparing/ready_for_pickup)")
        
        return JsonResponse({
            'success': True,
            'count': count
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Available orders count error: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'Failed to fetch available orders count'}, status=500)

