from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import DeliveryZone, RiderAssignment, RiderLocation, OrderRiderAssignment


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    """Admin interface for Delivery Zones."""
    
    list_display = [
        'name', 'center_coordinates', 'radius_km', 'base_delivery_fee', 
        'estimated_delivery_time', 'max_batch_size', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    
    fieldsets = (
        ('Zone Information', {
            'fields': ('name', 'description')
        }),
        ('Geographic Boundaries', {
            'fields': ('center_latitude', 'center_longitude', 'radius_km')
        }),
        ('Delivery Settings', {
            'fields': ('base_delivery_fee', 'estimated_delivery_time')
        }),
        ('Batching Settings', {
            'fields': ('max_batch_size', 'max_batch_distance_km')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def center_coordinates(self, obj):
        """Display center coordinates."""
        return f"({obj.center_latitude}, {obj.center_longitude})"
    center_coordinates.short_description = 'Center Coordinates'


class OrderRiderAssignmentInline(admin.TabularInline):
    """Inline admin for Order Rider Assignments."""
    model = OrderRiderAssignment
    extra = 0
    readonly_fields = ['created_at', 'updated_at']
    fields = [
        'order', 'pickup_sequence', 'delivery_sequence', 
        'picked_up_at', 'delivered_at', 'delivery_notes'
    ]


@admin.register(RiderAssignment)
class RiderAssignmentAdmin(admin.ModelAdmin):
    """Admin interface for Rider Assignments."""
    
    list_display = [
        'assignment_id', 'rider_name', 'assignment_type', 'status', 'batch_size',
        'total_delivery_fee', 'rider_earnings', 'assigned_at', 'estimated_completion'
    ]
    list_filter = [
        'assignment_type', 'status', 'batch_size', 'assigned_at'
    ]
    search_fields = [
        'assignment_id', 'rider__first_name', 'rider__last_name', 
        'rider__user__email', 'notes'
    ]
    readonly_fields = [
        'assignment_id', 'assigned_at', 'accepted_at', 'picked_up_at', 
        'started_delivery_at', 'completed_at', 'created_at', 'updated_at'
    ]
    ordering = ['-assigned_at']
    inlines = [OrderRiderAssignmentInline]
    
    fieldsets = (
        ('Assignment Information', {
            'fields': ('assignment_id', 'rider', 'assignment_type', 'status')
        }),
        ('Batching Information', {
            'fields': ('batch_size', 'max_batch_size')
        }),
        ('Geographic Information', {
            'fields': ('pickup_latitude', 'pickup_longitude')
        }),
        ('Financial Information', {
            'fields': ('total_delivery_fee', 'rider_earnings')
        }),
        ('Timing Information', {
            'fields': ('assigned_at', 'accepted_at', 'picked_up_at', 
                      'started_delivery_at', 'completed_at', 'estimated_completion')
        }),
        ('Notes', {
            'fields': ('notes', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def rider_name(self, obj):
        """Display rider's full name."""
        return obj.rider.full_name
    rider_name.short_description = 'Rider'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('rider', 'rider__user')


@admin.register(RiderLocation)
class RiderLocationAdmin(admin.ModelAdmin):
    """Admin interface for Rider Locations."""
    
    list_display = [
        'rider_name', 'coordinates', 'accuracy', 'speed', 'heading', 'timestamp'
    ]
    list_filter = ['timestamp']
    search_fields = [
        'rider__first_name', 'rider__last_name', 'rider__user__email'
    ]
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Rider Information', {
            'fields': ('rider', 'assignment')
        }),
        ('GPS Coordinates', {
            'fields': ('latitude', 'longitude', 'accuracy')
        }),
        ('Movement Data', {
            'fields': ('speed', 'heading')
        }),
        ('Timestamp', {
            'fields': ('timestamp',)
        }),
    )
    
    def rider_name(self, obj):
        """Display rider's full name."""
        return obj.rider.full_name
    rider_name.short_description = 'Rider'
    
    def coordinates(self, obj):
        """Display coordinates."""
        return f"({obj.latitude}, {obj.longitude})"
    coordinates.short_description = 'Coordinates'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('rider', 'rider__user', 'assignment')


@admin.register(OrderRiderAssignment)
class OrderRiderAssignmentAdmin(admin.ModelAdmin):
    """Admin interface for Order Rider Assignments."""
    
    list_display = [
        'order_number', 'assignment_id', 'rider_name', 'pickup_sequence', 
        'delivery_sequence', 'picked_up_at', 'delivered_at'
    ]
    list_filter = [
        'pickup_sequence', 'delivery_sequence', 'created_at'
    ]
    search_fields = [
        'order__order_number', 'assignment__assignment_id', 
        'assignment__rider__first_name', 'assignment__rider__last_name'
    ]
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['assignment', 'pickup_sequence', 'delivery_sequence']
    
    fieldsets = (
        ('Assignment Information', {
            'fields': ('order', 'assignment')
        }),
        ('Sequence Information', {
            'fields': ('pickup_sequence', 'delivery_sequence')
        }),
        ('Delivery Status', {
            'fields': ('picked_up_at', 'delivered_at', 'delivery_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def order_number(self, obj):
        """Display order number."""
        return obj.order.order_number
    order_number.short_description = 'Order Number'
    
    def assignment_id(self, obj):
        """Display assignment ID."""
        return obj.assignment.assignment_id
    assignment_id.short_description = 'Assignment ID'
    
    def rider_name(self, obj):
        """Display rider's full name."""
        return obj.assignment.rider.full_name
    rider_name.short_description = 'Rider'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related(
            'order', 'assignment', 'assignment__rider', 'assignment__rider__user'
        )
