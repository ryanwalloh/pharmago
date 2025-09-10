from django.core.management.base import BaseCommand
from django.db import transaction
from api.inventory.models import MedicineCategory, MedicineCatalog


class Command(BaseCommand):
    help = 'Generate sample FDA medicines for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of sample medicines to generate'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        self.stdout.write(f"Generating {count} sample medicines...")
        
        # Create categories first
        categories = self.create_categories()
        
        # Generate medicines
        medicines_created = 0
        for i in range(count):
            try:
                with transaction.atomic():
                    medicine = self.create_sample_medicine(categories)
                    if medicine:
                        medicines_created += 1
                        
                if medicines_created % 20 == 0:
                    self.stdout.write(f"Created {medicines_created} medicines...")
                    
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"Error creating medicine {i}: {str(e)}")
                )
        
        self.stdout.write(
            self.style.SUCCESS(f"Successfully created {medicines_created} sample medicines")
        )

    def create_categories(self):
        """Create medicine categories"""
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

    def create_sample_medicine(self, categories):
        """Create a sample medicine"""
        import random
        
        # Sample medicine data
        medicines = [
            {
                'name': 'Paracetamol',
                'generic_name': 'Acetaminophen',
                'form': 'tablet',
                'dosage': '500mg',
                'category': 'Pain Relief',
                'prescription_required': False,
                'description': 'Pain reliever and fever reducer'
            },
            {
                'name': 'Ibuprofen',
                'generic_name': 'Ibuprofen',
                'form': 'tablet',
                'dosage': '400mg',
                'category': 'Pain Relief',
                'prescription_required': False,
                'description': 'Anti-inflammatory pain reliever'
            },
            {
                'name': 'Amoxicillin',
                'generic_name': 'Amoxicillin',
                'form': 'capsule',
                'dosage': '250mg',
                'category': 'Antibiotics',
                'prescription_required': True,
                'description': 'Broad-spectrum antibiotic'
            },
            {
                'name': 'Loratadine',
                'generic_name': 'Loratadine',
                'form': 'tablet',
                'dosage': '10mg',
                'category': 'Allergy & Cold',
                'prescription_required': False,
                'description': 'Antihistamine for allergy relief'
            },
            {
                'name': 'Omeprazole',
                'generic_name': 'Omeprazole',
                'form': 'capsule',
                'dosage': '20mg',
                'category': 'Digestive Health',
                'prescription_required': True,
                'description': 'Proton pump inhibitor for acid reflux'
            },
            {
                'name': 'Vitamin C',
                'generic_name': 'Ascorbic Acid',
                'form': 'tablet',
                'dosage': '1000mg',
                'category': 'Vitamins & Supplements',
                'prescription_required': False,
                'description': 'Vitamin C supplement'
            },
            {
                'name': 'Metformin',
                'generic_name': 'Metformin',
                'form': 'tablet',
                'dosage': '500mg',
                'category': 'Diabetes Management',
                'prescription_required': True,
                'description': 'Type 2 diabetes medication'
            },
            {
                'name': 'Salbutamol',
                'generic_name': 'Albuterol',
                'form': 'inhaler',
                'dosage': '100mcg',
                'category': 'Respiratory Health',
                'prescription_required': True,
                'description': 'Bronchodilator for asthma'
            },
            {
                'name': 'Hydrocortisone',
                'generic_name': 'Hydrocortisone',
                'form': 'cream',
                'dosage': '1%',
                'category': 'Skin Care',
                'prescription_required': False,
                'description': 'Topical corticosteroid cream'
            },
            {
                'name': 'Artificial Tears',
                'generic_name': 'Carboxymethylcellulose',
                'form': 'drops',
                'dosage': '0.5%',
                'category': 'Eye Care',
                'prescription_required': False,
                'description': 'Lubricating eye drops'
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
            fda_number=f"FDA{random.randint(100000, 999999)}",
            is_active=True,
            active_ingredients=[medicine_data['generic_name']],
            therapeutic_class=medicine_data['category'],
            storage_conditions="Store at room temperature",
            shelf_life="2 years"
        )
        
        return medicine
