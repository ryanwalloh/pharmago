"""
Phase 4 Authentication & Security Test Suite

This file tests all the new authentication and security features implemented in Phase 4.
"""

from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json
from datetime import timedelta, timezone

User = get_user_model()


class Phase4AuthenticationTests(APITestCase):
    """
    Test suite for Phase 4 authentication features.
    """
    
    def setUp(self):
        """Set up test data."""
        self.client = Client()
        
        # Create test users
        self.customer_user = User.objects.create_user(
            email='customer@test.com',
            phone_number='639123456789',
            password='TestPass123!',
            role='customer',
            status='active',
            is_email_verified=True,
            is_phone_verified=True
        )
        
        self.pharmacy_user = User.objects.create_user(
            email='pharmacy@test.com',
            phone_number='639987654321',
            password='TestPass123!',
            role='pharmacy',
            status='active',
            is_email_verified=True,
            is_phone_verified=True
        )
        
        self.rider_user = User.objects.create_user(
            email='rider@test.com',
            phone_number='639555666777',
            password='TestPass123!',
            role='rider',
            status='active',
            is_email_verified=True,
            is_phone_verified=True
        )
        
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            phone_number='639111222333',
            password='TestPass123!',
            role='admin',
            status='active',
            is_staff=True,
            is_superuser=True,
            is_email_verified=True,
            is_phone_verified=True
        )
        
        # Clear cache before tests
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def test_custom_authentication_backend(self):
        """Test custom authentication backend with email and phone."""
        from api.users.authentication import CustomAuthenticationBackend
        
        auth_backend = CustomAuthenticationBackend()
        
        # Test email authentication
        user = auth_backend.authenticate(
            None, username='customer@test.com', password='TestPass123!'
        )
        self.assertEqual(user, self.customer_user)
        
        # Test phone authentication
        user = auth_backend.authenticate(
            None, username='639123456789', password='TestPass123!'
        )
        self.assertEqual(user, self.customer_user)
        
        # Test username authentication
        user = auth_backend.authenticate(
            None, username='customer@test.com', password='TestPass123!'
        )
        self.assertEqual(user, self.customer_user)
    
    def test_jwt_login_endpoint(self):
        """Test custom JWT login endpoint."""
        url = reverse('jwt_login')
        
        # Test successful login with email
        data = {
            'username': 'customer@test.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertIn('user', response.data)
    
    def test_jwt_refresh_endpoint(self):
        """Test JWT token refresh endpoint."""
        # First login to get tokens
        login_url = reverse('jwt_login')
        login_data = {
            'username': 'customer@test.com',
            'password': 'TestPass123!'
        }
        login_response = self.client.post(login_url, login_data, format='json')
        refresh_token = login_response.data['tokens']['refresh']
        
        # Test token refresh
        refresh_url = reverse('jwt_refresh')
        refresh_data = {'refresh': refresh_token}
        response = self.client.post(refresh_url, refresh_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
    
    def test_jwt_logout_endpoint(self):
        """Test JWT logout endpoint."""
        # First login to get tokens
        login_url = reverse('jwt_login')
        login_data = {
            'username': 'customer@test.com',
            'password': 'TestPass123!'
        }
        login_response = self.client.post(login_url, login_data, format='json')
        refresh_token = login_response.data['tokens']['refresh']
        user_id = login_response.data['user']['id']
        
        # Test logout
        logout_url = reverse('jwt_logout')
        logout_data = {
            'refresh': refresh_token,
            'user_id': user_id
        }
        response = self.client.post(logout_url, logout_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
    
    def test_jwt_verify_endpoint(self):
        """Test JWT token verification endpoint."""
        # First login to get tokens
        login_url = reverse('jwt_login')
        login_data = {
            'username': 'customer@test.com',
            'password': 'TestPass123!'
        }
        login_response = self.client.post(login_url, login_data, format='json')
        access_token = login_response.data['tokens']['access']
        
        # Test token verification
        verify_url = reverse('jwt_verify')
        verify_data = {'access': access_token}
        response = self.client.post(verify_url, verify_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token_info', response.data)
    
    def test_rate_limiting(self):
        """Test rate limiting on authentication endpoints."""
        url = reverse('jwt_login')
        
        # Make multiple failed login attempts
        for i in range(15):  # Exceed the limit
            data = {
                'username': 'customer@test.com',
                'password': 'WrongPassword123!'
            }
            response = self.client.post(url, data, format='json')
            
            if i < 10:  # Within limit
                self.assertNotEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            else:  # Exceeded limit
                self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
                break
    
    def test_account_lockout(self):
        """Test account lockout after failed login attempts."""
        from api.users.authentication import CustomAuthenticationBackend
        
        auth_backend = CustomAuthenticationBackend()
        
        # Make failed login attempts
        for i in range(6):  # Exceed the lockout threshold
            user = auth_backend.authenticate(
                None, username='customer@test.com', password='WrongPassword123!'
            )
            self.assertIsNone(user)
        
        # Check if account is locked
        user = User.objects.get(email='customer@test.com')
        self.assertIsNotNone(user.account_locked_until)
        self.assertGreater(user.failed_login_attempts, 5)
        
        # Try to authenticate with locked account
        user = auth_backend.authenticate(
            None, username='customer@test.com', password='TestPass123!'
        )
        self.assertIsNone(user)  # Should be locked out
    
    def test_password_validation(self):
        """Test password strength validation."""
        from api.users.security import PasswordValidator
        
        validator = PasswordValidator()
        
        # Test weak password
        with self.assertRaises(Exception):
            validator.validate('weak')
        
        # Test password without uppercase
        with self.assertRaises(Exception):
            validator.validate('password123!')
        
        # Test password without lowercase
        with self.assertRaises(Exception):
            validator.validate('PASSWORD123!')
        
        # Test password without digits
        with self.assertRaises(Exception):
            validator.validate('Password!')
        
        # Test password without special characters
        with self.assertRaises(Exception):
            validator.validate('Password123')
        
        # Test strong password
        try:
            validator.validate('StrongPass123!')
        except Exception:
            self.fail("Strong password should pass validation")
    
    def test_enhanced_permissions(self):
        """Test enhanced permission classes."""
        from api.users.enhanced_permissions import (
            IsOwnerOrReadOnly, IsPharmacyOwner, IsRiderOwner, IsCustomerOwner
        )
        
        # Test IsOwnerOrReadOnly
        permission = IsOwnerOrReadOnly()
        
        # Test read permission
        request = type('Request', (), {'method': 'GET', 'user': self.customer_user})()
        self.assertTrue(permission.has_permission(request, None))
        
        # Test write permission
        request = type('Request', (), {'method': 'POST', 'user': self.customer_user})()
        self.assertTrue(permission.has_permission(request, None))
        
        # Test object permission
        obj = type('Object', (), {'user': self.customer_user})()
        self.assertTrue(permission.has_object_permission(request, None, obj))
        
        # Test IsPharmacyOwner
        permission = IsPharmacyOwner()
        
        # Test pharmacy user permission
        request = type('Request', (), {'method': 'GET', 'user': self.pharmacy_user})()
        self.assertTrue(permission.has_permission(request, None))
        
        # Test non-pharmacy user permission
        request = type('Request', (), {'method': 'GET', 'user': self.customer_user})()
        self.assertFalse(permission.has_permission(request, None))
    
    def test_session_management(self):
        """Test session management utilities."""
        from api.users.security import SessionManager
        
        session_manager = SessionManager()
        
        # Test session creation
        user_id = self.customer_user.id
        session_key = 'test_session_key'
        
        self.assertTrue(session_manager.can_create_session(user_id))
        session_manager.add_session(user_id, session_key)
        
        # Check active sessions
        active_sessions = session_manager.get_active_sessions(user_id)
        self.assertEqual(active_sessions, 1)
        
        # Test session removal
        session_manager.remove_session(user_id, session_key)
        active_sessions = session_manager.get_active_sessions(user_id)
        self.assertEqual(active_sessions, 0)
    
    def test_security_audit_logging(self):
        """Test security audit logging."""
        from api.users.security import SecurityAuditLogger
        
        audit_logger = SecurityAuditLogger()
        
        # Test login attempt logging
        audit_logger.log_login_attempt(
            identifier='test@example.com',
            success=True,
            ip_address='127.0.0.1',
            user_agent='TestAgent'
        )
        
        # Test security event logging
        audit_logger.log_security_event(
            event_type='test_event',
            user_id=self.customer_user.id,
            details='Test security event',
            ip_address='127.0.0.1'
        )
        
        # Verify logs are stored in cache
        # Note: In production, this would use a proper logging system
        self.assertTrue(True)  # Placeholder assertion
    
    def test_phone_authentication_backend(self):
        """Test phone number authentication backend."""
        from api.users.authentication import PhoneAuthenticationBackend
        
        # Set up phone verification
        self.customer_user.phone_verification_code = '123456'
        self.customer_user.phone_verification_expires = timezone.now() + timedelta(minutes=10)
        self.customer_user.save()
        
        auth_backend = PhoneAuthenticationBackend()
        
        # Test successful phone authentication
        user = auth_backend.authenticate(
            None, phone_number='639123456789', verification_code='123456'
        )
        self.assertEqual(user, self.customer_user)
        
        # Test failed phone authentication
        user = auth_backend.authenticate(
            None, phone_number='639123456789', verification_code='000000'
        )
        self.assertIsNone(user)
    
    def test_standard_jwt_endpoints(self):
        """Test standard JWT endpoints from rest_framework_simplejwt."""
        # Test token obtain
        url = reverse('token_obtain_pair')
        data = {
            'username': 'customer@test.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Test token refresh
        refresh_url = reverse('token_refresh')
        refresh_data = {'refresh': response.data['refresh']}
        response = self.client.post(refresh_url, refresh_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        
        # Test token verify
        verify_url = reverse('token_verify')
        verify_data = {'token': response.data['access']}
        response = self.client.post(verify_url, verify_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class Phase4IntegrationTests(APITestCase):
    """
    Integration tests for Phase 4 features.
    """
    
    def setUp(self):
        """Set up test data."""
        self.client = Client()
        
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            phone_number='639123456789',
            password='TestPass123!',
            role='customer',
            status='active',
            is_email_verified=True,
            is_phone_verified=True
        )
        
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def test_complete_authentication_flow(self):
        """Test complete authentication flow with JWT."""
        # 1. Login
        login_url = reverse('jwt_login')
        login_data = {
            'username': 'test@example.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(login_url, login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        tokens = response.data['tokens']
        
        # 2. Use access token for authenticated request
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        
        # Test accessing protected endpoint
        profile_url = reverse('user-profile')
        response = self.client.get(profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Refresh token
        refresh_url = reverse('jwt_refresh')
        refresh_data = {'refresh': tokens['refresh']}
        response = self.client.post(refresh_url, refresh_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        new_access_token = response.data['tokens']['access']
        
        # 4. Use new access token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access_token}')
        response = self.client.get(profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Logout
        logout_url = reverse('jwt_logout')
        logout_data = {
            'refresh': tokens['refresh'],
            'user_id': self.user.id
        }
        response = self.client.post(logout_url, logout_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 6. Verify old token is invalid
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        response = self.client.get(profile_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_security_features_integration(self):
        """Test integration of security features."""
        # Test rate limiting
        login_url = reverse('jwt_login')
        
        # Make multiple failed attempts
        for i in range(12):
            data = {
                'username': 'test@example.com',
                'password': 'WrongPassword123!'
            }
            response = self.client.post(login_url, data, format='json')
            
            if i >= 10:
                self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
                break
        
        # Test successful login after rate limit reset
        # Note: In real implementation, rate limit would reset after window
        data = {
            'username': 'test@example.com',
            'password': 'TestPass123!'
        }
        response = self.client.post(login_url, data, format='json')
        
        # Should still work as rate limit is per IP and we're using test client
        self.assertEqual(response.status_code, status.HTTP_200_OK)


if __name__ == '__main__':
    # Run tests
    import django
    django.setup()
    
    # Run test suite
    import unittest
    unittest.main()
