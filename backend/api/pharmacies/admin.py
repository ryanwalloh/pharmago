from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import PharmacyOperatingHours


@admin.register(PharmacyOperatingHours)
class PharmacyOperatingHoursAdmin(admin.ModelAdmin):
    """Admin interface for Pharmacy Operating Hours."""
    
    list_display = [
        'pharmacy_name', 'day_of_week', 'operating_hours_display', 'is_closed'
    ]
    list_filter = [
        'day_of_week', 'is_closed', 'pharmacy__pharmacy_name'
    ]
    search_fields = [
        'pharmacy__pharmacy_name', 'pharmacy__owner_first_name', 'pharmacy__owner_last_name'
    ]
    readonly_fields = []
    ordering = ['pharmacy__pharmacy_name', 'day_of_week']
    
    fieldsets = (
        ('Pharmacy Information', {
            'fields': ('pharmacy',)
        }),
        ('Operating Hours', {
            'fields': ('day_of_week', 'open_time', 'close_time', 'is_closed')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def pharmacy_name(self, obj):
        """Display pharmacy name."""
        return obj.pharmacy.pharmacy_name
    pharmacy_name.short_description = 'Pharmacy'
    
    def operating_hours_display(self, obj):
        """Display operating hours."""
        if obj.is_closed:
            return format_html('<span style="color: red;">Closed</span>')
        return f"{obj.open_time} - {obj.close_time}"
    operating_hours_display.short_description = 'Operating Hours'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('pharmacy')
