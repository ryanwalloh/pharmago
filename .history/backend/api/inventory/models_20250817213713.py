from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator


class MedicineCategory(models.Model):
    """
    Medicine categories for better organization.
    Supports hierarchical categories with parent-child relationships.
    """
    
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text=_('Category name (e.g., "Pain Relief", "Antibiotics")')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Category description')
    )
    
    parent_category = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='subcategories',
        help_text=_('Parent category for subcategories')
    )
    
    icon = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Icon class or identifier for UI display')
    )
    
    color = models.CharField(
        max_length=7,
        blank=True,
        null=True,
        help_text=_('Hex color code for UI display')
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_('Category availability')
    )
    
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text=_('Sort order for display')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Medicine Category')
        verbose_name_plural = _('Medicine Categories')
        ordering = ['sort_order', 'name']
        db_table = 'medicine_category'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['name'], name='idx_category_name'),
            models.Index(fields=['parent_category'], name='idx_category_parent'),
            models.Index(fields=['is_active'], name='idx_category_active'),
            models.Index(fields=['sort_order'], name='idx_category_sort'),
        ]
    
    def __str__(self):
        if self.parent_category:
            return f"{self.parent_category.name} > {self.name}"
        return self.name
    
    @property
    def full_path(self):
        """Return the full category path."""
        if self.parent_category:
            return f"{self.parent_category.full_path} > {self.name}"
        return self.name
    
    @property
    def level(self):
        """Return the category level (0 for root, 1 for first level, etc.)."""
        level = 0
        parent = self.parent_category
        while parent:
            level += 1
            parent = parent.parent_category
        return level
    
    @property
    def is_root(self):
        """Check if this is a root category."""
        return self.parent_category is None
    
    @property
    def has_children(self):
        """Check if this category has subcategories."""
        return self.subcategories.exists()
    
    def get_all_children(self):
        """Get all subcategories recursively."""
        children = []
        for subcategory in self.subcategories.all():
            children.append(subcategory)
            children.extend(subcategory.get_all_children())
        return children
    
    def get_all_parents(self):
        """Get all parent categories."""
        parents = []
        parent = self.parent_category
        while parent:
            parents.append(parent)
            parent = parent.parent_category
        return parents


