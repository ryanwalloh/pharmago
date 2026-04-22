#!/usr/bin/env python
"""
Create superuser directly on Railway database
Bypasses all Django settings and .env files
"""
import os
import sys
import django
from getpass import getpass

# Force the DATABASE_URL from environment
if 'DATABASE_URL' not in os.environ:
    print("❌ ERROR: DATABASE_URL not set!")
    print("Run: set DATABASE_URL=postgresql://...")
    sys.exit(1)

# Override settings before Django loads
os.environ['DJANGO_READ_DOT_ENV_FILE'] = 'False'
os.environ['DEBUG'] = 'False'

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')

# Patch settings to use DATABASE_URL
from django.conf import settings
import dj_database_url

# Override database settings
settings.DATABASES = {
    'default': dj_database_url.config(
        default=os.environ['DATABASE_URL'],
        conn_max_age=0,
    )
}

django.setup()

# Now import models
from api.users.models import User

def create_superuser():
    print("=" * 50)
    print("Create Superuser for Railway")
    print("=" * 50)
    print()
    
    email = input("Email address: ").strip()
    if not email:
        print("❌ Email is required!")
        return False
    
    # Check if user exists
    if User.objects.filter(email=email).exists():
        print(f"⚠️  User with email {email} already exists!")
        overwrite = input("Create anyway? (y/N): ").strip().lower()
        if overwrite != 'y':
            return False
        # Delete existing user
        User.objects.filter(email=email).delete()
        print("✅ Existing user deleted")
    
    password = getpass("Password: ")
    password2 = getpass("Password (again): ")
    
    if password != password2:
        print("❌ Passwords don't match!")
        return False
    
    if len(password) < 8:
        print("❌ Password too short! Must be at least 8 characters.")
        return False
    
    first_name = input("First name (default: Admin): ").strip() or "Admin"
    last_name = input("Last name (default: User): ").strip() or "User"
    username = input(f"Username (default: {email.split('@')[0]}): ").strip() or email.split('@')[0]
    
    try:
        user = User.objects.create_superuser(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin'
        )
        
        print()
        print("=" * 50)
        print("✅ Superuser created successfully!")
        print("=" * 50)
        print(f"Email: {user.email}")
        print(f"Username: {user.username}")
        print(f"Name: {user.get_full_name()}")
        print(f"Role: {user.role}")
        print(f"Superuser: {user.is_superuser}")
        print(f"Staff: {user.is_staff}")
        print()
        print("🎉 You can now login to the admin panel!")
        print(f"   URL: https://pharmago.up.railway.app/admin-login")
        print(f"   Username: {user.username}")
        print()
        return True
        
    except Exception as e:
        print(f"❌ Error creating superuser: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = create_superuser()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

