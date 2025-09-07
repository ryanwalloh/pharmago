#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.users.models import User

def check_admin_users():
    print("Checking for admin users...")
    
    # Check all users
    all_users = User.objects.all()
    print(f"Total users in database: {all_users.count()}")
    
    for user in all_users:
        print(f"- {user.username} ({user.email}) - is_staff: {user.is_staff}, role: {user.role}, is_active: {user.is_active}")
    
    # Check specifically for admin users
    admin_users = User.objects.filter(is_staff=True, role='admin')
    print(f"\nAdmin users found: {admin_users.count()}")
    
    for admin in admin_users:
        print(f"- {admin.username} ({admin.email}) - is_staff: {admin.is_staff}, role: {admin.role}, is_active: {admin.is_active}")
    
    # If no admin users, create one
    if admin_users.count() == 0:
        print("\nNo admin users found. Creating one...")
        try:
            admin_user = User.objects.create_user(
                username='devadmin',
                email='admin@pharmago.com',
                password='dev123',
                is_staff=True,
                is_superuser=True,
                is_active=True,
                role=User.UserRole.ADMIN,
                status=User.UserStatus.ACTIVE,
                is_email_verified=True,
                is_phone_verified=True
            )
            print(f"Created admin user: {admin_user.username}")
        except Exception as e:
            print(f"Error creating admin user: {e}")
    else:
        print("\nAdmin users already exist.")

if __name__ == "__main__":
    check_admin_users()
