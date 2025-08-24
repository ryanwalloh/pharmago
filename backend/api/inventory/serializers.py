from rest_framework import serializers
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from .models import MedicineCategory, MedicineCatalog, PharmacyInventory
from api.users.models import Pharmacy


class MedicineCategorySerializer(serializers.ModelSerializer):
    """Serializer for MedicineCategory with hierarchical support"""
    
    subcategories = serializers.SerializerMethodField()
    parent_category_name = serializers.CharField(source='parent_category.name', read_only=True)
    level = serializers.ReadOnlyField()
    is_root = serializers.ReadOnlyField()
    has_children = serializers.ReadOnlyField()
    
    class Meta:
        model = MedicineCategory
        fields = [
            'id', 'name', 'description', 'parent_category', 'parent_category_name',
            'icon', 'color', 'is_active', 'sort_order', 'subcategories',
            'level', 'is_root', 'has_children', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_subcategories(self, obj):
        """Get subcategories for this category"""
        if obj.subcategories.exists():
            return MedicineCategorySerializer(obj.subcategories.all(), many=True).data
        return []
    
    def validate(self, attrs):
        """Validate category data"""
        # Prevent circular references
        if 'parent_category' in attrs and attrs['parent_category']:
            parent = attrs['parent_category']
            if parent.id == self.instance.id if self.instance else False:
                raise ValidationError("Category cannot be its own parent")
            
            # Check for deep nesting (max 3 levels)
            if parent.level >= 2:
                raise ValidationError("Maximum nesting level is 3")
        
        return attrs


class MedicineCatalogSerializer(serializers.ModelSerializer):
    """Serializer for MedicineCatalog with comprehensive medicine information"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_path = serializers.CharField(source='category.full_path', read_only=True)
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    brand_names_display = serializers.CharField(source='get_brand_names_display', read_only=True)
    side_effects_display = serializers.CharField(source='get_side_effects_display', read_only=True)
    contraindications_display = serializers.CharField(source='get_contraindications_display', read_only=True)
    interactions_display = serializers.CharField(source='get_interactions_display', read_only=True)
    active_ingredients_display = serializers.CharField(source='get_active_ingredients_display', read_only=True)
    storage_info = serializers.CharField(source='get_storage_info', read_only=True)
    average_price = serializers.SerializerMethodField()
    available_pharmacies_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicineCatalog
        fields = [
            'id', 'category', 'category_name', 'category_path', 'name', 'generic_name',
            'brand_names', 'form', 'form_display', 'dosage', 'description',
            'active_ingredients', 'prescription_required', 'controlled_substance',
            'therapeutic_class', 'side_effects', 'contraindications', 'interactions',
            'storage_conditions', 'shelf_life', 'image', 'images', 'fda_approval',
            'fda_number', 'is_active', 'is_featured', 'average_price',
            'available_pharmacies_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_average_price(self, obj):
        """Get average price across all pharmacies"""
        return obj.get_average_price()
    
    def get_available_pharmacies_count(self, obj):
        """Get count of pharmacies that have this medicine"""
        return obj.pharmacy_inventories.filter(is_available=True).count()
    
    def validate(self, attrs):
        """Validate medicine catalog data"""
        # Ensure controlled substances require prescription
        if attrs.get('controlled_substance', False) and not attrs.get('prescription_required', False):
            attrs['prescription_required'] = True
        
        # Validate brand names format
        if 'brand_names' in attrs and attrs['brand_names']:
            if not isinstance(attrs['brand_names'], list):
                raise ValidationError("Brand names must be a list")
            if not all(isinstance(name, str) and name.strip() for name in attrs['brand_names']):
                raise ValidationError("All brand names must be non-empty strings")
        
        return attrs


class PharmacyInventorySerializer(serializers.ModelSerializer):
    """Serializer for PharmacyInventory with business logic"""
    
    pharmacy_name = serializers.CharField(source='pharmacy.pharmacy_name', read_only=True)
    pharmacy_location = serializers.CharField(source='pharmacy.street_address', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    display_description = serializers.CharField(source='get_display_description', read_only=True)
    is_custom_product = serializers.ReadOnlyField()
    is_from_catalog = serializers.ReadOnlyField()
    current_price = serializers.ReadOnlyField()
    discount_amount = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    display_price = serializers.SerializerMethodField()
    
    class Meta:
        model = PharmacyInventory
        fields = [
            'id', 'pharmacy', 'pharmacy_name', 'pharmacy_location', 'medicine',
            'category', 'category_name', 'name', 'form', 'form_display', 'dosage',
            'description', 'prescription_required', 'custom_name', 'custom_description',
            'price', 'original_price', 'cost_price', 'stock_quantity', 'min_stock_level',
            'max_stock_level', 'is_available', 'is_featured', 'is_on_sale',
            'sale_start_date', 'sale_end_date', 'discount_percentage', 'image',
            'images', 'manufacturer', 'batch_number', 'expiry_date', 'tags',
            'notes', 'display_name', 'display_description', 'is_custom_product',
            'is_from_catalog', 'current_price', 'discount_amount', 'profit_margin',
            'stock_status', 'is_expiring_soon', 'display_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_display_price(self, obj):
        """Get formatted display price with discount information"""
        return obj.get_display_price()
    
    def validate(self, attrs):
        """Validate pharmacy inventory data"""
        # Ensure custom products have required fields
        if not attrs.get('medicine') and not attrs.get('custom_name'):
            raise ValidationError("Custom products must have a custom name")
        
        # Validate sale dates
        if attrs.get('is_on_sale', False):
            if not attrs.get('sale_start_date') or not attrs.get('sale_end_date'):
                raise ValidationError("Sale products must have start and end dates")
            
            if attrs['sale_start_date'] >= attrs['sale_end_date']:
                raise ValidationError("Sale start date must be before end date")
        
        # Validate discount percentage
        if attrs.get('discount_percentage'):
            if not 0 <= attrs['discount_percentage'] <= 100:
                raise ValidationError("Discount percentage must be between 0 and 100")
        
        # Validate stock levels
        if 'stock_quantity' in attrs and 'min_stock_level' in attrs:
            if attrs['stock_quantity'] < 0:
                raise ValidationError("Stock quantity cannot be negative")
            if attrs['min_stock_level'] < 0:
                raise ValidationError("Minimum stock level cannot be negative")
        
        # Validate pricing
        if 'price' in attrs and attrs['price'] < 0:
            raise ValidationError("Price cannot be negative")
        
        if 'cost_price' in attrs and attrs['cost_price']:
            if attrs['cost_price'] < 0:
                raise ValidationError("Cost price cannot be negative")
            if 'price' in attrs and attrs['price'] < attrs['cost_price']:
                raise ValidationError("Selling price cannot be less than cost price")
        
        return attrs
    
    def create(self, validated_data):
        """Create inventory item with business logic"""
        # Set original price if not provided
        if 'price' in validated_data and not validated_data.get('original_price'):
            validated_data['original_price'] = validated_data['price']
        
        # Inherit catalog information if medicine is set
        if validated_data.get('medicine'):
            medicine = validated_data['medicine']
            if not validated_data.get('custom_name'):
                validated_data['name'] = medicine.name
                validated_data['form'] = medicine.form
                validated_data['dosage'] = medicine.dosage
                validated_data['description'] = medicine.description
                validated_data['prescription_required'] = medicine.prescription_required
                validated_data['category'] = medicine.category
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update inventory item with business logic"""
        # Handle stock updates
        if 'stock_quantity' in validated_data:
            old_quantity = instance.stock_quantity
            new_quantity = validated_data['stock_quantity']
            
            # Check if stock is being reduced below 0
            if new_quantity < 0:
                raise ValidationError("Stock quantity cannot be negative")
            
            # Update availability based on stock
            if new_quantity == 0:
                validated_data['is_available'] = False
            elif old_quantity == 0 and new_quantity > 0:
                validated_data['is_available'] = True
        
        # Handle sale updates
        if 'is_on_sale' in validated_data and not validated_data['is_on_sale']:
            # Clear sale-related fields when ending sale
            validated_data['discount_percentage'] = None
            validated_data['sale_start_date'] = None
            validated_data['sale_end_date'] = None
        
        return super().update(instance, validated_data)


class InventorySearchSerializer(serializers.Serializer):
    """Serializer for inventory search parameters"""
    
    query = serializers.CharField(required=False, help_text="Search query for medicine names")
    category = serializers.IntegerField(required=False, help_text="Category ID filter")
    form = serializers.CharField(required=False, help_text="Medicine form filter")
    prescription_required = serializers.BooleanField(required=False, help_text="Prescription requirement filter")
    min_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, help_text="Minimum price filter")
    max_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2, help_text="Maximum price filter")
    in_stock = serializers.BooleanField(required=False, help_text="Stock availability filter")
    pharmacy_id = serializers.IntegerField(required=False, help_text="Specific pharmacy filter")
    is_featured = serializers.BooleanField(required=False, help_text="Featured products filter")
    is_on_sale = serializers.BooleanField(required=False, help_text="Sale products filter")
    sort_by = serializers.ChoiceField(
        required=False,
        choices=[
            ('name', 'Name'),
            ('price_low', 'Price: Low to High'),
            ('price_high', 'Price: High to Low'),
            ('newest', 'Newest First'),
            ('popularity', 'Most Popular')
        ],
        default='name',
        help_text="Sort order"
    )
    page = serializers.IntegerField(required=False, min_value=1, default=1, help_text="Page number")
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20, help_text="Items per page")


class InventoryBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk inventory updates"""
    
    inventory_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of inventory item IDs to update"
    )
    
    updates = serializers.DictField(
        help_text="Fields to update for all selected items"
    )
    
    def validate(self, attrs):
        """Validate bulk update data"""
        if not attrs['inventory_ids']:
            raise ValidationError("At least one inventory item must be selected")
        
        if not attrs['updates']:
            raise ValidationError("Update fields must be provided")
        
        # Validate that updates contain valid fields
        allowed_fields = {
            'price', 'stock_quantity', 'is_available', 'is_featured',
            'is_on_sale', 'discount_percentage', 'sale_start_date', 'sale_end_date'
        }
        
        invalid_fields = set(attrs['updates'].keys()) - allowed_fields
        if invalid_fields:
            raise ValidationError(f"Invalid fields for bulk update: {', '.join(invalid_fields)}")
        
        return attrs


class InventoryStatsSerializer(serializers.Serializer):
    """Serializer for inventory statistics"""
    
    total_items = serializers.IntegerField(help_text="Total inventory items")
    available_items = serializers.IntegerField(help_text="Available items")
    out_of_stock_items = serializers.IntegerField(help_text="Out of stock items")
    low_stock_items = serializers.IntegerField(help_text="Low stock items")
    expiring_soon_items = serializers.IntegerField(help_text="Items expiring soon")
    on_sale_items = serializers.IntegerField(help_text="Items on sale")
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, help_text="Total inventory value")
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2, help_text="Average item price")
    category_distribution = serializers.DictField(help_text="Items per category")
    stock_alerts = serializers.ListField(help_text="Stock level alerts")
