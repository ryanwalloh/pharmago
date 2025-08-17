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
