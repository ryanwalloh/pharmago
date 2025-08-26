from django.contrib import admin
from .models import SystemHealth, ApiUsage, GlobalSearchLog, BulkOperationLog


@admin.register(SystemHealth)
class SystemHealthAdmin(admin.ModelAdmin):
    """Admin interface for SystemHealth model"""
    
    list_display = ['component', 'status', 'last_check', 'response_time']
    list_filter = ['component', 'status', 'last_check']
    search_fields = ['component', 'message']
    readonly_fields = ['last_check']
    ordering = ['-last_check']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('component', 'status', 'message')
        }),
        ('Performance', {
            'fields': ('response_time', 'last_check')
        }),
        ('Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ApiUsage)
class ApiUsageAdmin(admin.ModelAdmin):
    """Admin interface for ApiUsage model"""
    
    list_display = ['endpoint', 'method', 'status_code', 'user', 'response_time', 'timestamp', 'ip_address']
    list_filter = ['method', 'status_code', 'timestamp', 'ip_address']
    search_fields = ['endpoint', 'user__email', 'user_agent', 'ip_address']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('endpoint', 'method', 'status_code')
        }),
        ('User Information', {
            'fields': ('user', 'ip_address', 'user_agent')
        }),
        ('Performance', {
            'fields': ('response_time', 'request_size', 'response_size')
        }),
        ('Timing', {
            'fields': ('timestamp',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('user')


@admin.register(GlobalSearchLog)
class GlobalSearchLogAdmin(admin.ModelAdmin):
    """Admin interface for GlobalSearchLog model"""
    
    list_display = ['search_type', 'query', 'user', 'results_count', 'execution_time', 'timestamp']
    list_filter = ['search_type', 'timestamp']
    search_fields = ['query', 'user__email', 'ip_address']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Search Information', {
            'fields': ('search_type', 'query', 'models_searched')
        }),
        ('Results', {
            'fields': ('results_count', 'execution_time')
        }),
        ('User Information', {
            'fields': ('user', 'ip_address')
        }),
        ('Timing', {
            'fields': ('timestamp',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('user')


@admin.register(BulkOperationLog)
class BulkOperationLogAdmin(admin.ModelAdmin):
    """Admin interface for BulkOperationLog model"""
    
    list_display = ['operation_type', 'model_name', 'user', 'status', 'total_items', 'successful_items', 'failed_items', 'started_at']
    list_filter = ['operation_type', 'status', 'started_at', 'model_name']
    search_fields = ['model_name', 'user__email']
    readonly_fields = ['started_at', 'completed_at']
    ordering = ['-started_at']
    
    fieldsets = (
        ('Operation Information', {
            'fields': ('operation_type', 'model_name', 'status')
        }),
        ('Progress', {
            'fields': ('total_items', 'processed_items', 'successful_items', 'failed_items')
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'execution_time')
        }),
        ('User', {
            'fields': ('user',)
        }),
        ('Error Details', {
            'fields': ('error_details',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('user')
    
    def has_add_permission(self, request):
        """Bulk operations should not be created manually"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Allow editing of bulk operation logs"""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow deletion of bulk operation logs"""
        return True
