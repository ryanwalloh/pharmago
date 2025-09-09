#!/usr/bin/env python3
"""
Verify the imported medicine data
"""
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.inventory.models import MedicineCatalog, MedicineCategory

print("Verifying imported medicine data...")

# Check counts
total_medicines = MedicineCatalog.objects.count()
total_categories = MedicineCategory.objects.count()

print(f"Total medicines: {total_medicines}")
print(f"Total categories: {total_categories}")

# Show sample medicines
print("\nSample medicines:")
for medicine in MedicineCatalog.objects.all()[:5]:
    print(f"- {medicine.name} ({medicine.generic_name}) - {medicine.form} {medicine.dosage} - {medicine.category.name}")

# Show categories
print("\nCategories created:")
for category in MedicineCategory.objects.all():
    count = MedicineCatalog.objects.filter(category=category).count()
    print(f"- {category.name}: {count} medicines")

print("\nVerification complete!")
