from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Address


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    """Admin interface for Customer Addresses."""
    
    list_display = [
        'customer_name', 'label', 'full_address_display', 'is_default', 
        'has_coordinates', 'city', 'created_at'
    ]
    list_filter = [
        'label', 'is_default', 'city', 'province', 'created_at'
    ]
    search_fields = [
        'customer__first_name', 'customer__last_name', 'customer__user__email',
        'street_address', 'barangay', 'city', 'building_name', 'landmark'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'coordinates', 'has_coordinates'
    ]
    ordering = ['-is_default', '-created_at']
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('customer', 'label', 'is_default')
        }),
        ('Address Details', {
            'fields': ('street_address', 'barangay', 'city', 'province', 'postal_code')
        }),
        ('GPS Coordinates', {
            'fields': ('latitude', 'longitude', 'coordinates', 'has_coordinates')
        }),
        ('Additional Details', {
            'fields': ('building_name', 'floor_number', 'unit_number', 'landmark')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        """Display customer's full name."""
        return obj.customer.full_name
    customer_name.short_description = 'Customer'
    
    def full_address_display(self, obj):
        """Display full address."""
        return obj.full_address
    full_address_display.short_description = 'Full Address'
    
    def has_coordinates(self, obj):
        """Display if address has coordinates."""
        return obj.has_coordinates()
    has_coordinates.short_description = 'Has GPS'
    has_coordinates.boolean = True
    
    def coordinates(self, obj):
        """Display coordinates."""
        coords = obj.coordinates
        if coords:
            return f"({coords[0]}, {coords[1]})"
        return 'No coordinates'
    coordinates.short_description = 'GPS Coordinates'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('customer', 'customer__user')
