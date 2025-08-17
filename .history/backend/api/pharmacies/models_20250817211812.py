from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from api.users.models import User


class Pharmacy(models.Model):
    """
    Pharmacy business information and verification.
    Handles pharmacy registration, verification, and business details.
    """
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
        SUSPENDED = 'suspended', _('Suspended')
    
    class BusinessType(models.TextChoices):
        INDEPENDENT = 'independent', _('Independent Pharmacy')
        CHAIN = 'chain', _('Chain Pharmacy')
        HOSPITAL = 'hospital', _('Hospital Pharmacy')
        CLINIC = 'clinic', _('Medical Clinic Pharmacy')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='pharmacy_profile',
        help_text=_('Associated user account')
    )
    
    pharmacy_name = models.CharField(
        max_length=255,
        help_text=_('Business name')
    )
    
    business_type = models.CharField(
        max_length=50,
        choices=BusinessType.choices,
        default=BusinessType.INDEPENDENT,
        help_text=_('Type of pharmacy business')
    )
    
    # Owner information
    first_name = models.CharField(
        max_length=100,
        help_text=_('Owner\'s first name')
    )
    
    last_name = models.CharField(
        max_length=100,
        help_text=_('Owner\'s last name')
    )
    
    phone_number = models.CharField(
        max_length=20,
        help_text=_('Business contact number')
    )
    
    email = models.EmailField(
        help_text=_('Business email address')
    )
    
    # Verification documents
    valid_id = models.URLField(
        max_length=255,
        help_text=_('Owner\'s valid ID file path')
    )
    
    business_permit = models.URLField(
        max_length=255,
        help_text=_('Business permit file path')
    )
    
    license_document = models.URLField(
        max_length=255,
        help_text=_('Pharmacy license file path')
    )
    
    # Business address
    street_address = models.CharField(
        max_length=255,
        help_text=_('Business address')
    )
    
    city = models.CharField(
        max_length=50,
        default='Iligan City',
        help_text=_('City location')
    )
    
    province = models.CharField(
        max_length=50,
        default='Lanao del Norte',
        help_text=_('Province location')
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
    
    # Business status
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDING,
        help_text=_('Verification status')
    )
    
    date_status = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Status change timestamp')
    )
    
    status_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Notes about status change')
    )
    
    # Business details
    operating_hours = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Business operating hours')
    )
    
    services_offered = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Services offered by the pharmacy')
    )
    
    payment_methods = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Accepted payment methods')
    )
    
    # Additional information
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Pharmacy description')
    )
    
    website = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Pharmacy website')
    )
    
    social_media = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Social media links')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Pharmacy')
        verbose_name_plural = _('Pharmacies')
        ordering = ['-created_at']
        db_table = 'pharmacy'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['user'], name='idx_pharmacy_user'),
            models.Index(fields=['status'], name='idx_pharmacy_status'),
            models.Index(fields=['city'], name='idx_pharmacy_city'),
            models.Index(fields=['business_type'], name='idx_pharmacy_business_type'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(latitude__isnull=True) | 
                      (models.Q(latitude__gte=-90) & models.Q(latitude__lte=90)),
                name='valid_pharmacy_latitude'
            ),
            models.CheckConstraint(
                check=models.Q(longitude__isnull=True) | 
                      (models.Q(longitude__gte=-180) & models.Q(longitude__lte=180)),
                name='valid_pharmacy_longitude'
            ),
        ]
    
    def __str__(self):
        return f"{self.pharmacy_name} - {self.city}"
    
    @property
    def owner_full_name(self):
        """Return the owner's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_address(self):
        """Return the complete formatted address."""
        parts = [self.street_address, self.city, self.province]
        if self.postal_code:
            parts.append(self.postal_code)
        return ", ".join(parts)
    
    @property
    def coordinates(self):
        """Return coordinates as a tuple if both are available."""
        if self.latitude and self.longitude:
            return (float(self.latitude), float(self.longitude))
        return None
    
    @property
    def is_approved(self):
        """Check if pharmacy is approved."""
        return self.status == self.Status.APPROVED
    
    @property
    def is_active(self):
        """Check if pharmacy is active (approved and not suspended)."""
        return self.status == self.Status.APPROVED
    
    def get_operating_hours(self, day_of_week):
        """Get operating hours for a specific day."""
        if self.operating_hours and day_of_week in self.operating_hours:
            return self.operating_hours[day_of_week]
        return None
    
    def is_open_now(self):
        """Check if pharmacy is currently open."""
        if not self.operating_hours:
            return False
        
        from datetime import datetime
        now = datetime.now()
        day_name = now.strftime('%A').lower()
        
        hours = self.get_operating_hours(day_name)
        if not hours:
            return False
        
        current_time = now.strftime('%H:%M')
        return hours.get('open', '00:00') <= current_time <= hours.get('close', '23:59')
    
    def get_distance_to_customer(self, customer_lat, customer_lng):
        """Calculate distance to customer using Haversine formula."""
        if not self.coordinates:
            return None
        
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1 = radians(float(self.latitude)), radians(float(self.longitude))
        lat2, lon2 = radians(customer_lat), radians(customer_lng)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r
    
    def approve(self, notes=None):
        """Approve the pharmacy."""
        self.status = self.Status.APPROVED
        self.date_status = models.DateTimeField(auto_now=True)
        self.status_notes = notes
        self.save()
    
    def reject(self, notes):
        """Reject the pharmacy."""
        self.status = self.Status.REJECTED
        self.date_status = models.DateTimeField(auto_now=True)
        self.status_notes = notes
        self.save()
    
    def suspend(self, notes):
        """Suspend the pharmacy."""
        self.status = self.Status.SUSPENDED
        self.date_status = models.DateTimeField(auto_now=True)
        self.status_notes = notes
        self.save()
    
    def clean(self):
        """Validate pharmacy data."""
        if self.status == self.Status.APPROVED and not self.coordinates:
            raise ValidationError(
                _('Approved pharmacies must have GPS coordinates for delivery.')
            )
        
        super().clean()
