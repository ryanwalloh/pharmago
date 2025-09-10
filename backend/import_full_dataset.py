#!/usr/bin/env python3
"""
Import full Philippine FDA medicine dataset with progress feedback
"""
import os
import sys
import django
import csv
import time
from datetime import datetime

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
        'INSULIN': 'Diabetes Management',
        'ANTITHROMBOTIC': 'Heart & Blood Pressure',
        'ENZYME': 'Other',
    }
    
    for ph_category, our_category in mapping.items():
        if ph_category in category_upper:
            return our_category
    
    return 'Other'

def map_dosage_form(form):
    """Map FDA dosage form to our form choices"""
    if not form:
        return 'tablet'
        
    form_upper = form.upper()
    
    # More comprehensive mapping for Philippine FDA data
    if 'TABLET' in form_upper:
        return 'tablet'
    elif 'CAPSULE' in form_upper:
        return 'capsule'
    elif 'SYRUP' in form_upper:
        return 'syrup'
    elif 'INJECTION' in form_upper or 'IV' in form_upper or 'SC' in form_upper or 'IM' in form_upper:
        return 'injection'
    elif 'CREAM' in form_upper:
        return 'cream'
    elif 'OINTMENT' in form_upper:
        return 'ointment'
    elif 'DROPS' in form_upper:
        return 'drops'
    elif 'INHALER' in form_upper:
        return 'inhaler'
    elif 'GEL' in form_upper:
        return 'gel'
    elif 'PATCH' in form_upper:
        return 'patch'
    elif 'SUSPENSION' in form_upper:
        return 'suspension'
    elif 'SOLUTION' in form_upper:
        return 'solution'
    else:
        return 'tablet'  # Default fallback

def import_medicines_full(csv_file):
    """Import all medicines from CSV file with progress feedback"""
    print(f"Starting full import from {csv_file}...")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get initial counts
    initial_medicine_count = MedicineCatalog.objects.count()
    initial_category_count = MedicineCategory.objects.count()
    
    print(f"Initial medicine count: {initial_medicine_count}")
    print(f"Initial category count: {initial_category_count}")
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            total_rows = sum(1 for row in reader)
            file.seek(0)
            reader = csv.DictReader(file)
            
            print(f"Total rows to process: {total_rows}")
            
            imported_count = 0
            skipped_count = 0
            error_count = 0
            start_time = time.time()
            
            # Process in batches for better performance
            batch_size = 100
            batch_count = 0
            
            for row_num, row in enumerate(reader, 1):
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
                            skipped_count += 1
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
                            storage_conditions="Store according to manufacturer's instructions",
                            shelf_life="Check manufacturer's label",
                            therapeutic_class=row.get('Pharmacologic Category', '')
                        )
                        
                        imported_count += 1
                        batch_count += 1
                        
                        # Progress feedback
                        if batch_count >= batch_size or row_num % 1000 == 0:
                            elapsed_time = time.time() - start_time
                            rate = row_num / elapsed_time if elapsed_time > 0 else 0
                            eta = (total_rows - row_num) / rate if rate > 0 else 0
                            
                            print(f"Progress: {row_num}/{total_rows} ({row_num/total_rows*100:.1f}%) - "
                                  f"Imported: {imported_count}, Skipped: {skipped_count}, Errors: {error_count} - "
                                  f"Rate: {rate:.1f} rows/sec - ETA: {eta/60:.1f} min")
                            
                            batch_count = 0
                        
                except Exception as e:
                    error_count += 1
                    if error_count <= 10:  # Only show first 10 errors
                        print(f"Error processing row {row_num}: {str(e)}")
                    continue
            
            # Final statistics
            final_medicine_count = MedicineCatalog.objects.count()
            final_category_count = MedicineCategory.objects.count()
            total_time = time.time() - start_time
            
            print(f"\nImport completed!")
            print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Total time: {total_time/60:.1f} minutes")
            print(f"Final medicine count: {final_medicine_count} (+{final_medicine_count - initial_medicine_count})")
            print(f"Final category count: {final_category_count} (+{final_category_count - initial_category_count})")
            print(f"Successfully imported: {imported_count}")
            print(f"Skipped (no name): {skipped_count}")
            print(f"Errors: {error_count}")
            print(f"Average rate: {imported_count/total_time:.1f} medicines/second")
            
    except FileNotFoundError:
        print(f"File not found: {csv_file}")
    except Exception as e:
        print(f"Error importing medicines: {str(e)}")

if __name__ == "__main__":
    import_medicines_full('drug_products.csv')
