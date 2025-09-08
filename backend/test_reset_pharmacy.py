#!/usr/bin/env python
"""
Test script to reset a pharmacy to pending status for testing
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/app')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.users.models import Pharmacy

def reset_pharmacy_to_pending(pharmacy_id):
    """Reset a pharmacy to pending status for testing"""
    try:
        pharmacy = Pharmacy.objects.get(id=pharmacy_id)
        
        print(f"Current status of pharmacy {pharmacy.pharmacy_name}:")
        print(f"  - ID: {pharmacy.id}")
        print(f"  - Status: {pharmacy.status}")
        print(f"  - Verified: {pharmacy.is_fully_verified}")
        print(f"  - Verified at: {pharmacy.verified_at}")
        print(f"  - Verified by: {pharmacy.verified_by}")
        
        # Reset to pending
        pharmacy.status = 'pending'
        pharmacy.is_fully_verified = False
        pharmacy.verified_at = None
        pharmacy.verified_by = None
        pharmacy.save()
        
        print(f"\n✅ Pharmacy {pharmacy.pharmacy_name} has been reset to pending status!")
        print(f"  - New Status: {pharmacy.status}")
        print(f"  - New Verified: {pharmacy.is_fully_verified}")
        
        return True
        
    except Pharmacy.DoesNotExist:
        print(f"❌ Pharmacy with ID {pharmacy_id} not found")
        return False
    except Exception as e:
        print(f"❌ Error resetting pharmacy: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test_reset_pharmacy.py <pharmacy_id>")
        print("Example: python test_reset_pharmacy.py 17")
        sys.exit(1)
    
    pharmacy_id = int(sys.argv[1])
    reset_pharmacy_to_pending(pharmacy_id)
