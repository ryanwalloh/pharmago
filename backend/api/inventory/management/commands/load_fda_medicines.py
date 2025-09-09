import csv
import json
import requests
from django.core.management.base import BaseCommand
from django.db import transaction
from api.inventory.models import MedicineCategory, MedicineCatalog
from api.pharmacies.models import Pharmacy


class Command(BaseCommand):
    help = 'Load FDA medicine dataset into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            default='philippine_fda',
            choices=['philippine_fda', 'philippine_formulary', 'generic_database', 'orange_book', 'fda_api', 'rxnorm'],
            help='Data source to use'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Path to CSV/JSON file if using file import'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=1000,
            help='Limit number of records to import (for testing)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without actually importing'
        )

    def handle(self, *args, **options):
        source = options['source']
        file_path = options.get('file')
        limit = options['limit']
        dry_run = options['dry_run']

        self.stdout.write(f"Starting FDA medicine import from {source}...")

        if source == 'philippine_fda':
            self.import_philippine_fda(file_path, limit, dry_run)
        elif source == 'philippine_formulary':
            self.import_philippine_formulary(file_path, limit, dry_run)
        elif source == 'generic_database':
            self.import_generic_database(file_path, limit, dry_run)
        elif source == 'orange_book':
            self.import_orange_book(file_path, limit, dry_run)
        elif source == 'fda_api':
            self.import_fda_api(limit, dry_run)
        elif source == 'rxnorm':
            self.import_rxnorm(file_path, limit, dry_run)

    def import_orange_book(self, file_path, limit, dry_run):
        """Import from FDA Orange Book CSV"""
        if not file_path:
            self.stdout.write(
                self.style.ERROR(
                    "Please provide --file path for Orange Book CSV"
                )
            )
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                count = 0
                
                for row in reader:
                    if count >= limit:
                        break
                    
                    if dry_run:
                        self.stdout.write(f"Would import: {row.get('Drug Name', 'Unknown')}")
                        count += 1
                        continue
                    
                    self.create_medicine_from_orange_book(row)
                    count += 1
                    
                    if count % 100 == 0:
                        self.stdout.write(f"Imported {count} medicines...")
                
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully imported {count} medicines")
                )
                
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f"File not found: {file_path}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error importing Orange Book: {str(e)}")
            )

    def import_fda_api(self, limit, dry_run):
        """Import from FDA API"""
        self.stdout.write("FDA API import not implemented yet")
        # TODO: Implement FDA API integration

    def import_philippine_fda(self, file_path, limit, dry_run):
        """Import from Philippine FDA approved products"""
        if not file_path:
            self.stdout.write(
                self.style.ERROR(
                    "Please provide --file path for Philippine FDA CSV"
                )
            )
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                count = 0
                
                for row in reader:
                    if count >= limit:
                        break
                    
                    if dry_run:
                        self.stdout.write(f"Would import: {row.get('Product Name', 'Unknown')}")
                        count += 1
                        continue
                    
                    self.create_medicine_from_philippine_fda(row)
                    count += 1
                    
                    if count % 100 == 0:
                        self.stdout.write(f"Imported {count} medicines...")
                
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully imported {count} medicines from Philippine FDA")
                )
                
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f"File not found: {file_path}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error importing Philippine FDA data: {str(e)}")
            )

    def import_philippine_formulary(self, file_path, limit, dry_run):
        """Import from Philippine National Formulary"""
        self.stdout.write("Philippine National Formulary import not implemented yet")
        # TODO: Implement Philippine National Formulary integration

    def import_generic_database(self, file_path, limit, dry_run):
        """Import from Philippine Generic Database"""
        self.stdout.write("Philippine Generic Database import not implemented yet")
        # TODO: Implement Philippine Generic Database integration

    def import_rxnorm(self, file_path, limit, dry_run):
        """Import from RxNorm"""
        self.stdout.write("RxNorm import not implemented yet")
        # TODO: Implement RxNorm integration

    def create_medicine_from_orange_book(self, row):
        """Create MedicineCatalog entry from Orange Book row"""
        try:
            with transaction.atomic():
                # Get or create category
                category_name = self.map_drug_class_to_category(
                    row.get('Drug Class', 'Other')
                )
                category, _ = MedicineCategory.objects.get_or_create(
                    name=category_name,
                    defaults={'description': f'Medicines in {category_name} category'}
                )
                
                # Extract medicine information
                drug_name = row.get('Drug Name', '').strip()
                if not drug_name:
                    return
                
                # Parse dosage and form
                dosage_form = row.get('Dosage Form', 'tablet')
                dosage_strength = row.get('Strength', '')
                
                # Create medicine
                medicine = MedicineCatalog.objects.create(
                    category=category,
                    name=drug_name,
                    generic_name=row.get('Generic Name', drug_name),
                    form=self.map_dosage_form(dosage_form),
                    dosage=dosage_strength,
                    description=f"FDA approved {drug_name}",
                    prescription_required=self.is_prescription_required(drug_name),
                    fda_approval=True,
                    fda_number=row.get('NDC', ''),
                    is_active=True
                )
                
                return medicine
                
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Error creating medicine {drug_name}: {str(e)}")
            )

    def map_drug_class_to_category(self, drug_class):
        """Map FDA drug class to our category system"""
        mapping = {
            'ANALGESICS': 'Pain Relief',
            'ANTIBIOTICS': 'Antibiotics',
            'ANTIHISTAMINES': 'Allergy & Cold',
            'ANTACIDS': 'Digestive Health',
            'VITAMINS': 'Vitamins & Supplements',
            'CARDIOVASCULAR': 'Heart & Blood Pressure',
            'DIABETES': 'Diabetes Management',
            'RESPIRATORY': 'Respiratory Health',
            'DERMATOLOGY': 'Skin Care',
            'OPHTHALMOLOGY': 'Eye Care',
            'NEUROLOGY': 'Neurological',
            'PSYCHIATRIC': 'Mental Health',
        }
        
        for fda_class, our_category in mapping.items():
            if fda_class in drug_class.upper():
                return our_category
        
        return 'Other'

    def map_dosage_form(self, form):
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

    def is_prescription_required(self, drug_name):
        """Determine if prescription is required based on drug name"""
        # Simple heuristic - in production, use more sophisticated logic
        prescription_keywords = [
            'CONTROLLED', 'SCHEDULE', 'NARCOTIC', 'OPIOID',
            'ANTIBIOTIC', 'INSULIN', 'WARFARIN', 'DIGOXIN'
        ]
        
        return any(keyword in drug_name.upper() for keyword in prescription_keywords)

    def create_medicine_from_philippine_fda(self, row):
        """Create MedicineCatalog entry from Philippine FDA row"""
        try:
            with transaction.atomic():
                # Get or create category
                category_name = self.map_philippine_category(
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
                    return
                
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
                    form=self.map_dosage_form(dosage_form),
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
                
                return medicine
                
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f"Error creating medicine {product_name}: {str(e)}")
            )

    def map_philippine_category(self, category):
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
            'ANTACID': 'Digestive Health',
            'LAXATIVE': 'Digestive Health',
            'ANTITUSSIVE': 'Respiratory Health',
            'EXPECTORANT': 'Respiratory Health',
            'BRONCHODILATOR': 'Respiratory Health',
            'ANTIHISTAMINE': 'Allergy & Cold',
            'DECONGESTANT': 'Allergy & Cold',
            'ANTIPYRETIC': 'Pain Relief',
            'ANTISPASMODIC': 'Pain Relief',
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
            'ANTIFUNGAL': 'Skin Care',
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
            'VITAMIN': 'Vitamins & Supplements',
            'MINERAL': 'Vitamins & Supplements',
            'SUPPLEMENT': 'Vitamins & Supplements',
            'NUTRITIONAL': 'Vitamins & Supplements',
        }
        
        for ph_category, our_category in mapping.items():
            if ph_category in category_upper:
                return our_category
        
        return 'Other'

    def is_prescription_required_philippine(self, drug_name):
        """Determine if prescription is required based on Philippine regulations"""
        # Philippine-specific prescription keywords
        prescription_keywords = [
            'CONTROLLED', 'SCHEDULE', 'NARCOTIC', 'OPIOID',
            'ANTIBIOTIC', 'INSULIN', 'WARFARIN', 'DIGOXIN',
            'MORPHINE', 'CODEINE', 'DIAZEPAM', 'LORAZEPAM',
            'PREDNISONE', 'METHOTREXATE', 'CYCLOSPORINE'
        ]
        
        return any(keyword in drug_name.upper() for keyword in prescription_keywords)
