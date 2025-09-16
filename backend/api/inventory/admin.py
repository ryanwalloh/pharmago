from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import MedicineCategory, MedicineCatalog, PharmacyInventory


@admin.register(MedicineCategory)
class MedicineCategoryAdmin(admin.ModelAdmin):
    """Admin interface for Medicine Categories."""
    
    list_display = ['name', 'category_path', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active', 'parent_category', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'level', 'is_root', 'has_children']
    ordering = ['sort_order', 'name']
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'description', 'parent_category')
        }),
        ('Display Settings', {
            'fields': ('icon', 'color', 'sort_order')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Category Properties', {
            'fields': ('level', 'is_root', 'has_children'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def category_path(self, obj):
        """Display the full category path."""
        return obj.full_path
    category_path.short_description = 'Category Path'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('parent_category')


@admin.register(MedicineCatalog)
class MedicineCatalogAdmin(admin.ModelAdmin):
    """Admin interface for Medicine Catalog."""
    
    list_display = [
        'display_name', 'category', 'form', 'dosage', 'prescription_required', 
        'controlled_substance', 'is_active', 'is_featured', 'created_at'
    ]
    list_filter = [
        'category', 'form', 'prescription_required', 'controlled_substance', 
        'is_active', 'is_featured', 'fda_approval', 'created_at'
    ]
    search_fields = [
        'name', 'generic_name', 'dosage', 'therapeutic_class', 'fda_number'
    ]
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name', 'dosage']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('category', 'name', 'generic_name', 'brand_names', 'form', 'dosage')
        }),
        ('Medical Information', {
            'fields': ('description', 'active_ingredients', 'therapeutic_class', 
                      'side_effects', 'contraindications', 'interactions')
        }),
        ('Prescription & Control', {
            'fields': ('prescription_required', 'controlled_substance')
        }),
        ('Storage & Handling', {
            'fields': ('storage_conditions', 'shelf_life')
        }),
        ('Images & Media', {
            'fields': ('image', 'images')
        }),
        ('Regulatory Information', {
            'fields': ('fda_approval', 'fda_number')
        }),
        ('Status & Features', {
            'fields': ('is_active', 'is_featured')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_name(self, obj):
        """Display the formatted medicine name."""
        return obj.display_name
    display_name.short_description = 'Medicine Name'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('category')


@admin.register(PharmacyInventory)
class PharmacyInventoryAdmin(admin.ModelAdmin):
    """Admin interface for Pharmacy Inventory."""
    
    list_display = [
        'display_name', 'pharmacy', 'category', 'price', 'stock_quantity', 
        'stock_status', 'is_available', 'is_on_sale', 'created_at'
    ]
    list_filter = [
        'pharmacy', 'category', 'form', 'is_available', 'is_featured', 
        'is_on_sale', 'prescription_required', 'created_at'
    ]
    search_fields = [
        'name', 'custom_name', 'pharmacy__pharmacy_name', 'manufacturer', 
        'batch_number'
    ]
    readonly_fields = ['created_at', 'updated_at', 'stock_status', 'current_price', 'profit_margin']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Product Information', {
            'fields': ('pharmacy', 'medicine', 'category', 'name', 'custom_name', 
                      'form', 'dosage', 'description', 'custom_description')
        }),
        ('Prescription Requirements', {
            'fields': ('prescription_required',)
        }),
        ('Pricing', {
            'fields': ('price', 'original_price', 'cost_price', 'current_price', 'profit_margin')
        }),
        ('Inventory Management', {
            'fields': ('stock_quantity', 'min_stock_level', 'max_stock_level', 'stock_status')
        }),
        ('Sale Information', {
            'fields': ('is_on_sale', 'discount_percentage', 'sale_start_date', 'sale_end_date')
        }),
        ('Product Details', {
            'fields': ('manufacturer', 'batch_number', 'expiry_date', 'tags', 'notes')
        }),
        ('Images & Media', {
            'fields': ('image', 'images')
        }),
        ('Status & Features', {
            'fields': ('is_available', 'is_featured')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_name(self, obj):
        """Display the formatted product name."""
        return obj.display_name
    display_name.short_description = 'Product Name'
    
    def stock_status(self, obj):
        """Display stock status with color coding."""
        status = obj.stock_status
        if status == 'out_of_stock':
            return format_html('<span style="color: red;">Out of Stock</span>')
        elif status == 'low_stock':
            return format_html('<span style="color: orange;">Low Stock</span>')
        elif status == 'overstocked':
            return format_html('<span style="color: blue;">Overstocked</span>')
        else:
            return format_html('<span style="color: green;">Normal</span>')
    stock_status.short_description = 'Stock Status'
    
    def current_price(self, obj):
        """Display current price with discount if applicable."""
        price_info = obj.get_display_price()
        if price_info['discount_percentage']:
            return format_html(
                '<span style="text-decoration: line-through;">₱{:.2f}</span><br>'
                '<span style="color: red; font-weight: bold;">₱{:.2f}</span><br>'
                '<small>{}% off</small>',
                price_info['original_price'],
                price_info['current_price'],
                price_info['discount_percentage']
            )
        return f"₱{price_info['current_price']:.2f}"
    current_price.short_description = 'Current Price'
    
    def profit_margin(self, obj):
        """Display profit margin percentage."""
        margin = obj.profit_margin
        if margin is not None:
            color = 'green' if margin > 0 else 'red'
            return format_html('<span style="color: {};">{:.1f}%</span>', color, margin)
        return 'N/A'
    profit_margin.short_description = 'Profit Margin'
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('pharmacy', 'medicine', 'category')
    
    def is_expiring_soon(self, obj):
        """Check if product is expiring soon."""
        return obj.is_expiring_soon
    is_expiring_soon.short_description = 'Expiring Soon'
    is_expiring_soon.boolean = True
