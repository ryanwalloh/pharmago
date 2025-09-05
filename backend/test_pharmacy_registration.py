#!/usr/bin/env python3
"""
Test script for pharmacy registration API endpoint
"""
import os
import sys
import django
import json
from datetime import date, datetime

# Add the project directory to Python path
sys.path.append('/app')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.users.models import User, Pharmacy, Customer
from api.users.serializers import PharmacyRegistrationSerializer
from django.test import RequestFactory
from django.contrib.auth import get_user_model

def test_pharmacy_registration():
    """Test the pharmacy registration serializer"""
    
    print("=== TESTING PHARMACY REGISTRATION ===")
    
    # Sample registration data (matching frontend structure)
    test_data = {
        # User account fields
        'username': 'test_pharmacy_owner',
        'email': 'test@pharmacy.com',
        'password': 'SecurePass123!',
        'password_confirm': 'SecurePass123!',
        'first_name': 'John',
        'last_name': 'Doe',
        'middle_name': 'Michael',
        'phone': '+639123456789',
        'date_of_birth': '1985-06-15',
        'gender': 'male',
        
        # Pharmacy business fields
        'pharmacy_name': 'Health Plus Pharmacy',
        'business_permit_number': 'BP-2024-001',
        'business_permit_expiry': '2025-12-31',
        'pharmacy_license_number': 'PL-2024-001',
        'pharmacy_license_expiry': '2025-12-31',
        
        # Contact information
        'business_phone': '+639123456789',
        'business_email': 'test@pharmacy.com',
        
        # Location information
        'street_address': '123 Main Street',
        'barangay': 'Poblacion',
        'city': 'Iligan City',
        'province': 'Lanao del Norte',
        'postal_code': '9200',
        'latitude': '8.2280',
        'longitude': '124.2452',
        
        # Business operations
        'operating_hours': {
            'monday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
            'tuesday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
            'wednesday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
            'thursday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
            'friday': {'is_open': True, 'open_time': '08:00', 'close_time': '20:00'},
            'saturday': {'is_open': True, 'open_time': '09:00', 'close_time': '18:00'},
            'sunday': {'is_open': False, 'open_time': '09:00', 'close_time': '18:00'}
        },
        'services_offered': ['delivery', 'consultation', 'prescription'],
        'payment_methods_accepted': ['cash', 'credit_card', 'gcash'],
        
        # Document upload status
        'owner_primary_id_uploaded': True,
        'business_permit_uploaded': True,
        'pharmacy_license_uploaded': True,
        'storefront_image_uploaded': True
    }
    
    print("Test data prepared:")
    print(f"- Username: {test_data['username']}")
    print(f"- Email: {test_data['email']}")
    print(f"- Pharmacy Name: {test_data['pharmacy_name']}")
    print(f"- Business Permit: {test_data['business_permit_number']}")
    print(f"- Location: {test_data['street_address']}, {test_data['city']}")
    print()
    
    # Test serializer validation
    serializer = PharmacyRegistrationSerializer(data=test_data)
    
    if serializer.is_valid():
        print("✅ Serializer validation passed!")
        print("Validated data keys:", list(serializer.validated_data.keys()))
        
        # Test creating the pharmacy (without actually saving to avoid duplicates)
        try:
            # Check if user already exists
            if User.objects.filter(username=test_data['username']).exists():
                print("⚠️  User already exists, skipping creation test")
                existing_user = User.objects.get(username=test_data['username'])
                if hasattr(existing_user, 'pharmacy_profile'):
                    pharmacy = existing_user.pharmacy_profile
                    print(f"✅ Found existing pharmacy: {pharmacy.pharmacy_name}")
                    print(f"   Status: {pharmacy.status}")
                    print(f"   Created: {pharmacy.created_at}")
                else:
                    print("❌ User exists but no pharmacy profile found")
            else:
                print("✅ User doesn't exist, ready for creation")
                
        except Exception as e:
            print(f"❌ Error during creation test: {str(e)}")
            
    else:
        print("❌ Serializer validation failed!")
        print("Errors:", serializer.errors)
    
    print("\n=== FIELD MAPPING VERIFICATION ===")
    
    # Verify all required fields are mapped
    required_fields = [
        'username', 'email', 'password', 'first_name', 'last_name', 'phone',
        'date_of_birth', 'gender', 'pharmacy_name', 'business_permit_number',
        'business_permit_expiry', 'pharmacy_license_number', 'pharmacy_license_expiry',
        'street_address', 'barangay', 'city', 'province', 'latitude', 'longitude',
        'operating_hours', 'services_offered', 'payment_methods_accepted'
    ]
    
    missing_fields = []
    for field in required_fields:
        if field not in test_data:
            missing_fields.append(field)
    
    if missing_fields:
        print(f"❌ Missing required fields: {missing_fields}")
    else:
        print("✅ All required fields are present")
    
    print("\n=== DATABASE STATUS CHECK ===")
    
    # Check current database state
    user_count = User.objects.filter(role=User.UserRole.PHARMACY).count()
    pharmacy_count = Pharmacy.objects.count()
    
    print(f"Current pharmacy users in database: {user_count}")
    print(f"Current pharmacy profiles in database: {pharmacy_count}")
    
    if user_count > 0:
        print("\nRecent pharmacy registrations:")
        recent_pharmacies = Pharmacy.objects.order_by('-created_at')[:3]
        for pharmacy in recent_pharmacies:
            print(f"- {pharmacy.pharmacy_name} (Status: {pharmacy.status}, Created: {pharmacy.created_at})")
    
    print("\n=== TEST COMPLETED ===")

if __name__ == '__main__':
    test_pharmacy_registration()
