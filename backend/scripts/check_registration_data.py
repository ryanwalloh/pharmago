#!/usr/bin/env python3
"""
Script to check pharmacy registration data in the database
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/app')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.users.models import User, Pharmacy, Customer
from django.utils import timezone

def check_registration_data():
    """Check all pharmacy registration data"""
    
    print("=== PHARMACY REGISTRATION DATA CHECK ===")
    print(f"Checked at: {timezone.now()}")
    print()
    
    # Check Users
    pharmacy_users = User.objects.filter(role=User.UserRole.PHARMACY).order_by('-created_at')
    print(f"📊 Total Pharmacy Users: {pharmacy_users.count()}")
    
    if pharmacy_users.exists():
        print("\n👥 Recent Pharmacy Users:")
        for user in pharmacy_users[:5]:  # Show last 5
            print(f"  • ID: {user.id}")
            print(f"    Username: {user.username}")
            print(f"    Email: {user.email}")
            print(f"    Name: {user.first_name} {user.last_name}")
            print(f"    Phone: {user.phone}")
            print(f"    Created: {user.created_at}")
            print()
    
    # Check Pharmacies
    pharmacies = Pharmacy.objects.all().order_by('-created_at')
    print(f"🏥 Total Pharmacy Profiles: {pharmacies.count()}")
    
    if pharmacies.exists():
        print("\n🏪 Recent Pharmacy Profiles:")
        for pharmacy in pharmacies[:5]:  # Show last 5
            print(f"  • ID: {pharmacy.id}")
            print(f"    Name: {pharmacy.pharmacy_name}")
            print(f"    Business Permit: {pharmacy.business_permit_number}")
            print(f"    License: {pharmacy.pharmacy_license_number}")
            print(f"    Address: {pharmacy.street_address}, {pharmacy.city}")
            print(f"    Location: {pharmacy.latitude}, {pharmacy.longitude}")
            print(f"    Status: {pharmacy.status}")
            print(f"    Owner: {pharmacy.owner_first_name} {pharmacy.owner_last_name}")
            print(f"    Documents Uploaded:")
            print(f"      - Primary ID: {'✅' if pharmacy.owner_primary_id_uploaded else '❌'}")
            print(f"      - Business Permit: {'✅' if pharmacy.business_permit_uploaded else '❌'}")
            print(f"      - Pharmacy License: {'✅' if pharmacy.pharmacy_license_uploaded else '❌'}")
            print(f"      - Storefront Image: {'✅' if pharmacy.storefront_image_uploaded else '❌'}")
            print(f"    Created: {pharmacy.created_at}")
            print()
    
    # Check Customers
    customers = Customer.objects.all().order_by('-created_at')
    print(f"👤 Total Customer Profiles: {customers.count()}")
    
    # Check for orphaned records
    users_without_pharmacy = User.objects.filter(
        role=User.UserRole.PHARMACY
    ).exclude(
        pharmacy_profile__isnull=False
    )
    
    if users_without_pharmacy.exists():
        print(f"\n⚠️  Users without pharmacy profiles: {users_without_pharmacy.count()}")
        for user in users_without_pharmacy:
            print(f"  • {user.username} ({user.email})")
    
    # Summary
    print("\n📈 SUMMARY:")
    print(f"  • Pharmacy Users: {pharmacy_users.count()}")
    print(f"  • Pharmacy Profiles: {pharmacies.count()}")
    print(f"  • Customer Profiles: {customers.count()}")
    print(f"  • Orphaned Users: {users_without_pharmacy.count()}")
    
    if pharmacy_users.count() > 0 and pharmacies.count() > 0:
        print("\n✅ Registration system is working correctly!")
    else:
        print("\n❌ No registration data found. Try submitting a registration.")
    
    print("\n=== CHECK COMPLETED ===")

if __name__ == '__main__':
    check_registration_data()
