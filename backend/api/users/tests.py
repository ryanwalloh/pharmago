from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTest(TestCase):
    """Test cases for User model"""
    
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'customer'
        }
    
    def test_create_user(self):
        """Test creating a new user"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'customer')
        self.assertTrue(user.check_password('testpass123'))
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        admin_data = self.user_data.copy()
        admin_data['is_staff'] = True
        admin_data['is_superuser'] = True
        
        admin_user = User.objects.create_superuser(**admin_data)
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)


class UserAPITest(APITestCase):
    """Test cases for User API endpoints"""
    
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'customer'
        }
        
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        url = reverse('user-register')
        response = self.client.post(url, self.user_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')
    
    def test_user_login(self):
        """Test user login endpoint"""
        # Create user first
        user = User.objects.create_user(
            username='loginuser',
            email='login@example.com',
            password='loginpass123'
        )
        
        url = reverse('user-login')
        login_data = {
            'username': 'loginuser',
            'password': 'loginpass123'
        }
        
        response = self.client.post(url, login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['username'], 'loginuser')
    
    def test_user_profile_access(self):
        """Test user profile access"""
        user = User.objects.create_user(
            username='profileuser',
            email='profile@example.com',
            password='profilepass123'
        )
        
        self.client.force_authenticate(user=user)
        url = reverse('user-profile')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profileuser')
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        url = reverse('user-profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CustomerAPITest(APITestCase):
    """Test cases for Customer API endpoints"""
    
    def setUp(self):
        self.customer_user = User.objects.create_user(
            username='customeruser',
            email='customer@example.com',
            password='customerpass123',
            role='customer'
        )
    
    def test_customer_profile_access(self):
        """Test customer profile access"""
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('customer-my-profile')
        
        response = self.client.get(url)
        
        # Should return 404 if no customer profile exists yet
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PharmacyAPITest(APITestCase):
    """Test cases for Pharmacy API endpoints"""
    
    def setUp(self):
        self.pharmacy_user = User.objects.create_user(
            username='pharmacyuser',
            email='pharmacy@example.com',
            password='pharmacypass123',
            role='pharmacy'
        )
    
    def test_pharmacy_profile_access(self):
        """Test pharmacy profile access"""
        self.client.force_authenticate(user=self.pharmacy_user)
        url = reverse('pharmacy-my-pharmacy')
        
        response = self.client.get(url)
        
        # Should return 404 if no pharmacy profile exists yet
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
