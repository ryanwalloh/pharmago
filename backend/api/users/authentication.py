from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import re

User = get_user_model()


class CustomAuthenticationBackend(BaseBackend):
    """
    Custom authentication backend supporting email/phone authentication
    with security features like account lockout and failed login tracking.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user using email, phone, or username with security checks.
        """
        if not username or not password:
            return None
        
        # Determine if username is email, phone, or username
        identifier = self._normalize_identifier(username)
        
        try:
            # Try to find user by email, phone, or username
            if '@' in identifier:
                user = User.objects.get(email=identifier)
            elif re.match(r'^\+?63\d{9}$', identifier):
                user = User.objects.get(phone_number=identifier)
            else:
                user = User.objects.get(username=identifier)
            
            # Check if account is locked
            if self._is_account_locked(user):
                return None
            
            # Check if user is active and verified
            if not user.is_active or user.status != User.UserStatus.ACTIVE:
                return None
            
            # Verify password
            if user.check_password(password):
                # Reset failed login attempts on successful login
                self._reset_failed_attempts(user)
                return user
            else:
                # Increment failed login attempts
                self._increment_failed_attempts(user)
                return None
                
        except User.DoesNotExist:
            return None
    
    def get_user(self, user_id):
        """
        Get user by ID.
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
    
    def _normalize_identifier(self, identifier):
        """
        Normalize the identifier (email, phone, or username).
        """
        if not identifier:
            return None
        
        identifier = identifier.strip().lower()
        
        # Normalize phone number if it looks like one
        if re.match(r'^(\+?63|0)\d{9}$', identifier):
            # Remove all non-digit characters
            phone = re.sub(r'\D', '', identifier)
            
            # Ensure it starts with country code (63 for Philippines)
            if phone.startswith('0'):
                phone = '63' + phone[1:]
            elif not phone.startswith('63'):
                phone = '63' + phone
            
            return phone
        
        return identifier
    
    def _is_account_locked(self, user):
        """
        Check if user account is locked due to failed login attempts.
        """
        if not user.account_locked_until:
            return False
        
        # Check if lockout period has expired
        if timezone.now() > user.account_locked_until:
            # Reset lockout if expired
            user.account_locked_until = None
            user.failed_login_attempts = 0
            user.save(update_fields=['account_locked_until', 'failed_login_attempts'])
            return False
        
        return True
    
    def _increment_failed_attempts(self, user):
        """
        Increment failed login attempts and lock account if threshold reached.
        """
        user.failed_login_attempts += 1
        user.last_failed_login = timezone.now()
        
        # Lock account after 5 failed attempts for 15 minutes
        if user.failed_login_attempts >= 5:
            user.account_locked_until = timezone.now() + timedelta(minutes=15)
        
        user.save(update_fields=[
            'failed_login_attempts', 
            'last_failed_login', 
            'account_locked_until'
        ])
    
    def _reset_failed_attempts(self, user):
        """
        Reset failed login attempts on successful login.
        """
        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            user.last_failed_login = None
            user.account_locked_until = None
            user.save(update_fields=[
                'failed_login_attempts', 
                'last_failed_login', 
                'account_locked_until'
            ])


class PhoneAuthenticationBackend(BaseBackend):
    """
    Authentication backend specifically for phone number authentication.
    Useful for SMS-based login systems.
    """
    
    def authenticate(self, request, phone_number=None, verification_code=None, **kwargs):
        """
        Authenticate user using phone number and verification code.
        """
        if not phone_number or not verification_code:
            return None
        
        try:
            # Normalize phone number
            phone = self._normalize_phone(phone_number)
            user = User.objects.get(phone_number=phone)
            
            # Check if verification code is valid and not expired
            if (user.phone_verification_code == verification_code and
                user.phone_verification_expires and
                timezone.now() < user.phone_verification_expires):
                
                # Mark phone as verified
                user.is_phone_verified = True
                user.phone_verification_code = None
                user.phone_verification_expires = None
                user.save(update_fields=[
                    'is_phone_verified', 
                    'phone_verification_code', 
                    'phone_verification_expires'
                ])
                
                return user
            
            return None
            
        except User.DoesNotExist:
            return None
    
    def get_user(self, user_id):
        """
        Get user by ID.
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
    
    def _normalize_phone(self, phone_number):
        """
        Normalize phone number format.
        """
        # Remove all non-digit characters
        phone = re.sub(r'\D', '', phone_number)
        
        # Ensure it starts with country code (63 for Philippines)
        if phone.startswith('0'):
            phone = '63' + phone[1:]
        elif not phone.startswith('63'):
            phone = '63' + phone
        
        return phone
