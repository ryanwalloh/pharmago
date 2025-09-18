from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Order, OrderLine, OrderChatMessage


class OrderLineInline(admin.TabularInline):
    """Inline admin for Order Lines."""
    model = OrderLine
    extra = 0
    readonly_fields = ['line_total', 'product_name', 'pharmacy_name']
    fields = [
        'inventory_item', 'quantity', 'unit_price', 'total_price', 
        'line_total', 'product_name', 'pharmacy_name', 'prescription_required', 
        'prescription_status', 'notes'
    ]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Admin interface for Orders."""
    
    list_display = [
        'order_number', 'customer_name', 'order_status', 'payment_status', 
        'total_amount', 'item_count', 'delivery_status', 'rider_name', 'created_at'
    ]
    list_filter = [
        'order_status', 'payment_status', 'delivery_type', 'source', 'created_at'
    ]
    search_fields = [
        'order_number', 'customer__first_name', 'customer__last_name', 
        'customer__user__email', 'customer__user__phone_number', 'notes'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'delivery_status', 'rider_name', 
        'estimated_delivery', 'actual_delivery_time', 'order_summary'
    ]
    ordering = ['-created_at']
    inlines = [OrderLineInline]
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order_number', 'customer', 'delivery_address')
        }),
        ('Order Status', {
            'fields': ('order_status', 'payment_status', 'delivery_type')
        }),
        ('Financial Information', {
            'fields': ('subtotal', 'tax_amount', 'delivery_fee', 'discount_amount', 'total_amount')
        }),
        ('Delivery Information', {
            'fields': ('estimated_delivery', 'actual_delivery', 'delivery_notes', 
                      'preferred_delivery_time', 'delivery_status', 'rider_name')
        }),
        ('Order Details', {
            'fields': ('source', 'notes')
        }),
        ('Prescription Information', {
            'fields': ('prescription_image_url', 'prescription_status', 'prescription_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Order Summary', {
            'fields': ('order_summary',),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        """Display customer's full name."""
        return obj.customer.full_name
    customer_name.short_description = 'Customer'
    
    def item_count(self, obj):
        """Display number of items in the order."""
        return obj.order_lines.count()
    item_count.short_description = 'Items'
    
    def delivery_status(self, obj):
        """Display delivery status with color coding."""
        status = obj.delivery_status
        color_map = {
            'unassigned': 'gray',
            'assigned': 'blue',
            'accepted': 'orange',
            'picked_up': 'purple',
            'delivering': 'green',
            'completed': 'darkgreen'
        }
        color = color_map.get(status, 'black')
        return format_html('<span style="color: {};">{}</span>', color, status.title())
    delivery_status.short_description = 'Delivery Status'
    
    def rider_name(self, obj):
        """Display assigned rider name."""
        rider = obj.get_rider_name()
        return rider if rider else 'Not Assigned'
    rider_name.short_description = 'Rider'
    
    def estimated_delivery(self, obj):
        """Display estimated delivery time."""
        est_time = obj.estimated_delivery
        if est_time:
            return est_time.strftime('%Y-%m-%d %H:%M')
        return 'Not Set'
    estimated_delivery.short_description = 'Estimated Delivery'
    
    def actual_delivery_time(self, obj):
        """Display actual delivery time."""
        actual_time = obj.actual_delivery_time
        if actual_time:
            return actual_time.strftime('%Y-%m-%d %H:%M')
        return 'Not Delivered'
    actual_delivery_time.short_description = 'Actual Delivery'
    
    def order_summary(self, obj):
        """Display order summary."""
        summary = obj.get_order_summary()
        return format_html(
            '<strong>Order:</strong> {}<br>'
            '<strong>Customer:</strong> {}<br>'
            '<strong>Status:</strong> {}<br>'
            '<strong>Total:</strong> ₱{:.2f}<br>'
            '<strong>Items:</strong> {}<br>'
            '<strong>Address:</strong> {}',
            summary['order_number'],
            summary['customer_name'],
            summary['status'],
            summary['total_amount'],
            summary['item_count'],
            summary['delivery_address']
        )
    order_summary.short_description = 'Summary'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related(
            'customer', 'customer__user', 'delivery_address'
        ).prefetch_related('order_lines', 'order_lines__inventory_item')
    
    def save_model(self, request, obj, form, change):
        """Override save to calculate totals."""
        super().save_model(request, obj, form, change)
        if not change:  # Only for new orders
            obj.calculate_totals()


@admin.register(OrderLine)
class OrderLineAdmin(admin.ModelAdmin):
    """Admin interface for Order Lines."""
    
    list_display = [
        'order_number', 'product_name', 'pharmacy_name', 'quantity', 
        'unit_price', 'line_total', 'prescription_required', 'prescription_status'
    ]
    list_filter = [
        'prescription_required', 'prescription_status', 'created_at'
    ]
    search_fields = [
        'order__order_number', 'inventory_item__name', 'inventory_item__custom_name',
        'inventory_item__pharmacy__pharmacy_name'
    ]
    readonly_fields = ['line_total', 'product_name', 'pharmacy_name', 'created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Order Information', {
            'fields': ('order', 'inventory_item')
        }),
        ('Product Details', {
            'fields': ('product_name', 'pharmacy_name')
        }),
        ('Pricing', {
            'fields': ('quantity', 'unit_price', 'total_price', 'line_total')
        }),
        ('Prescription Information', {
            'fields': ('prescription_required', 'prescription_status', 'prescription_notes')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def order_number(self, obj):
        """Display order number."""
        return obj.order.order_number
    order_number.short_description = 'Order Number'
    
    def product_name(self, obj):
        """Display product name."""
        return obj.product_name
    product_name.short_description = 'Product'
    
    def pharmacy_name(self, obj):
        """Display pharmacy name."""
        return obj.pharmacy_name
    pharmacy_name.short_description = 'Pharmacy'
    
    def line_total(self, obj):
        """Display line total."""
        return f"₱{obj.line_total:.2f}"
    line_total.short_description = 'Line Total'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related(
            'order', 'inventory_item', 'inventory_item__pharmacy'
        )


@admin.register(OrderChatMessage)
class OrderChatMessageAdmin(admin.ModelAdmin):
    """Admin interface for Order Chat Messages."""
    
    list_display = [
        'order_number', 'sender_name', 'sender_role', 'message_type', 
        'message_preview', 'is_read', 'created_at'
    ]
    list_filter = [
        'message_type', 'is_read', 'created_at'
    ]
    search_fields = [
        'order__order_number', 'sender__email', 'sender__phone_number', 
        'message', 'sender__customer_profile__first_name',
        'sender__pharmacy_profile__pharmacy_name',
        'sender__rider_profile__first_name'
    ]
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Message Information', {
            'fields': ('order', 'sender', 'message_type')
        }),
        ('Message Content', {
            'fields': ('message', 'image_url')
        }),
        ('Read Status', {
            'fields': ('is_read', 'read_at')
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
    
    def sender_name(self, obj):
        """Display sender's name."""
        return obj.sender_name
    sender_name.short_description = 'Sender'
    
    def sender_role(self, obj):
        """Display sender's role."""
        return obj.sender_role
    sender_role.short_description = 'Role'
    
    def message_preview(self, obj):
        """Display message preview."""
        if len(obj.message) > 50:
            return f"{obj.message[:50]}..."
        return obj.message
    message_preview.short_description = 'Message Preview'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related(
            'order', 'sender', 'sender__customer_profile',
            'sender__pharmacy_profile', 'sender__rider_profile'
        )
