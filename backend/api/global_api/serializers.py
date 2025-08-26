from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models
from django.apps import apps
from django.core.exceptions import ValidationError
import json
import csv
import io
from openpyxl import Workbook, load_workbook

from .models import SystemHealth, ApiUsage, GlobalSearchLog, BulkOperationLog

User = get_user_model()


# ============================================================================
# SYSTEM HEALTH SERIALIZERS
# ============================================================================

class SystemHealthSerializer(serializers.ModelSerializer):
    """Main serializer for system health monitoring"""
    
    class Meta:
        model = SystemHealth
        fields = '__all__'
        read_only_fields = ['last_check']


class SystemHealthCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating system health records"""
    
    class Meta:
        model = SystemHealth
        fields = ['component', 'status', 'message', 'details', 'response_time']


class SystemHealthUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating system health records"""
    
    class Meta:
        model = SystemHealth
        fields = ['status', 'message', 'details', 'response_time']


class SystemHealthListSerializer(serializers.ModelSerializer):
    """Serializer for listing system health records"""
    
    class Meta:
        model = SystemHealth
        fields = ['id', 'component', 'status', 'message', 'last_check', 'response_time']


class SystemHealthDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed system health view"""
    
    class Meta:
        model = SystemHealth
        fields = '__all__'


# ============================================================================
# API USAGE SERIALIZERS
# ============================================================================

class ApiUsageSerializer(serializers.ModelSerializer):
    """Main serializer for API usage tracking"""
    
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = ApiUsage
        fields = '__all__'
        read_only_fields = ['timestamp']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'


class ApiUsageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating API usage records"""
    
    class Meta:
        model = ApiUsage
        fields = ['user', 'endpoint', 'method', 'status_code', 'response_time', 
                 'user_agent', 'ip_address', 'request_size', 'response_size']


class ApiUsageListSerializer(serializers.ModelSerializer):
    """Serializer for listing API usage records"""
    
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = ApiUsage
        fields = ['id', 'user_email', 'endpoint', 'method', 'status_code', 
                 'response_time', 'timestamp', 'ip_address']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'


class ApiUsageStatsSerializer(serializers.Serializer):
    """Serializer for API usage statistics"""
    
    total_requests = serializers.IntegerField()
    average_response_time = serializers.FloatField()
    success_rate = serializers.FloatField()
    top_endpoints = serializers.ListField()
    top_users = serializers.ListField()
    hourly_distribution = serializers.DictField()
    period_days = serializers.IntegerField()


# ============================================================================
# GLOBAL SEARCH SERIALIZERS
# ============================================================================

class GlobalSearchQuerySerializer(serializers.Serializer):
    """Serializer for global search queries"""
    
    query = serializers.CharField(max_length=255)
    model_type = serializers.CharField(max_length=100, required=False, default='all')
    limit = serializers.IntegerField(min_value=1, max_value=1000, required=False, default=50)


class GlobalSearchResultSerializer(serializers.Serializer):
    """Serializer for individual search results"""
    
    id = serializers.IntegerField()
    model = serializers.CharField()
    display_name = serializers.CharField()
    url = serializers.CharField()
    name = serializers.CharField(required=False)
    email = serializers.CharField(required=False)
    phone = serializers.CharField(required=False)


class GlobalSearchResponseSerializer(serializers.Serializer):
    """Serializer for global search response"""
    
    query = serializers.CharField()
    total_results = serializers.IntegerField()
    results = serializers.DictField()
    timestamp = serializers.DateTimeField()


class GlobalSearchLogSerializer(serializers.ModelSerializer):
    """Serializer for global search logs"""
    
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = GlobalSearchLog
        fields = '__all__'
        read_only_fields = ['timestamp']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'


# ============================================================================
# BULK OPERATIONS SERIALIZERS
# ============================================================================

class BulkOperationBaseSerializer(serializers.Serializer):
    """Base serializer for bulk operations"""
    
    model_type = serializers.CharField(max_length=100)
    records_count = serializers.IntegerField(min_value=1)


class BulkOperationCreateSerializer(BulkOperationBaseSerializer):
    """Serializer for bulk create operations"""
    
    data = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )


class BulkOperationUpdateSerializer(BulkOperationBaseSerializer):
    """Serializer for bulk update operations"""
    
    updates = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )


class BulkOperationDeleteSerializer(BulkOperationBaseSerializer):
    """Serializer for bulk delete operations"""
    
    record_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )


class BulkOperationLogSerializer(serializers.ModelSerializer):
    """Serializer for bulk operation logs"""
    
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = BulkOperationLog
        fields = '__all__'
        read_only_fields = ['timestamp']
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'


# ============================================================================
# EXPORT/IMPORT SERIALIZERS
# ============================================================================

class ExportRequestSerializer(serializers.Serializer):
    """Serializer for export requests"""
    
    model_type = serializers.CharField(max_length=100)
    format = serializers.ChoiceField(
        choices=['csv', 'json', 'excel'],
        default='csv'
    )
    filters = serializers.CharField(required=False, default='{}')


class ImportRequestSerializer(serializers.Serializer):
    """Serializer for import requests"""
    
    model_type = serializers.CharField(max_length=100)
    file = serializers.FileField()
    format = serializers.ChoiceField(
        choices=['csv', 'json', 'excel'],
        default='csv'
    )


class ExportImportResultSerializer(serializers.Serializer):
    """Serializer for export/import results"""
    
    message = serializers.CharField()
    records_count = serializers.IntegerField()
    error_count = serializers.IntegerField()
    errors = serializers.ListField(required=False)


# ============================================================================
# GLOBAL STATISTICS SERIALIZERS
# ============================================================================

class GlobalStatisticsOverviewSerializer(serializers.Serializer):
    """Serializer for global statistics overview"""
    
    model_counts = serializers.DictField()
    recent_activity = serializers.DictField()
    system_status = serializers.CharField()
    api_usage = serializers.DictField()
    timestamp = serializers.DateTimeField()


class GlobalStatisticsModelSerializer(serializers.Serializer):
    """Serializer for model-specific statistics"""
    
    model_name = serializers.CharField()
    total_count = serializers.IntegerField()
    creation_trends = serializers.ListField()
    field_statistics = serializers.DictField()
    timestamp = serializers.DateTimeField()


class GlobalStatisticsPerformanceSerializer(serializers.Serializer):
    """Serializer for performance statistics"""
    
    database = serializers.DictField()
    cache = serializers.DictField()
    api_performance = serializers.DictField()
    timestamp = serializers.DateTimeField()
