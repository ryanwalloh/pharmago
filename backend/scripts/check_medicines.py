#!/usr/bin/env python3
"""
Check imported medicines
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.inventory.models import MedicineCatalog, MedicineCategory

def check_medicines():
    """Check imported medicines"""
    try:
        total_medicines = MedicineCatalog.objects.count()
        total_categories = MedicineCategory.objects.count()
        
        print(f"Total medicines: {total_medicines}")
        print(f"Total categories: {total_categories}")
        
        if total_medicines > 0:
            print("\nSample medicines:")
            for medicine in MedicineCatalog.objects.all()[:5]:
                print(f"- {medicine.name} ({medicine.generic_name}) - {medicine.category.name}")
        
        if total_categories > 0:
            print("\nCategories:")
            for category in MedicineCategory.objects.all():
                count = MedicineCatalog.objects.filter(category=category).count()
                print(f"- {category.name}: {count} medicines")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_medicines()
