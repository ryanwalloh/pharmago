#!/usr/bin/env python3
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.inventory.models import MedicineCatalog, MedicineCategory

print("Testing medicine import...")

# Check if file exists
csv_path = 'drug_products.csv'
if os.path.exists(csv_path):
    print("CSV file found!")
    
    # Check current count
    current_count = MedicineCatalog.objects.count()
    print(f"Current medicine count: {current_count}")
    
    # Try to create one medicine
    try:
        category, created = MedicineCategory.objects.get_or_create(
            name='Test Category',
            defaults={'description': 'Test category for import'}
        )
        
        medicine = MedicineCatalog.objects.create(
            category=category,
            name='Test Medicine',
            generic_name='Test Generic',
            form='tablet',
            dosage='500mg',
            description='Test medicine for import',
            prescription_required=False,
            fda_approval=True,
            fda_number='TEST001',
            is_active=True
        )
        
        print(f"Successfully created test medicine: {medicine.name}")
        print(f"New medicine count: {MedicineCatalog.objects.count()}")
        
    except Exception as e:
        print(f"Error creating medicine: {e}")
        
else:
    print("CSV file not found!")
    print(f"Looking for: {csv_path}")
    print("Files in current directory:")
    for f in os.listdir('.'):
        print(f"  {f}")
    print("Files in parent directory:")
    for f in os.listdir('..'):
        print(f"  {f}")
