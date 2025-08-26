from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.core.cache import cache
from django.db import connection
import time

from .models import SystemHealth, ApiUsage


# ============================================================================
# API USAGE TRACKING SIGNALS
# ============================================================================

@receiver(post_save, sender=ApiUsage)
def update_api_usage_cache(sender, instance, created, **kwargs):
    """Update cache with latest API usage statistics"""
    if created:
        # Update cache with new API usage data
        cache_key = f'api_usage_stats_{instance.user.id if instance.user else "anonymous"}'
        cache.set(cache_key, {
            'last_request': instance.timestamp.isoformat(),
            'total_requests': ApiUsage.objects.filter(user=instance.user).count(),
            'average_response_time': ApiUsage.objects.filter(user=instance.user).aggregate(
                avg_time=models.Avg('response_time')
            )['avg_time'] or 0
        }, 300)  # Cache for 5 minutes


# ============================================================================
# SYSTEM HEALTH MONITORING SIGNALS
# ============================================================================

@receiver(post_save, sender=SystemHealth)
def update_system_health_cache(sender, instance, created, **kwargs):
    """Update cache with latest system health information"""
    if created:
        # Update cache with new system health data
        cache_key = f'system_health_{instance.component}'
        cache.set(cache_key, {
            'status': instance.status,
            'message': instance.message,
            'last_check': instance.last_check.isoformat(),
            'response_time': instance.response_time
        }, 600)  # Cache for 10 minutes
        
        # Update overall system health if this is a component update
        if instance.component != 'overall':
            update_overall_system_health()


def update_overall_system_health():
    """Update overall system health based on component statuses"""
    try:
        # Get latest status for each component
        components = SystemHealth.objects.values('component').distinct()
        component_statuses = {}
        
        for comp in components:
            latest = SystemHealth.objects.filter(
                component=comp['component']
            ).latest('last_check')
            component_statuses[comp['component']] = latest.status
        
        # Determine overall status
        if 'critical' in component_statuses.values():
            overall_status = 'critical'
        elif 'warning' in component_statuses.values():
            overall_status = 'warning'
        else:
            overall_status = 'healthy'
        
        # Create or update overall health record
        SystemHealth.objects.create(
            component='overall',
            status=overall_status,
            message=f'Overall system health: {overall_status}',
            details=component_statuses
        )
        
        # Update cache
        cache.set('system_health_overall', {
            'status': overall_status,
            'component_statuses': component_statuses,
            'last_check': timezone.now().isoformat()
        }, 300)  # Cache for 5 minutes
        
    except Exception as e:
        # Log error but don't fail
        pass


# ============================================================================
# DATABASE HEALTH MONITORING
# ============================================================================

def check_database_health():
    """Check database connectivity and performance"""
    try:
        start_time = time.time()
        
        with connection.cursor() as cursor:
            # Simple connectivity test
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            if result and result[0] == 1:
                status = 'healthy'
                message = 'Database connection successful'
            else:
                status = 'critical'
                message = 'Database connection failed'
        
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Create health record
        SystemHealth.objects.create(
            component='database',
            status=status,
            message=message,
            response_time=response_time
        )
        
        return status == 'healthy'
        
    except Exception as e:
        # Create critical health record
        SystemHealth.objects.create(
            component='database',
            status='critical',
            message=f'Database health check failed: {str(e)}'
        )
        return False


def check_cache_health():
    """Check cache connectivity and performance"""
    try:
        start_time = time.time()
        
        # Test cache operations
        test_key = 'health_check_cache'
        test_value = 'test_value'
        
        cache.set(test_key, test_value, 10)
        retrieved_value = cache.get(test_key)
        
        if retrieved_value == test_value:
            status = 'healthy'
            message = 'Cache operations successful'
        else:
            status = 'warning'
            message = 'Cache operations inconsistent'
        
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Create health record
        SystemHealth.objects.create(
            component='cache',
            status=status,
            message=message,
            response_time=response_time
        )
        
        return status == 'healthy'
        
    except Exception as e:
        # Create critical health record
        SystemHealth.objects.create(
            component='cache',
            status='critical',
            message=f'Cache health check failed: {str(e)}'
        )
        return False


# ============================================================================
# AUTOMATIC HEALTH CHECKS
# ============================================================================

def perform_system_health_checks():
    """Perform comprehensive system health checks"""
    try:
        # Check database health
        db_healthy = check_database_health()
        
        # Check cache health
        cache_healthy = check_cache_health()
        
        # Check file storage health (simplified)
        try:
            import os
            media_root = os.path.join(os.getcwd(), 'media')
            os.makedirs(media_root, exist_ok=True)
            
            test_file = os.path.join(media_root, 'health_check.txt')
            with open(test_file, 'w') as f:
                f.write('health check')
            os.remove(test_file)
            
            storage_status = 'healthy'
            storage_message = 'File storage operations successful'
        except Exception as e:
            storage_status = 'critical'
            storage_message = f'File storage health check failed: {str(e)}'
        
        # Create storage health record
        SystemHealth.objects.create(
            component='storage',
            status=storage_status,
            message=storage_message
        )
        
        # Update overall system health
        update_overall_system_health()
        
        return db_healthy and cache_healthy and storage_status == 'healthy'
        
    except Exception as e:
        # Create critical overall health record
        SystemHealth.objects.create(
            component='overall',
            status='critical',
            message=f'System health check failed: {str(e)}'
        )
        return False


# ============================================================================
# SIGNAL CONNECTIONS
# ============================================================================

# Note: These signals will be automatically connected when the app is loaded
# due to the apps.py configuration that imports this signals module