class MedicineCatalog(models.Model):
    """
    Master catalog of all available medicines (pre-defined dataset).
    Pharmacies can select from this catalog to add to their inventory.
    """
    
    class MedicineForm(models.TextChoices):
        TABLET = 'tablet', _('Tablet')
        SYRUP = 'syrup', _('Syrup')
        CREAM = 'cream', _('Cream')
        INJECTION = 'injection', _('Injection')
        CAPSULE = 'capsule', _('Capsule')
        DROPS = 'drops', _('Drops')
        INHALER = 'inhaler', _('Inhaler')
        OINTMENT = 'ointment', _('Ointment')
        GEL = 'gel', _('Gel')
        PATCH = 'patch', _('Patch')
        SUSPENSION = 'suspension', _('Suspension')
        SOLUTION = 'solution', _('Solution')
    
    category = models.ForeignKey(
        MedicineCategory,
        on_delete=models.CASCADE,
        related_name='medicines',
        help_text=_('Medicine category')
    )
    
    name = models.CharField(
        max_length=255,
        help_text=_('Medicine name (e.g., "Paracetamol")')
    )
    
    generic_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Generic/chemical name')
    )
    
    brand_names = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Common brand names for this medicine')
    )
    
    form = models.CharField(
        max_length=100,
        choices=MedicineForm.choices,
        help_text=_('Medicine form')
    )
    
    dosage = models.CharField(
        max_length=100,
        help_text=_('Dosage strength (e.g., "500mg")')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Medicine description and usage')
    )
    
    active_ingredients = models.JSONField(
        blank=True,
        null=True,
        help_text=_('List of active ingredients')
    )
    
    prescription_required = models.BooleanField(
        default=False,
        help_text=_('Whether prescription is required')
    )
    
    controlled_substance = models.BooleanField(
        default=False,
        help_text=_('Whether this is a controlled substance')
    )
    
    # Medical information
    therapeutic_class = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Therapeutic class of the medicine')
    )
    
    side_effects = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Common side effects')
    )
    
    contraindications = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Contraindications and warnings')
    )
    
    interactions = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Drug interactions')
    )
    
    # Storage and handling
    storage_conditions = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Storage conditions (e.g., "Store in a cool, dry place")')
    )
    
    shelf_life = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Shelf life information')
    )
    
    # Images and media
    image = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Default medicine image URL')
    )
    
    images = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Additional medicine images')
    )
    
    # Regulatory information
    fda_approval = models.BooleanField(
        default=True,
        help_text=_('Whether FDA approved')
    )
    
    fda_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('FDA registration number')
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text=_('Medicine availability in catalog')
    )
    
    is_featured = models.BooleanField(
        default=False,
        help_text=_('Whether to feature this medicine')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Medicine Catalog')
        verbose_name_plural = _('Medicine Catalog')
        ordering = ['name']
        db_table = 'medicine_catalog'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['name'], name='idx_medicine_name'),
            models.Index(fields=['category'], name='idx_medicine_category'),
            models.Index(fields=['form'], name='idx_medicine_form'),
            models.Index(fields=['is_active'], name='idx_medicine_active'),
            models.Index(fields=['prescription_required'], name='idx_medicine_prescription'),
        ]
        
        # Constraints
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'form', 'dosage'],
                name='unique_medicine_combination'
            ),
        ]
    
    def __str__(self):
        return f"{self.name} {self.dosage} {self.get_form_display()}"
    
    @property
    def display_name(self):
        """Return the display name with dosage and form."""
        return f"{self.name} {self.dosage} {self.get_form_display()}"
    
    @property
    def is_controlled(self):
        """Check if this is a controlled substance."""
        return self.controlled_substance
    
    @property
    def requires_prescription(self):
        """Check if prescription is required."""
        return self.prescription_required
    
    def get_brand_names_display(self):
        """Return formatted brand names."""
        if self.brand_names:
            return ", ".join(self.brand_names)
        return self.name
    
    def get_side_effects_display(self):
        """Return formatted side effects."""
        if self.side_effects:
            return ", ".join(self.side_effects)
        return "None reported"
    
    def get_contraindications_display(self):
        """Return formatted contraindications."""
        if self.contraindications:
            return ", ".join(self.contraindications)
        return "None reported"
    
    def get_interactions_display(self):
        """Return formatted drug interactions."""
        if self.interactions:
            return ", ".join(self.interactions)
        return "None reported"
    
    def get_active_ingredients_display(self):
        """Return formatted active ingredients."""
        if self.active_ingredients:
            return ", ".join(self.active_ingredients)
        return "Not specified"
    
    def get_storage_info(self):
        """Get storage information."""
        if self.storage_conditions:
            return self.storage_conditions
        return "Store according to package instructions"
    
    def is_available_for_pharmacy(self, pharmacy):
        """Check if medicine is available for a specific pharmacy."""
        from .pharmacy_inventory import PharmacyInventory
        
        return PharmacyInventory.objects.filter(
            pharmacy=pharmacy,
            medicine=self,
            is_available=True
        ).exists()
    
    def get_pharmacy_prices(self):
        """Get all pharmacy prices for this medicine."""
        from .pharmacy_inventory import PharmacyInventory
        
        return PharmacyInventory.objects.filter(
            medicine=self,
            is_available=True
        ).values('pharmacy__pharmacy_name', 'price')
    
    def get_average_price(self):
        """Get average price across all pharmacies."""
        from .pharmacy_inventory import PharmacyInventory
        
        inventory = PharmacyInventory.objects.filter(
            medicine=self,
            is_available=True
        )
        
        if inventory.exists():
            return inventory.aggregate(
                avg_price=models.Avg('price')
            )['avg_price']
        return None

