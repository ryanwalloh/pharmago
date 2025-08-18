from django.core.management.base import BaseCommand
from api.users.models import ValidID


class Command(BaseCommand):
    """
    Django management command to populate the database with all valid ID types.
    
    Usage:
        python manage.py populate_valid_ids
    """
    
    help = 'Populate the database with all valid ID types from Philippine government agencies'
    
    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(
            self.style.SUCCESS('Starting to populate valid ID types...')
        )
        
        # Primary Valid IDs
        primary_ids = [
            {
                'name': ValidID.IDType.PHILSYS_ID,
                'description': 'The national ID issued by the Philippine Statistics Authority.'
            },
            {
                'name': ValidID.IDType.PASSPORT,
                'description': 'Issued by the Department of Foreign Affairs (DFA).'
            },
            {
                'name': ValidID.IDType.DRIVERS_LICENSE,
                'description': 'Issued by the Land Transportation Office (LTO).'
            },
            {
                'name': ValidID.IDType.UMID,
                'description': 'Unified Multi-Purpose ID issued by SSS, GSIS, PhilHealth, and Pag-IBIG.'
            },
            {
                'name': ValidID.IDType.PRC_ID,
                'description': 'Professional Regulation Commission ID issued to licensed professionals.'
            },
            {
                'name': ValidID.IDType.POSTAL_ID,
                'description': 'Issued by the Philippine Postal Corporation.'
            },
            {
                'name': ValidID.IDType.VOTERS_ID,
                'description': 'Issued by the Commission on Elections (COMELEC).'
            },
            {
                'name': ValidID.IDType.SSS_ID,
                'description': 'Social Security System ID issued by SSS.'
            },
            {
                'name': ValidID.IDType.PHILHEALTH_ID,
                'description': 'Issued by the Philippine Health Insurance Corporation.'
            },
        ]
        
        # Secondary Valid IDs
        secondary_ids = [
            {
                'name': ValidID.IDType.GSIS_ID,
                'description': 'Government Service Insurance System ID issued by GSIS.'
            },
            {
                'name': ValidID.IDType.SENIOR_CITIZEN_ID,
                'description': 'Issued by the local government unit for senior citizens.'
            },
            {
                'name': ValidID.IDType.NBI_CLEARANCE,
                'description': 'Issued by the National Bureau of Investigation.'
            },
            {
                'name': ValidID.IDType.POLICE_CLEARANCE,
                'description': 'Issued by the local police station.'
            },
            {
                'name': ValidID.IDType.SCHOOL_ID,
                'description': 'Issued by schools and universities.'
            },
            {
                'name': ValidID.IDType.BARANGAY_ID,
                'description': 'Barangay ID/Certification issued by the local barangay.'
            },
            {
                'name': ValidID.IDType.TIN_ID,
                'description': 'Tax Identification Number ID issued by the Bureau of Internal Revenue.'
            },
            {
                'name': ValidID.IDType.PWD_ID,
                'description': 'Person with Disability ID issued by the local government unit.'
            },
            {
                'name': ValidID.IDType.OWWA_ID,
                'description': 'Overseas Workers Welfare Administration ID issued by OWWA.'
            },
            {
                'name': ValidID.IDType.SEAFARER_ID,
                'description': 'Seafarer\'s Book/ID issued by MARINA.'
            },
            {
                'name': ValidID.IDType.COMPANY_ID,
                'description': 'Company ID issued by private companies.'
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        # Create/Update Primary IDs
        for id_data in primary_ids:
            obj, created = ValidID.objects.get_or_create(
                name=id_data['name'],
                defaults={
                    'category': ValidID.IDCategory.PRIMARY,
                    'description': id_data['description']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {obj.get_name_display()}')
                )
            else:
                # Update description if it changed
                if obj.description != id_data['description']:
                    obj.description = id_data['description']
                    obj.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'↻ Updated: {obj.get_name_display()}')
                    )
        
        # Create/Update Secondary IDs
        for id_data in secondary_ids:
            obj, created = ValidID.objects.get_or_create(
                name=id_data['name'],
                defaults={
                    'category': ValidID.IDCategory.SECONDARY,
                    'description': id_data['description']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {obj.get_name_display()}')
                )
            else:
                # Update description if it changed
                if obj.description != id_data['description']:
                    obj.description = id_data['description']
                    obj.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'↻ Updated: {obj.get_name_display()}')
                    )
        
        # Summary
        total_ids = len(primary_ids) + len(secondary_ids)
        self.stdout.write('\n' + '='*50)
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Valid ID Types Population Complete!\n'
                f'📊 Summary:\n'
                f'   • Total ID Types: {total_ids}\n'
                f'   • Primary IDs: {len(primary_ids)}\n'
                f'   • Secondary IDs: {len(secondary_ids)}\n'
                f'   • Newly Created: {created_count}\n'
                f'   • Updated: {updated_count}'
            )
        )
        self.stdout.write('='*50)
        
        # List all IDs for verification
        self.stdout.write('\n📋 All Valid ID Types in Database:')
        for id_obj in ValidID.objects.all().order_by('category', 'name'):
            category_icon = '🟢' if id_obj.category == ValidID.IDCategory.PRIMARY else '🟡'
            self.stdout.write(f'   {category_icon} {id_obj.get_name_display()} ({id_obj.get_category_display()})')
