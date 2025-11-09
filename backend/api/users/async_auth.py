"""
Async authentication endpoints for mobile apps.
Prevents blocking the ASGI event loop during login operations.
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from asgiref.sync import sync_to_async
from django.contrib.auth import authenticate

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
async def async_user_login(request):
    """
    Async user login endpoint for mobile apps.
    Prevents event loop blocking during authentication.
    """
    try:
        # Parse request body
        try:
            data = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({
                'success': False,
                'error': 'Invalid JSON'
            }, status=400)
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return JsonResponse({
                'success': False,
                'error': 'Username and password are required'
            }, status=400)
        
        # Wrap all database operations in sync_to_async
        @sync_to_async
        def authenticate_and_fetch_user():
            """Authenticate user and fetch profile data"""
            from api.users.models import User, Customer
            from api.users.serializers import UserSerializer
            
            # Authenticate
            user = authenticate(username=username, password=password)
            
            if not user:
                return None, 'Invalid credentials'
            
            if not user.is_active:
                return None, 'Account is deactivated'
            
            if user.status != User.UserStatus.ACTIVE:
                return None, f'Account status: {user.get_status_display()}'
            
            # Update last login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # Serialize user data (this may have DB queries for related fields)
            serializer = UserSerializer(user)
            user_data = serializer.data
            
            return user_data, None
        
        # Await the async database operation
        user_data, error = await authenticate_and_fetch_user()
        
        if error:
            logger.warning(f"❌ Async login failed for {username}: {error}")
            return JsonResponse({
                'success': False,
                'error': error
            }, status=401)
        
        logger.info(f"✅ Async: User {username} logged in successfully")
        
        return JsonResponse({
            'success': True,
            'message': 'Login successful',
            'user': user_data,
            'tokens': {}  # Tokens handled separately if needed
        }, status=200)
        
    except Exception as e:
        logger.error(f"❌ Async login error: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Login failed',
            'message': str(e)
        }, status=500)