class PharmacyInventory(models.Model):
    """
    Pharmacy's medicine inventory and pricing.
    Allows pharmacies to select from master catalog or create custom products.
    """
    
    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.CASCADE,
        related_name='inventory_items',
        help_text=_('Pharmacy that owns this inventory item')
    )
    
    # Link to master catalog (NULL for custom products)
    medicine = models.ForeignKey(
        MedicineCatalog,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='pharmacy_inventories',
        help_text=_('Reference to MedicineCatalog (NULL for custom products)')
    )
    
    category = models.ForeignKey(
        MedicineCategory,
        on_delete=models.CASCADE,
        related_name='pharmacy_inventories',
        help_text=_('Medicine category')
    )
    
    # Product information (inherited from catalog or custom)
    name = models.CharField(
        max_length=255,
        help_text=_('Medicine name (inherited from catalog or custom)')
    )
    
    form = models.CharField(
        max_length=100,
        choices=MedicineCatalog.MedicineForm.choices,
        help_text=_('Medicine form')
    )
    
    dosage = models.CharField(
        max_length=100,
        help_text=_('Dosage strength')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Medicine description')
    )
    
    prescription_required = models.BooleanField(
        default=False,
        help_text=_('Whether prescription is required')
    )
    
    # Custom fields for pharmacy-specific information
    custom_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Custom name if different from catalog')
    )
    
    custom_description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Custom description if different from catalog')
    )
    
    # Pricing and inventory
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_('Selling price')
    )
    
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        help_text=_('Original price before discount')
    )
    
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        help_text=_('Cost price for profit calculation')
    )
    
    stock_quantity = models.PositiveIntegerField(
        default=0,
        help_text=_('Available stock quantity')
    )
    
    min_stock_level = models.PositiveIntegerField(
        default=10,
        help_text=_('Minimum stock level for reorder alerts')
    )
    
    max_stock_level = models.PositiveIntegerField(
        default=1000,
        help_text=_('Maximum stock level')
    )
    
    # Status and availability
    is_available = models.BooleanField(
        default=True,
        help_text=_('Product availability status')
    )
    
    is_featured = models.BooleanField(
        default=False,
        help_text=_('Whether to feature this product')
    )
    
    is_on_sale = models.BooleanField(
        default=False,
        help_text=_('Whether product is on sale')
    )
    
    # Sale and discount information
    sale_start_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Sale start date')
    )
    
    sale_end_date = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Sale end date')
    )
    
    discount_percentage = models.PositiveIntegerField(
        blank=True,
        null=True,
        validators=[MaxValueValidator(100)],
        help_text=_('Discount percentage (0-100)')
    )
    
    # Images and media
    image = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Product image URL')
    )
    
    images = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Additional product images')
    )
    
    # Product details
    manufacturer = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Medicine manufacturer')
    )
    
    batch_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Batch/lot number')
    )
    
    expiry_date = models.DateField(
        blank=True,
        null=True,
        help_text=_('Expiry date')
    )
    
    # Additional information
    tags = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Product tags for search and categorization')
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Pharmacy-specific notes')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Pharmacy Inventory')
        verbose_name_plural = _('Pharmacy Inventory')
        ordering = ['-created_at']
        db_table = 'pharmacy_inventory'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['pharmacy'], name='idx_inventory_pharmacy'),
            models.Index(fields=['medicine'], name='idx_inventory_medicine'),
            models.Index(fields=['category'], name='idx_inventory_category'),
            models.Index(fields=['is_available'], name='idx_inventory_available'),
            models.Index(fields=['price'], name='idx_inventory_price'),
            models.Index(fields=['is_on_sale'], name='idx_inventory_sale'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gte=0),
                name='valid_inventory_price'
            ),
            models.CheckConstraint(
                check=models.Q(stock_quantity__gte=0),
                name='valid_stock_quantity'
            ),
            models.CheckConstraint(
                check=models.Q(discount_percentage__isnull=True) | 
                      (models.Q(discount_percentage__gte=0) & models.Q(discount_percentage__lte=100)),
                name='valid_discount_percentage'
            ),
        ]
    
    def __str__(self):
        if self.medicine:
            return f"{self.pharmacy.pharmacy_name} - {self.medicine.display_name}"
        return f"{self.pharmacy.pharmacy_name} - {self.name} {self.dosage}"
    
    @property
    def display_name(self):
        """Return the display name."""
        if self.custom_name:
            return self.custom_name
        elif self.medicine:
            return self.medicine.display_name
        else:
            return f"{self.name} {self.dosage} {self.get_form_display()}"
    
    @property
    def display_description(self):
        """Return the display description."""
        if self.custom_description:
            return self.custom_description
        elif self.medicine:
            return self.medicine.description
        else:
            return self.description
    
    @property
    def is_custom_product(self):
        """Check if this is a custom product."""
        return self.medicine is None
    
    @property
    def is_from_catalog(self):
        """Check if this product is from the master catalog."""
        return self.medicine is not None
    
    @property
    def current_price(self):
        """Return the current price (with discount if applicable)."""
        if self.is_on_sale and self.discount_percentage:
            discount_amount = (self.price * self.discount_percentage) / 100
            return self.price - discount_amount
        return self.price
    
    @property
    def discount_amount(self):
        """Return the discount amount."""
        if self.is_on_sale and self.discount_percentage:
            return (self.price * self.discount_percentage) / 100
        return 0
    
    @property
    def profit_margin(self):
        """Calculate profit margin if cost price is available."""
        if self.cost_price and self.cost_price > 0:
            return ((self.price - self.cost_price) / self.cost_price) * 100
        return None
    
    @property
    def stock_status(self):
        """Return stock status."""
        if self.stock_quantity == 0:
            return 'out_of_stock'
        elif self.stock_quantity <= self.min_stock_level:
            return 'low_stock'
        elif self.stock_quantity >= self.max_stock_level:
            return 'overstocked'
        else:
            return 'normal'
    
    @property
    def is_expiring_soon(self):
        """Check if product is expiring soon (within 30 days)."""
        if not self.expiry_date:
            return False
        
        from datetime import date, timedelta
        today = date.today()
        thirty_days_from_now = today + timedelta(days=30)
        
        return self.expiry_date <= thirty_days_from_now
    
    def get_display_price(self):
        """Get formatted display price."""
        if self.is_on_sale and self.discount_percentage:
            return {
                'current_price': self.current_price,
                'original_price': self.price,
                'discount_percentage': self.discount_percentage,
                'discount_amount': self.discount_amount
            }
        return {
            'current_price': self.price,
            'original_price': None,
            'discount_percentage': None,
            'discount_amount': 0
        }
    
    def update_stock(self, quantity_change, operation='add'):
        """Update stock quantity."""
        if operation == 'add':
            self.stock_quantity += quantity_change
        elif operation == 'subtract':
            if self.stock_quantity < quantity_change:
                raise ValidationError(_('Insufficient stock'))
            self.stock_quantity -= quantity_change
        elif operation == 'set':
            self.stock_quantity = quantity_change
        
        self.save()
    
    def check_stock_alert(self):
        """Check if stock level needs attention."""
        if self.stock_quantity <= self.min_stock_level:
            return {
                'type': 'low_stock',
                'message': f'Stock level is low: {self.stock_quantity} remaining',
                'severity': 'warning'
            }
        elif self.stock_quantity == 0:
            return {
                'type': 'out_of_stock',
                'message': 'Product is out of stock',
                'severity': 'critical'
            }
        return None
    
    def start_sale(self, discount_percentage, start_date, end_date):
        """Start a sale for this product."""
        self.is_on_sale = True
        self.discount_percentage = discount_percentage
        self.sale_start_date = start_date
        self.sale_end_date = end_date
        self.save()
    
    def end_sale(self):
        """End the sale for this product."""
        self.is_on_sale = False
        self.discount_percentage = None
        self.sale_start_date = None
        self.sale_end_date = None
        self.save()
    
    def clean(self):
        """Validate inventory data."""
        # Ensure custom products have required fields
        if self.is_custom_product:
            if not self.name or not self.form or not self.dosage:
                raise ValidationError(
                    _('Custom products must have name, form, and dosage.')
                )
        
        # Validate sale dates
        if self.is_on_sale:
            if not self.sale_start_date or not self.sale_end_date:
                raise ValidationError(
                    _('Sale products must have start and end dates.')
                )
            if self.sale_start_date >= self.sale_end_date:
                raise ValidationError(
                    _('Sale start date must be before end date.')
                )
        
        # Validate discount percentage
        if self.discount_percentage and (self.discount_percentage < 0 or self.discount_percentage > 100):
            raise ValidationError(
                _('Discount percentage must be between 0 and 100.')
            )
        
        super().clean()
    
    def save(self, *args, **kwargs):
        """Override save to set original price if not set."""
        if not self.original_price:
            self.original_price = self.price
        
        # Inherit catalog information if medicine is set
        if self.medicine and not self.custom_name:
            self.name = self.medicine.name
            self.form = self.medicine.form
            self.dosage = self.medicine.dosage
            self.description = self.medicine.description
            self.prescription_required = self.medicine.prescription_required
            self.category = self.medicine.category
        
        super().save(*args, **kwargs)
