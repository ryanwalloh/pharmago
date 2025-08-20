from django.db import models
from django.utils.translation import gettext_lazy as _

# This app will use the Pharmacy model from users app
# Add any pharmacy-specific models here that don't conflict with the main Pharmacy model

class PharmacyOperatingHours(models.Model):
    """
    Pharmacy operating hours and schedule management.
    This is separate from the main Pharmacy model to avoid conflicts.
    """
    
    pharmacy = models.ForeignKey(
        'users.Pharmacy',  # Reference the main Pharmacy model
        on_delete=models.CASCADE,
        related_name='pharmacy_operating_hours',
        help_text=_('Associated pharmacy')
    )
    
    day_of_week = models.CharField(
        max_length=10,
        choices=[
            ('monday', _('Monday')),
            ('tuesday', _('Tuesday')),
            ('wednesday', _('Wednesday')),
            ('thursday', _('Thursday')),
            ('friday', _('Friday')),
            ('saturday', _('Saturday')),
            ('sunday', _('Sunday')),
        ],
        help_text=_('Day of the week')
    )
    
    open_time = models.TimeField(
        help_text=_('Opening time')
    )
    
    close_time = models.TimeField(
        help_text=_('Closing time')
    )
    
    is_closed = models.BooleanField(
        default=False,
        help_text=_('Whether pharmacy is closed on this day')
    )
    
    class Meta:
        verbose_name = _('Pharmacy Operating Hours')
        verbose_name_plural = _('Pharmacy Operating Hours')
        unique_together = ['pharmacy', 'day_of_week']
        ordering = ['day_of_week']
    
    def __str__(self):
        if self.is_closed:
            return f"{self.pharmacy.pharmacy_name} - {self.get_day_of_week_display()} (Closed)"
        return f"{self.pharmacy.pharmacy_name} - {self.get_day_of_week_display()} ({self.open_time} - {self.close_time})"
