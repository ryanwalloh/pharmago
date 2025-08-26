from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class SystemHealth(models.Model):
    """System health monitoring and status tracking"""
    
    STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('maintenance', 'Maintenance'),
    ]
    
    COMPONENT_CHOICES = [
        ('database', 'Database'),
        ('cache', 'Cache'),
        ('storage', 'File Storage'),
        ('external_apis', 'External APIs'),
        ('email', 'Email Service'),
        ('celery', 'Background Tasks'),
        ('overall', 'Overall System'),
    ]
    
    component = models.CharField(max_length=50, choices=COMPONENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    message = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    last_check = models.DateTimeField(auto_now=True)
    response_time = models.FloatField(help_text='Response time in milliseconds', null=True, blank=True)
    
    class Meta:
        verbose_name = 'System Health'
        verbose_name_plural = 'System Health'
        ordering = ['-last_check']
        unique_together = ['component', 'last_check']
    
    def __str__(self):
        return f"{self.component} - {self.status} ({self.last_check.strftime('%Y-%m-%d %H:%M')})"


class ApiUsage(models.Model):
    """API usage tracking and rate limiting analytics"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField()
    response_time = models.FloatField(help_text='Response time in milliseconds')
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    request_size = models.IntegerField(help_text='Request size in bytes', null=True, blank=True)
    response_size = models.IntegerField(help_text='Response size in bytes', null=True, blank=True)
    
    class Meta:
        verbose_name = 'API Usage'
        verbose_name_plural = 'API Usage'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['endpoint', 'timestamp']),
            models.Index(fields=['status_code', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.status_code} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


class GlobalSearchLog(models.Model):
    """Global search query logging and analytics"""
    
    SEARCH_TYPE_CHOICES = [
        ('cross_model', 'Cross-Model Search'),
        ('specific_model', 'Specific Model Search'),
        ('advanced_filter', 'Advanced Filtering'),
        ('bulk_operation', 'Bulk Operation'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    search_type = models.CharField(max_length=20, choices=SEARCH_TYPE_CHOICES)
    query = models.TextField()
    models_searched = models.JSONField(default=list, help_text='List of models included in search')
    results_count = models.IntegerField()
    execution_time = models.FloatField(help_text='Search execution time in milliseconds')
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Global Search Log'
        verbose_name_plural = 'Global Search Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['search_type', 'timestamp']),
            models.Index(fields=['query', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.search_type} - {self.query[:50]}... ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


class BulkOperationLog(models.Model):
    """Bulk operation logging and tracking"""
    
    OPERATION_TYPE_CHOICES = [
        ('create', 'Bulk Create'),
        ('update', 'Bulk Update'),
        ('delete', 'Bulk Delete'),
        ('export', 'Bulk Export'),
        ('import', 'Bulk Import'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    operation_type = models.CharField(max_length=20, choices=OPERATION_TYPE_CHOICES)
    model_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_items = models.IntegerField()
    processed_items = models.IntegerField(default=0)
    successful_items = models.IntegerField(default=0)
    failed_items = models.IntegerField(default=0)
    error_details = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    execution_time = models.FloatField(help_text='Total execution time in seconds', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Bulk Operation Log'
        verbose_name_plural = 'Bulk Operation Logs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['operation_type', 'started_at']),
            models.Index(fields=['status', 'started_at']),
        ]
    
    def __str__(self):
        return f"{self.operation_type} on {self.model_name} - {self.status} ({self.started_at.strftime('%Y-%m-%d %H:%M')})"
    
    def mark_completed(self, execution_time=None):
        """Mark the operation as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if execution_time:
            self.execution_time = execution_time
        self.save()
    
    def mark_failed(self, error_details=None):
        """Mark the operation as failed"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        if error_details:
            self.error_details = error_details
        self.save()
