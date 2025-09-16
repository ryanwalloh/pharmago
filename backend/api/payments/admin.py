from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Admin interface for Payments."""
    
    list_display = [
        'payment_id', 'order_number', 'customer_name', 'payment_method', 
        'amount_paid', 'currency', 'payment_status', 'payment_type', 'created_at'
    ]
    list_filter = [
        'payment_method', 'payment_status', 'payment_type', 'currency', 'created_at'
    ]
    search_fields = [
        'payment_id', 'order__order_number', 'order__customer__first_name', 
        'order__customer__last_name', 'transaction_id', 'gateway_reference', 
        'receipt_number'
    ]
    readonly_fields = [
        'payment_id', 'initiated_at', 'processed_at', 'paid_at', 'failed_at', 
        'refunded_at', 'created_at', 'updated_at', 'total_fees', 'net_amount'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_id', 'order', 'payment_method', 'payment_type')
        }),
        ('Amount Information', {
            'fields': ('amount_paid', 'currency', 'total_fees', 'net_amount')
        }),
        ('Transaction Details', {
            'fields': ('transaction_id', 'gateway_reference', 'receipt_number')
        }),
        ('Payment Proof', {
            'fields': ('image_proof',)
        }),
        ('Status Tracking', {
            'fields': ('payment_status', 'status_notes')
        }),
        ('Timing Information', {
            'fields': ('initiated_at', 'processed_at', 'paid_at', 'failed_at', 'refunded_at')
        }),
        ('Fee Information', {
            'fields': ('processing_fee', 'gateway_fee')
        }),
        ('Notes', {
            'fields': ('customer_notes', 'admin_notes')
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
    
    def customer_name(self, obj):
        """Display customer's full name."""
        return obj.order.customer.full_name
    customer_name.short_description = 'Customer'
    
    def total_fees(self, obj):
        """Display total fees."""
        return f"₱{obj.total_fees:.2f}"
    total_fees.short_description = 'Total Fees'
    
    def net_amount(self, obj):
        """Display net amount."""
        return f"₱{obj.net_amount:.2f}"
    net_amount.short_description = 'Net Amount'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related(
            'order', 'order__customer', 'order__customer__user'
        )
    
    def payment_summary(self, obj):
        """Display payment summary."""
        summary = obj.payment_summary
        return format_html(
            '<strong>Payment ID:</strong> {}<br>'
            '<strong>Order:</strong> {}<br>'
            '<strong>Amount:</strong> {} {}<br>'
            '<strong>Method:</strong> {}<br>'
            '<strong>Status:</strong> {}<br>'
            '<strong>Created:</strong> {}',
            summary['payment_id'],
            summary['order_number'],
            summary['amount'],
            summary['currency'],
            summary['method'],
            summary['status'],
            summary['created_at'].strftime('%Y-%m-%d %H:%M')
        )
    payment_summary.short_description = 'Summary'
