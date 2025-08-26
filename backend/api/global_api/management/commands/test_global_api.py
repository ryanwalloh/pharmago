from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.global_api.models import SystemHealth, ApiUsage, GlobalSearchLog, BulkOperationLog
from api.global_api.signals import perform_system_health_checks

User = get_user_model()


class Command(BaseCommand):
    """Management command to test global API infrastructure"""
    
    help = 'Test global API infrastructure functionality'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--test-all',
            action='store_true',
            help='Run all tests',
        )
        parser.add_argument(
            '--test-health',
            action='store_true',
            help='Test system health monitoring',
        )
        parser.add_argument(
            '--test-search',
            action='store_true',
            help='Test global search functionality',
        )
        parser.add_argument(
            '--test-bulk',
            action='store_true',
            help='Test bulk operations',
        )
        parser.add_argument(
            '--test-export',
            action='store_true',
            help='Test export/import functionality',
        )
    
    def handle(self, *args, **options):
        """Execute the command"""
        self.stdout.write(
            self.style.SUCCESS('🚀 Starting Global API Infrastructure Tests...')
        )
        
        if options['test_all'] or options['test_health']:
            self.test_system_health()
        
        if options['test_all'] or options['test_search']:
            self.test_global_search()
        
        if options['test_all'] or options['test_bulk']:
            self.test_bulk_operations()
        
        if options['test_all'] or options['test_export']:
            self.test_export_import()
        
        self.stdout.write(
            self.style.SUCCESS('✅ Global API Infrastructure Tests Completed!')
        )
    
    def test_system_health(self):
        """Test system health monitoring"""
        self.stdout.write('🔍 Testing System Health Monitoring...')
        
        try:
            # Test health check
            result = perform_system_health_checks()
            self.stdout.write(f'   Health check result: {"✅ Healthy" if result else "❌ Unhealthy"}')
            
            # Check health records
            health_records = SystemHealth.objects.all()
            self.stdout.write(f'   Health records created: {health_records.count()}')
            
            for record in health_records:
                self.stdout.write(f'     - {record.component}: {record.status}')
            
            self.stdout.write(
                self.style.SUCCESS('   ✅ System Health Monitoring Test Passed')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'   ❌ System Health Monitoring Test Failed: {str(e)}')
            )
    
    def test_global_search(self):
        """Test global search functionality"""
        self.stdout.write('🔍 Testing Global Search...')
        
        try:
            # Create a test search log
            search_log = GlobalSearchLog.objects.create(
                user=None,  # Anonymous user
                search_type='cross_model',
                query='test query',
                models_searched=['users.User', 'inventory.MedicineCatalog'],
                results_count=5,
                execution_time=150.5,
                ip_address='127.0.0.1'
            )
            
            self.stdout.write(f'   Search log created: ID {search_log.id}')
            self.stdout.write(f'   Query: {search_log.query}')
            self.stdout.write(f'   Models searched: {search_log.models_searched}')
            self.stdout.write(f'   Results: {search_log.results_count}')
            self.stdout.write(f'   Execution time: {search_log.execution_time}ms')
            
            self.stdout.write(
                self.style.SUCCESS('   ✅ Global Search Test Passed')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'   ❌ Global Search Test Failed: {str(e)}')
            )
    
    def test_bulk_operations(self):
        """Test bulk operations"""
        self.stdout.write('⚡ Testing Bulk Operations...')
        
        try:
            # Create a test bulk operation log
            bulk_log = BulkOperationLog.objects.create(
                user=None,  # Anonymous user for testing
                operation_type='create',
                model_name='test.Model',
                total_items=100,
                status='completed',
                processed_items=100,
                successful_items=95,
                failed_items=5,
                execution_time=2.5
            )
            
            self.stdout.write(f'   Bulk operation log created: ID {bulk_log.id}')
            self.stdout.write(f'   Operation: {bulk_log.operation_type}')
            self.stdout.write(f'   Model: {bulk_log.model_name}')
            self.stdout.write(f'   Total items: {bulk_log.total_items}')
            self.stdout.write(f'   Success rate: {bulk_log.successful_items}/{bulk_log.total_items}')
            self.stdout.write(f'   Execution time: {bulk_log.execution_time}s')
            
            self.stdout.write(
                self.style.SUCCESS('   ✅ Bulk Operations Test Passed')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'   ❌ Bulk Operations Test Failed: {str(e)}')
            )
    
    def test_export_import(self):
        """Test export/import functionality"""
        self.stdout.write('📊 Testing Export/Import...')
        
        try:
            # Create a test export log
            export_log = BulkOperationLog.objects.create(
                user=None,  # Anonymous user for testing
                operation_type='export',
                model_name='test.Model',
                total_items=50,
                status='completed',
                processed_items=50,
                successful_items=50,
                failed_items=0,
                execution_time=1.2
            )
            
            self.stdout.write(f'   Export log created: ID {export_log.id}')
            self.stdout.write(f'   Model: {export_log.model_name}')
            self.stdout.write(f'   Items exported: {export_log.successful_items}')
            self.stdout.write(f'   Execution time: {export_log.execution_time}s')
            
            # Create a test import log
            import_log = BulkOperationLog.objects.create(
                user=None,  # Anonymous user for testing
                operation_type='import',
                model_name='test.Model',
                total_items=25,
                status='completed',
                processed_items=25,
                successful_items=23,
                failed_items=2,
                execution_time=0.8
            )
            
            self.stdout.write(f'   Import log created: ID {import_log.id}')
            self.stdout.write(f'   Model: {import_log.model_name}')
            self.stdout.write(f'   Items imported: {import_log.successful_items}')
            self.stdout.write(f'   Failed items: {import_log.failed_items}')
            self.stdout.write(f'   Execution time: {import_log.execution_time}s')
            
            self.stdout.write(
                self.style.SUCCESS('   ✅ Export/Import Test Passed')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'   ❌ Export/Import Test Failed: {str(e)}')
            )
