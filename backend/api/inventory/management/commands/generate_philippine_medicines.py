from django.core.management.base import BaseCommand
from django.db import transaction
from api.inventory.models import MedicineCategory, MedicineCatalog


class Command(BaseCommand):
    help = 'Generate sample Philippine FDA medicines for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of sample medicines to generate'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        self.stdout.write(f"Generating {count} sample Philippine medicines...")
        
        # Create categories first
        categories = self.create_philippine_categories()
        
        # Generate medicines
        medicines_created = 0
        for i in range(count):
            try:
                with transaction.atomic():
                    medicine = self.create_sample_philippine_medicine(categories)
                    if medicine:
                        medicines_created += 1
                        
                if medicines_created % 20 == 0:
                    self.stdout.write(f"Created {medicines_created} medicines...")
                    
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"Error creating medicine {i}: {str(e)}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"Successfully created {medicines_created} sample Philippine medicines")
        )

    def create_philippine_categories(self):
        """Create Philippine-specific medicine categories"""
        categories_data = [
            ('Pain Relief', 'Pain management and relief medications'),
            ('Antibiotics', 'Antibacterial and antimicrobial medications'),
            ('Allergy & Cold', 'Allergy relief and cold medications'),
            ('Digestive Health', 'Digestive system medications'),
            ('Vitamins & Supplements', 'Vitamins and dietary supplements'),
            ('Heart & Blood Pressure', 'Cardiovascular medications'),
            ('Diabetes Management', 'Diabetes treatment medications'),
            ('Respiratory Health', 'Respiratory system medications'),
            ('Skin Care', 'Dermatological medications'),
            ('Eye Care', 'Ophthalmological medications'),
            ('Mental Health', 'Psychiatric medications'),
            ('Infectious Diseases', 'Antimalarial, antifungal, and antiviral medications'),
            ('Other', 'Other medications')
        ]
        
        categories = {}
        for name, description in categories_data:
            category, created = MedicineCategory.objects.get_or_create(
                name=name,
                defaults={'description': description}
            )
            categories[name] = category
            
        return categories

    def create_sample_philippine_medicine(self, categories):
        """Create a sample Philippine medicine"""
        import random
        
        # Philippine-specific medicine data
        medicines = [
            {
                'name': 'Paracetamol',
                'generic_name': 'Acetaminophen',
                'form': 'tablet',
                'dosage': '500mg',
                'category': 'Pain Relief',
                'prescription_required': False,
                'description': 'Pain reliever and fever reducer',
                'manufacturer': 'Unilab Philippines'
            },
            {
                'name': 'Mefenamic Acid',
                'generic_name': 'Mefenamic Acid',
                'form': 'capsule',
                'dosage': '250mg',
                'category': 'Pain Relief',
                'prescription_required': False,
                'description': 'Anti-inflammatory pain reliever',
                'manufacturer': 'Pascual Laboratories'
            },
            {
                'name': 'Amoxicillin',
                'generic_name': 'Amoxicillin',
                'form': 'capsule',
                'dosage': '250mg',
                'category': 'Antibiotics',
                'prescription_required': True,
                'description': 'Broad-spectrum antibiotic',
                'manufacturer': 'GlaxoSmithKline Philippines'
            },
            {
                'name': 'Cefalexin',
                'generic_name': 'Cefalexin',
                'form': 'capsule',
                'dosage': '250mg',
                'category': 'Antibiotics',
                'prescription_required': True,
                'description': 'Cephalosporin antibiotic',
                'manufacturer': 'Pfizer Philippines'
            },
            {
                'name': 'Loratadine',
                'generic_name': 'Loratadine',
                'form': 'tablet',
                'dosage': '10mg',
                'category': 'Allergy & Cold',
                'prescription_required': False,
                'description': 'Antihistamine for allergy relief',
                'manufacturer': 'Merck Philippines'
            },
            {
                'name': 'Omeprazole',
                'generic_name': 'Omeprazole',
                'form': 'capsule',
                'dosage': '20mg',
                'category': 'Digestive Health',
                'prescription_required': True,
                'description': 'Proton pump inhibitor for acid reflux',
                'manufacturer': 'AstraZeneca Philippines'
            },
            {
                'name': 'Ascorbic Acid',
                'generic_name': 'Vitamin C',
                'form': 'tablet',
                'dosage': '1000mg',
                'category': 'Vitamins & Supplements',
                'prescription_required': False,
                'description': 'Vitamin C supplement',
                'manufacturer': 'Pharex HealthCorp'
            },
            {
                'name': 'Metformin',
                'generic_name': 'Metformin',
                'form': 'tablet',
                'dosage': '500mg',
                'category': 'Diabetes Management',
                'prescription_required': True,
                'description': 'Type 2 diabetes medication',
                'manufacturer': 'Bristol Myers Squibb Philippines'
            },
            {
                'name': 'Salbutamol',
                'generic_name': 'Albuterol',
                'form': 'inhaler',
                'dosage': '100mcg',
                'category': 'Respiratory Health',
                'prescription_required': True,
                'description': 'Bronchodilator for asthma',
                'manufacturer': 'GlaxoSmithKline Philippines'
            },
            {
                'name': 'Hydrocortisone',
                'generic_name': 'Hydrocortisone',
                'form': 'cream',
                'dosage': '1%',
                'category': 'Skin Care',
                'prescription_required': False,
                'description': 'Topical corticosteroid cream',
                'manufacturer': 'Johnson & Johnson Philippines'
            },
            {
                'name': 'Chloroquine',
                'generic_name': 'Chloroquine',
                'form': 'tablet',
                'dosage': '250mg',
                'category': 'Infectious Diseases',
                'prescription_required': True,
                'description': 'Antimalarial medication',
                'manufacturer': 'Sanofi Philippines'
            },
            {
                'name': 'Artemether-Lumefantrine',
                'generic_name': 'Artemether-Lumefantrine',
                'form': 'tablet',
                'dosage': '20mg/120mg',
                'category': 'Infectious Diseases',
                'prescription_required': True,
                'description': 'Combination antimalarial therapy',
                'manufacturer': 'Novartis Philippines'
            }
        ]
        
        # Select random medicine
        medicine_data = random.choice(medicines)
        category = categories[medicine_data['category']]
        
        # Add some variation
        dosage_variations = ['250mg', '500mg', '750mg', '1000mg']
        if medicine_data['form'] in ['tablet', 'capsule']:
            medicine_data['dosage'] = random.choice(dosage_variations)
        
        # Create medicine
        medicine = MedicineCatalog.objects.create(
            category=category,
            name=medicine_data['name'],
            generic_name=medicine_data['generic_name'],
            form=medicine_data['form'],
            dosage=medicine_data['dosage'],
            description=medicine_data['description'],
            prescription_required=medicine_data['prescription_required'],
            fda_approval=True,
            fda_number=f"PFDA{random.randint(100000, 999999)}",
            is_active=True,
            active_ingredients=[medicine_data['generic_name']],
            therapeutic_class=medicine_data['category'],
            storage_conditions="Store at room temperature, away from direct sunlight",
            shelf_life="2 years from manufacturing date",
            manufacturer=medicine_data['manufacturer']
        )
        
        return medicine
