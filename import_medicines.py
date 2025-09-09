#!/usr/bin/env python3
"""
Simple script to import Philippine FDA medicines
"""
import os
import sys
import django
import csv

# Add the backend directory to Python path
sys.path.append('backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmago.settings')
django.setup()

from api.inventory.models import MedicineCategory, MedicineCatalog
from django.db import transaction

def map_philippine_category(category):
    """Map Philippine FDA pharmacologic category to our category system"""
    if not category:
        return 'Other'
        
    category_upper = category.upper()
    
    mapping = {
        'ANALGESIC': 'Pain Relief',
        'ANTIBIOTIC': 'Antibiotics',
        'ANTIHISTAMINE': 'Allergy & Cold',
        'ANTACID': 'Digestive Health',
        'VITAMIN': 'Vitamins & Supplements',
        'CARDIOVASCULAR': 'Heart & Blood Pressure',
        'DIABETES': 'Diabetes Management',
        'RESPIRATORY': 'Respiratory Health',
        'DERMATOLOGIC': 'Skin Care',
        'OPHTHALMOLOGIC': 'Eye Care',
        'NEUROLOGIC': 'Neurological',
        'PSYCHIATRIC': 'Mental Health',
        'ANTIMALARIAL': 'Infectious Diseases',
        'ANTIFUNGAL': 'Infectious Diseases',
        'ANTIVIRAL': 'Infectious Diseases',
        'ANTICOAGULANT': 'Heart & Blood Pressure',
        'ANTIHYPERTENSIVE': 'Heart & Blood Pressure',
        'ANTIDIABETIC': 'Diabetes Management',
        'ANTIINFLAMMATORY': 'Pain Relief',
        'ANTISPASMODIC': 'Digestive Health',
        'ANTIEMETIC': 'Digestive Health',
        'LAXATIVE': 'Digestive Health',
        'ANTITUSSIVE': 'Respiratory Health',
        'EXPECTORANT': 'Respiratory Health',
        'BRONCHODILATOR': 'Respiratory Health',
        'DECONGESTANT': 'Allergy & Cold',
        'ANTIPYRETIC': 'Pain Relief',
        'MUSCLE RELAXANT': 'Pain Relief',
        'SEDATIVE': 'Mental Health',
        'ANTIDEPRESSANT': 'Mental Health',
        'ANTIPSYCHOTIC': 'Mental Health',
        'ANTICONVULSANT': 'Neurological',
        'ANTIPARKINSON': 'Neurological',
        'ANTIMIGRAINE': 'Neurological',
        'ANTIEPILEPTIC': 'Neurological',
        'ANTIALLERGIC': 'Allergy & Cold',
        'ANTIPRURITIC': 'Skin Care',
        'ANTISEPTIC': 'Skin Care',
        'ANTIBACTERIAL': 'Skin Care',
        'CORTICOSTEROID': 'Skin Care',
        'EMOLLIENT': 'Skin Care',
        'KERATOLYTIC': 'Skin Care',
        'ANTIMICROBIAL': 'Infectious Diseases',
        'ANTIPROTOZOAL': 'Infectious Diseases',
        'ANTHELMINTIC': 'Infectious Diseases',
        'IMMUNOSUPPRESSANT': 'Other',
        'IMMUNOMODULATOR': 'Other',
        'HORMONE': 'Other',
        'MINERAL': 'Vitamins & Supplements',
        'SUPPLEMENT': 'Vitamins & Supplements',
        'NUTRITIONAL': 'Vitamins & Supplements',
    }
    
    for ph_category, our_category in mapping.items():
        if ph_category in category_upper:
            return our_category
    
    return 'Other'

def map_dosage_form(form):
    """Map FDA dosage form to our form choices"""
    form_mapping = {
        'TABLET': 'tablet',
        'CAPSULE': 'capsule',
        'SYRUP': 'syrup',
        'INJECTION': 'injection',
        'CREAM': 'cream',
        'OINTMENT': 'ointment',
        'DROPS': 'drops',
        'INHALER': 'inhaler',
        'GEL': 'gel',
        'PATCH': 'patch',
        'SUSPENSION': 'suspension',
        'SOLUTION': 'solution',
    }
    
    return form_mapping.get(form.upper(), 'tablet')

def import_medicines(csv_file, limit=100):
    """Import medicines from CSV file"""
    print(f"Starting import from {csv_file}...")
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            count = 0
            
            for row in reader:
                if count >= limit:
                    break
                
                try:
                    with transaction.atomic():
                        # Get or create category
                        category_name = map_philippine_category(
                            row.get('Pharmacologic Category', 'Other')
                        )
                        category, _ = MedicineCategory.objects.get_or_create(
                            name=category_name,
                            defaults={'description': f'Medicines in {category_name} category'}
                        )
                        
                        # Extract medicine information
                        brand_name = row.get('Brand Name', '').strip()
                        generic_name = row.get('Generic Name', '').strip()
                        
                        if not brand_name and not generic_name:
                            continue
                        
                        # Use brand name as primary name, fallback to generic
                        product_name = brand_name if brand_name else generic_name
                        
                        # Parse dosage and form
                        dosage_form = row.get('Dosage Form', 'tablet')
                        dosage_strength = row.get('Dosage Strength', '')
                        
                        # Determine if prescription required
                        classification = row.get('Classification', '')
                        prescription_required = 'Prescription Drug' in classification or 'RX' in classification
                        
                        # Create medicine
                        medicine = MedicineCatalog.objects.create(
                            category=category,
                            name=product_name,
                            generic_name=generic_name,
                            form=map_dosage_form(dosage_form),
                            dosage=dosage_strength,
                            description=f"PFDA approved {product_name} - {row.get('Manufacturer', '')}",
                            prescription_required=prescription_required,
                            fda_approval=True,
                            fda_number=row.get('Registration Number', ''),
                            is_active=True,
                            manufacturer=row.get('Manufacturer', ''),
                            storage_conditions="Store according to manufacturer's instructions",
                            shelf_life="Check manufacturer's label",
                            therapeutic_class=row.get('Pharmacologic Category', ''),
                            country_of_origin=row.get('Country of Origin', '')
                        )
                        
                        count += 1
                        
                        if count % 50 == 0:
                            print(f"Imported {count} medicines...")
                        
                except Exception as e:
                    print(f"Error creating medicine {product_name}: {str(e)}")
                    continue
            
            print(f"Successfully imported {count} medicines!")
            
    except FileNotFoundError:
        print(f"File not found: {csv_file}")
    except Exception as e:
        print(f"Error importing medicines: {str(e)}")

if __name__ == "__main__":
    import_medicines('data/drug_products.csv', limit=100)
