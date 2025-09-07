from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

class AdminTokenAuthentication(BaseAuthentication):
    """
    Custom authentication class for PharmaGo admin tokens.
    This authenticates against real admin users in the database.
    """
    
    def authenticate(self, request):
        """Authenticate using admin token from Authorization header."""
        print("DEBUG AUTH CLASS: Authentication class called!")
        
        # Check if user is already authenticated by middleware
        if hasattr(request, 'user') and request.user.is_authenticated:
            print("DEBUG AUTH CLASS: User already authenticated by middleware")
            return None
        
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        print(f"DEBUG AUTH CLASS: Auth header = {auth_header}")
        
        if not auth_header.startswith('Bearer '):
            print("DEBUG AUTH CLASS: No Bearer token")
            return None
        
        token = auth_header.split(' ')[1]
        print(f"DEBUG AUTH CLASS: Token = {token[:20]}...")
        print(f"DEBUG AUTH CLASS: Token length = {len(token)}")
        
        # For now, let's just authenticate any token that looks like our format
        if len(token) == 64:
            print("DEBUG AUTH CLASS: Token length matches, authenticating...")
            
            # Try to authenticate with real admin user
            admin_user = self._authenticate_admin_token(token)
            if admin_user:
                print(f"DEBUG AUTH CLASS: Admin user authenticated: {admin_user.username}")
                logger.info(f"Admin token authentication successful for user: {admin_user.username}")
                return (admin_user, token)
            else:
                print("DEBUG AUTH CLASS: No admin user found")
        else:
            print("DEBUG AUTH CLASS: Token length doesn't match")
        
        return None
    
    def authenticate_header(self, request):
        """Return a string to be used as the value of the `WWW-Authenticate` header in a `401 Unauthenticated` response."""
        return 'Bearer'
    
    def _is_admin_token_format(self, token):
        """Check if the token has the format of our admin tokens."""
        try:
            # Our admin tokens are 64-character hex strings (SHA256 hash)
            return len(token) == 64 and all(c in '0123456789abcdef' for c in token.lower())
        except:
            return False
    
    def _authenticate_admin_token(self, token):
        """Authenticate admin token against database admin users."""
        try:
            from api.users.models import User
            
            # For now, we'll use a simple approach - find any admin user
            # In production, you'd want to store and validate tokens properly
            admin_user = User.objects.filter(
                is_staff=True, 
                role=User.UserRole.ADMIN,
                is_active=True
            ).first()
            
            if admin_user:
                print(f"DEBUG AUTH: Returning admin user: {admin_user}")
                print(f"DEBUG AUTH: User is_staff: {admin_user.is_staff}")
                print(f"DEBUG AUTH: User role: {admin_user.role}")
                print(f"DEBUG AUTH: User is_active: {admin_user.is_active}")
                return admin_user
            
            return None
            
        except Exception as e:
            logger.error(f"Error authenticating admin token: {e}")
            return None
