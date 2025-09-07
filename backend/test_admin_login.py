#!/usr/bin/env python
"""
Simple test script to verify admin login credentials
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from django.conf import settings

def test_admin_credentials():
    """Test if admin credentials are properly loaded"""
    print("=== Admin Credentials Test ===")
    
    # Check environment variables directly
    env_username = os.getenv('PHARMAGO_ADMIN_USERNAME')
    env_password = os.getenv('PHARMAGO_ADMIN_PASSWORD')
    
    print(f"Environment PHARMAGO_ADMIN_USERNAME: {env_username}")
    print(f"Environment PHARMAGO_ADMIN_PASSWORD: {env_password}")
    
    # Check Django settings
    settings_username = getattr(settings, 'PHARMAGO_ADMIN_USERNAME', None)
    settings_password = getattr(settings, 'PHARMAGO_ADMIN_PASSWORD', None)
    
    print(f"Settings PHARMAGO_ADMIN_USERNAME: {settings_username}")
    print(f"Settings PHARMAGO_ADMIN_PASSWORD: {settings_password}")
    
    # Test credentials
    test_username = "devadmin"
    test_password = "dev123"
    
    print(f"\n=== Testing Login ===")
    print(f"Testing with username: {test_username}")
    print(f"Testing with password: {test_password}")
    
    username_match = test_username == settings_username
    password_match = test_password == settings_password
    
    print(f"Username match: {username_match}")
    print(f"Password match: {password_match}")
    print(f"Login should work: {username_match and password_match}")
    
    if username_match and password_match:
        print("✅ Admin credentials are properly configured!")
    else:
        print("❌ Admin credentials are not matching!")
        print(f"Expected: username='{test_username}', password='{test_password}'")
        print(f"Got: username='{settings_username}', password='{settings_password}'")

if __name__ == "__main__":
    test_admin_credentials()
