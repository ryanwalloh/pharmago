import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


class PasswordValidator:
    """
    Custom password validator with configurable strength requirements.
    """
    
    def __init__(self, min_length=8, require_uppercase=True, require_lowercase=True,
                 require_digits=True, require_special=True, max_length=128):
        self.min_length = min_length
        self.max_length = max_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digits = require_digits
        self.require_special = require_special
    
    def validate(self, password, user=None):
        """
        Validate password strength.
        """
        errors = []
        
        # Check length
        if len(password) < self.min_length:
            errors.append(
                _('Password must be at least %(min_length)d characters long.') % 
                {'min_length': self.min_length}
            )
        
        if len(password) > self.max_length:
            errors.append(
                _('Password must be no more than %(max_length)d characters long.') % 
                {'max_length': self.max_length}
            )
        
        # Check character requirements
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append(_('Password must contain at least one uppercase letter.'))
        
        if self.require_lowercase and not re.search(r'[a-z]', password):
            errors.append(_('Password must contain at least one lowercase letter.'))
        
        if self.require_digits and not re.search(r'\d', password):
            errors.append(_('Password must contain at least one digit.'))
        
        if self.require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append(_('Password must contain at least one special character.'))
        
        # Check for common weak patterns
        if self._is_common_password(password):
            errors.append(_('Password is too common. Please choose a stronger password.'))
        
        if self._has_sequential_chars(password):
            errors.append(_('Password contains sequential characters. Please choose a stronger password.'))
        
        if self._has_repeated_chars(password):
            errors.append(_('Password contains too many repeated characters. Please choose a stronger password.'))
        
        if errors:
            raise ValidationError(errors)
    
    def _is_common_password(self, password):
        """
        Check if password is in common weak passwords list.
        """
        common_passwords = {
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            'dragon', 'master', 'sunshine', 'princess', 'qwerty123'
        }
        return password.lower() in common_passwords
    
    def _has_sequential_chars(self, password):
        """
        Check for sequential characters (e.g., abc, 123, qwe).
        """
        if len(password) < 3:
            return False
        
        for i in range(len(password) - 2):
            # Check for sequential letters
            if (password[i].isalpha() and password[i+1].isalpha() and password[i+2].isalpha()):
                if (ord(password[i+1]) == ord(password[i]) + 1 and 
                    ord(password[i+2]) == ord(password[i+1]) + 1):
                    return True
            
            # Check for sequential numbers
            if (password[i].isdigit() and password[i+1].isdigit() and password[i+2].isdigit()):
                if (int(password[i+1]) == int(password[i]) + 1 and 
                    int(password[i+2]) == int(password[i+1]) + 1):
                    return True
        
        return False
    
    def _has_repeated_chars(self, password):
        """
        Check for too many repeated characters.
        """
        if len(password) < 4:
            return False
        
        for i in range(len(password) - 3):
            if password[i] == password[i+1] == password[i+2] == password[i+3]:
                return True
        
        return False


class RateLimiter:
    """
    Rate limiting utility for authentication endpoints.
    """
    
    def __init__(self, key_prefix, max_attempts, window_minutes):
        self.key_prefix = key_prefix
        self.max_attempts = max_attempts
        self.window_minutes = window_minutes
    
    def is_allowed(self, identifier, action='default'):
        """
        Check if the action is allowed based on rate limiting.
        """
        cache_key = f"{self.key_prefix}:{action}:{identifier}"
        
        # Get current attempts
        attempts = cache.get(cache_key, 0)
        
        if attempts >= self.max_attempts:
            return False
        
        return True
    
    def increment(self, identifier, action='default'):
        """
        Increment the attempt counter.
        """
        cache_key = f"{self.key_prefix}:{action}:{identifier}"
        
        # Get current attempts
        attempts = cache.get(cache_key, 0)
        
        # Increment and set with expiration
        cache.set(
            cache_key, 
            attempts + 1, 
            timeout=self.window_minutes * 60
        )
        
        return attempts + 1
    
    def reset(self, identifier, action='default'):
        """
        Reset the attempt counter.
        """
        cache_key = f"{self.key_prefix}:{action}:{identifier}"
        cache.delete(cache_key)


class SessionManager:
    """
    Session management utility for enhanced security.
    """
    
    def __init__(self, max_sessions_per_user=5, session_timeout_hours=24):
        self.max_sessions_per_user = max_sessions_per_user
        self.session_timeout_hours = session_timeout_hours
    
    def can_create_session(self, user_id):
        """
        Check if user can create a new session.
        """
        cache_key = f"user_sessions:{user_id}"
        current_sessions = cache.get(cache_key, 0)
        
        return current_sessions < self.max_sessions_per_user
    
    def add_session(self, user_id, session_key):
        """
        Add a new session for the user.
        """
        cache_key = f"user_sessions:{user_id}"
        current_sessions = cache.get(cache_key, 0)
        
        # Store session info
        session_info = {
            'created_at': timezone.now().isoformat(),
            'expires_at': (timezone.now() + timedelta(hours=self.session_timeout_hours)).isoformat()
        }
        
        cache.set(
            f"session:{session_key}",
            session_info,
            timeout=self.session_timeout_hours * 3600
        )
        
        # Update session count
        cache.set(cache_key, current_sessions + 1, timeout=None)
    
    def remove_session(self, user_id, session_key):
        """
        Remove a session for the user.
        """
        cache_key = f"user_sessions:{user_id}"
        current_sessions = cache.get(cache_key, 0)
        
        # Remove session info
        cache.delete(f"session:{session_key}")
        
        # Update session count
        if current_sessions > 0:
            cache.set(cache_key, current_sessions - 1, timeout=None)
    
    def get_active_sessions(self, user_id):
        """
        Get count of active sessions for user.
        """
        cache_key = f"user_sessions:{user_id}"
        return cache.get(cache_key, 0)
    
    def cleanup_expired_sessions(self, user_id):
        """
        Clean up expired sessions for a user.
        """
        # This would typically be done by a periodic task
        # For now, we'll just return the current count
        return self.get_active_sessions(user_id)


class SecurityAuditLogger:
    """
    Security audit logging utility.
    """
    
    def __init__(self):
        self.cache_prefix = "security_audit"
    
    def log_login_attempt(self, identifier, success, ip_address=None, user_agent=None):
        """
        Log login attempt for security monitoring.
        """
        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'identifier': identifier,
            'success': success,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'type': 'login_attempt'
        }
        
        # Store in cache for recent monitoring
        cache_key = f"{self.cache_prefix}:login:{identifier}:{int(timezone.now().timestamp())}"
        cache.set(cache_key, log_entry, timeout=3600)  # Keep for 1 hour
    
    def log_security_event(self, event_type, user_id=None, details=None, ip_address=None):
        """
        Log security events for monitoring.
        """
        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'details': details,
            'ip_address': ip_address
        }
        
        # Store in cache for recent monitoring
        cache_key = f"{self.cache_prefix}:event:{event_type}:{int(timezone.now().timestamp())}"
        cache.set(cache_key, log_entry, timeout=3600)  # Keep for 1 hour
    
    def get_recent_events(self, identifier=None, event_type=None, hours=24):
        """
        Get recent security events for monitoring.
        """
        # This is a simplified version - in production you'd use a proper logging system
        # For now, we'll return an empty list as the cache-based approach is limited
        return []
