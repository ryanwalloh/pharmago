"""
Django management command to import FDA medicines
Run with: python manage.py import_fda_medicines
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Import FDA medicines from CSV file to database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of medicines to import (for testing)'
        )

    def handle(self, *args, **options):
        # Import here to avoid circular imports
        import sys
        sys.path.insert(0, settings.BASE_DIR)
        
        from import_full_dataset import import_medicines_full
        
        csv_path = os.path.join(settings.BASE_DIR, 'drug_products.csv')
        
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f'CSV file not found: {csv_path}'))
            return
        
        self.stdout.write(self.style.SUCCESS('🚀 Starting FDA medicines import...'))
        self.stdout.write(f'📄 Using CSV file: {csv_path}')
        
        try:
            import_medicines_full(csv_path)
            self.stdout.write(self.style.SUCCESS('✅ Import completed successfully!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Import failed: {str(e)}'))
            raise

