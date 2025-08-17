from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from api.users.models import User


class Address(models.Model):
    """
    Customer delivery addresses with GPS coordinates.
    Supports multiple addresses per customer with labeling system.
    """
    
    class AddressLabel(models.TextChoices):
        HOME = 'home', _('Home')
        WORK = 'work', _('Work')
        PARENT_HOUSE = 'parent_house', _('Parent\'s House')
        OTHER = 'other', _('Other')
    
    customer = models.ForeignKey(
        'users.Customer',
        on_delete=models.CASCADE,
        related_name='addresses',
        help_text=_('Customer who owns this address')
    )
    
    label = models.CharField(
        max_length=50,
        choices=AddressLabel.choices,
        default=AddressLabel.HOME,
        help_text=_('Address label for identification')
    )
    
    is_default = models.BooleanField(
        default=False,
        help_text=_('Marks as default delivery address')
    )
    
    # Address details
    street_address = models.TextField(
        help_text=_('Full street address with landmarks')
    )
    
    barangay = models.CharField(
        max_length=100,
        help_text=_('Barangay information')
    )
    
    city = models.CharField(
        max_length=50,
        default='Iligan City',
        help_text=_('City name')
    )
    
    province = models.CharField(
        max_length=50,
        default='Lanao del Norte',
        help_text=_('Province name')
    )
    
    postal_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text=_('Postal/ZIP code')
    )
    
    # GPS coordinates
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90)
        ],
        help_text=_('GPS latitude coordinate')
    )
    
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180)
        ],
        help_text=_('GPS longitude coordinate')
    )
    
    # Additional details
    building_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Building or establishment name')
    )
    
    floor_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Floor number or level')
    )
    
    unit_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Unit or room number')
    )
    
    landmark = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Nearby landmark for easy identification')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Address')
        verbose_name_plural = _('Addresses')
        ordering = ['-is_default', '-created_at']
        db_table = 'address'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['customer'], name='idx_address_customer'),
            models.Index(fields=['is_default'], name='idx_address_default'),
            models.Index(fields=['city'], name='idx_address_city'),
            models.Index(fields=['barangay'], name='idx_address_barangay'),
        ]
        
        # Constraints
        constraints = [
            models.UniqueConstraint(
                fields=['customer', 'label'],
                name='unique_customer_address_label'
            ),
            models.CheckConstraint(
                check=models.Q(latitude__isnull=True) | 
                      (models.Q(latitude__gte=-90) & models.Q(latitude__lte=90)),
                name='valid_latitude'
            ),
            models.CheckConstraint(
                check=models.Q(longitude__isnull=True) | 
                      (models.Q(longitude__gte=-180) & models.Q(longitude__lte=180)),
                name='valid_longitude'
            ),
        ]
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.get_label_display()} ({self.city})"
    
    @property
    def full_address(self):
        """Return the complete formatted address."""
        parts = []
        
        if self.building_name:
            parts.append(self.building_name)
        
        if self.floor_number:
            parts.append(f"Floor {self.floor_number}")
        
        if self.unit_number:
            parts.append(f"Unit {self.unit_number}")
        
        parts.append(self.street_address)
        parts.append(self.barangay)
        parts.append(self.city)
        parts.append(self.province)
        
        if self.postal_code:
            parts.append(self.postal_code)
        
        return ", ".join(filter(None, parts))
    
    @property
    def coordinates(self):
        """Return coordinates as a tuple if both are available."""
        if self.latitude and self.longitude:
            return (float(self.latitude), float(self.longitude))
        return None
    
    def has_coordinates(self):
        """Check if address has GPS coordinates."""
        return bool(self.latitude and self.longitude)
    
    def get_distance_to(self, other_lat, other_lng):
        """Calculate distance to another location using Haversine formula."""
        if not self.has_coordinates():
            return None
        
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1 = radians(float(self.latitude)), radians(float(self.longitude))
        lat2, lon2 = radians(other_lat), radians(other_lng)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r
    
    def save(self, *args, **kwargs):
        """Override save to ensure only one default address per customer."""
        if self.is_default:
            # Set all other addresses for this customer to non-default
            Address.objects.filter(
                customer=self.customer,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate address data."""
        from django.core.exceptions import ValidationError
        
        # Ensure at least one address has coordinates for delivery
        if not self.has_coordinates() and self.is_default:
            raise ValidationError(
                _('Default address should have GPS coordinates for delivery.')
            )
        
        super().clean()
