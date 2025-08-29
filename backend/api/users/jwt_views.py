from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction

from .models import User
from .serializers import UserLoginSerializer
from .security import RateLimiter, SecurityAuditLogger, PasswordValidator
from .authentication import CustomAuthenticationBackend


class JWTTokenManager:
    """
    JWT token management utility with enhanced security.
    """
    
    def __init__(self):
        self.rate_limiter = RateLimiter('jwt_auth', max_attempts=10, window_minutes=15)
        self.audit_logger = SecurityAuditLogger()
        self.password_validator = PasswordValidator()
    
    def create_tokens(self, user):
        """
        Create access and refresh tokens for user.
        """
        try:
            refresh = RefreshToken.for_user(user)
            access = refresh.access_token
            
            # Add custom claims
            access['user_id'] = user.id
            access['role'] = user.role
            access['email'] = user.email
            access['phone_number'] = user.phone_number
            
            # Store token info for tracking
            self._store_token_info(user.id, str(access), str(refresh))
            
            return {
                'access': str(access),
                'refresh': str(refresh),
                'access_expires_in': access.lifetime.total_seconds(),
                'refresh_expires_in': refresh.lifetime.total_seconds()
            }
        except Exception as e:
            self.audit_logger.log_security_event(
                'token_creation_failed',
                user_id=user.id,
                details=str(e)
            )
            raise
    
    def refresh_tokens(self, refresh_token):
        """
        Refresh access token using refresh token.
        """
        try:
            refresh = RefreshToken(refresh_token)
            access = refresh.access_token
            
            # Validate refresh token
            if refresh.is_expired():
                raise InvalidToken('Refresh token has expired')
            
            # Get user from token
            user_id = access.get('user_id')
            if not user_id:
                raise InvalidToken('Invalid token format')
            
            try:
                user = User.objects.get(id=user_id, is_active=True)
            except User.DoesNotExist:
                raise InvalidToken('User not found or inactive')
            
            # Create new access token
            new_access = refresh.access_token
            new_access['user_id'] = user.id
            new_access['role'] = user.role
            new_access['email'] = user.email
            new_access['phone_number'] = user.phone_number
            
            # Update token tracking
            self._update_token_info(user.id, str(new_access))
            
            return {
                'access': str(new_access),
                'access_expires_in': new_access.lifetime.total_seconds()
            }
            
        except (InvalidToken, TokenError) as e:
            self.audit_logger.log_security_event(
                'token_refresh_failed',
                details=str(e)
            )
            raise
        except Exception as e:
            self.audit_logger.log_security_event(
                'token_refresh_error',
                details=str(e)
            )
            raise
    
    def revoke_tokens(self, user_id, refresh_token=None):
        """
        Revoke tokens for user.
        """
        try:
            if refresh_token:
                # Blacklist specific refresh token
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Remove all token tracking for user
            self._remove_user_tokens(user_id)
            
            self.audit_logger.log_security_event(
                'tokens_revoked',
                user_id=user_id
            )
            
            return True
        except Exception as e:
            self.audit_logger.log_security_event(
                'token_revocation_failed',
                user_id=user_id,
                details=str(e)
            )
            return False
    
    def validate_token(self, access_token):
        """
        Validate access token and return user info.
        """
        try:
            token = AccessToken(access_token)
            
            # Check if token is expired
            if token.is_expired():
                raise InvalidToken('Access token has expired')
            
            # Get user info from token
            user_id = token.get('user_id')
            if not user_id:
                raise InvalidToken('Invalid token format')
            
            return {
                'user_id': user_id,
                'role': token.get('role'),
                'email': token.get('email'),
                'phone_number': token.get('phone_number'),
                'exp': token.get('exp')
            }
            
        except (InvalidToken, TokenError) as e:
            self.audit_logger.log_security_event(
                'token_validation_failed',
                details=str(e)
            )
            raise
    
    def _store_token_info(self, user_id, access_token, refresh_token):
        """
        Store token information for tracking and management.
        """
        token_info = {
            'user_id': user_id,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'created_at': timezone.now().isoformat(),
            'last_used': timezone.now().isoformat()
        }
        
        cache_key = f"user_tokens:{user_id}"
        user_tokens = cache.get(cache_key, [])
        user_tokens.append(token_info)
        
        # Keep only last 5 tokens per user
        if len(user_tokens) > 5:
            user_tokens = user_tokens[-5:]
        
        cache.set(cache_key, user_tokens, timeout=None)
    
    def _update_token_info(self, user_id, access_token):
        """
        Update last used timestamp for access token.
        """
        cache_key = f"user_tokens:{user_id}"
        user_tokens = cache.get(cache_key, [])
        
        for token_info in user_tokens:
            if token_info.get('access_token') == access_token:
                token_info['last_used'] = timezone.now().isoformat()
                break
        
        cache.set(cache_key, user_tokens, timeout=None)
    
    def _remove_user_tokens(self, user_id):
        """
        Remove all token tracking for a user.
        """
        cache_key = f"user_tokens:{user_id}"
        cache.delete(cache_key)


