from django.db import models
from django.utils.translation import gettext_lazy as _

# This app will use the Rider model from users app
# Add any delivery-specific models here that don't conflict with the main Rider model

class DeliveryZone(models.Model):
    """
    Delivery zones and coverage areas for riders.
    This is separate from the main Rider model to avoid conflicts.
    """
    
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the delivery zone')
    )
    
    description = models.TextField(
        blank=True,
        help_text=_('Description of the delivery zone')
    )
    
    # Geographic boundaries
    center_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        help_text=_('Center latitude of the delivery zone')
    )
    
    center_longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        help_text=_('Center longitude of the delivery zone')
    )
    
    radius_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text=_('Radius of the delivery zone in kilometers')
    )
    
    # Delivery settings
    base_delivery_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text=_('Base delivery fee for this zone')
    )
    
    estimated_delivery_time = models.PositiveIntegerField(
        help_text=_('Estimated delivery time in minutes')
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this delivery zone is active')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Delivery Zone')
        verbose_name_plural = _('Delivery Zones')
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.radius_km}km radius)"
    
    def is_point_in_zone(self, lat, lng):
        """
        Check if a given point is within this delivery zone.
        Uses simple distance calculation (can be improved with proper geospatial queries).
        """
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1 = radians(self.center_latitude), radians(self.center_longitude)
        lat2, lon2 = radians(lat), radians(lng)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth's radius in kilometers
        
        distance = c * r
        return distance <= float(self.radius_km)