# Global token manager instance
token_manager = JWTTokenManager()


@api_view(['POST'])
@permission_classes([AllowAny])
def jwt_login(request):
    """
    JWT login endpoint with enhanced security.
    """
    # Rate limiting check
    client_ip = request.META.get('REMOTE_ADDR', 'unknown')
    if not token_manager.rate_limiter.is_allowed(client_ip, 'login'):
        return Response({
            'error': 'Too many login attempts. Please try again later.',
            'retry_after': 900  # 15 minutes
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    serializer = UserLoginSerializer(data=request.data)
    if not serializer.is_valid():
        # Increment rate limiter for failed attempts
        token_manager.rate_limiter.increment(client_ip, 'login')
        
        token_manager.audit_logger.log_login_attempt(
            identifier=request.data.get('username', 'unknown'),
            success=False,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Authenticate user
        auth_backend = CustomAuthenticationBackend()
        user = auth_backend.authenticate(
            request,
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            # Increment rate limiter for failed attempts
            token_manager.rate_limiter.increment(client_ip, 'login')
            
            token_manager.audit_logger.log_login_attempt(
                identifier=serializer.validated_data['username'],
                success=False,
                ip_address=client_ip,
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            
            return Response({
                'error': 'Invalid credentials or account locked.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is active and verified
        if not user.is_active:
            return Response({
                'error': 'Account is deactivated.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        if user.status != User.UserStatus.ACTIVE:
            return Response({
                'error': f'Account status: {user.get_status_display()}'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Create JWT tokens
        tokens = token_manager.create_tokens(user)
        
        # Reset rate limiter on successful login
        token_manager.rate_limiter.reset(client_ip, 'login')
        
        # Log successful login
        token_manager.audit_logger.log_login_attempt(
            identifier=serializer.validated_data['username'],
            success=True,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT'),
            user_id=user.id
        )
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'phone_number': user.phone_number,
                'role': user.role,
                'status': user.status,
                'is_email_verified': user.is_email_verified,
                'is_phone_verified': user.is_phone_verified
            },
            'tokens': tokens
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        token_manager.audit_logger.log_security_event(
            'login_error',
            details=str(e),
            ip_address=client_ip
        )
        
        return Response({
            'error': 'Login failed. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def jwt_refresh(request):
    """
    JWT token refresh endpoint.
    """
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({
            'error': 'Refresh token is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        tokens = token_manager.refresh_tokens(refresh_token)
        
        return Response({
            'message': 'Token refreshed successfully',
            'tokens': tokens
        }, status=status.HTTP_200_OK)
        
    except (InvalidToken, TokenError) as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        token_manager.audit_logger.log_security_event(
            'token_refresh_error',
            details=str(e)
        )
        
        return Response({
            'error': 'Token refresh failed.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def jwt_logout(request):
    """
    JWT logout endpoint with token revocation.
    """
    refresh_token = request.data.get('refresh')
    user_id = request.data.get('user_id')
    
    if not refresh_token or not user_id:
        return Response({
            'error': 'Refresh token and user ID are required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Revoke tokens
        success = token_manager.revoke_tokens(user_id, refresh_token)
        
        if success:
            return Response({
                'message': 'Logout successful. Tokens revoked.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Logout failed.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        token_manager.audit_logger.log_security_event(
            'logout_error',
            user_id=user_id,
            details=str(e)
        )
        
        return Response({
            'error': 'Logout failed.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def jwt_verify(request):
    """
    JWT token verification endpoint.
    """
    access_token = request.data.get('access')
    if not access_token:
        return Response({
            'error': 'Access token is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        token_info = token_manager.validate_token(access_token)
        
        return Response({
            'message': 'Token is valid',
            'token_info': token_info
        }, status=status.HTTP_200_OK)
        
    except (InvalidToken, TokenError) as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        token_manager.audit_logger.log_security_event(
            'token_verification_error',
            details=str(e)
        )
        
        return Response({
            'error': 'Token verification failed.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
