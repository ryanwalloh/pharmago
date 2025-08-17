from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import User


class Customer(models.Model):
    """
    Customer profile information extending the base User model.
    Handles customer-specific data like senior status and valid ID.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile',
        help_text=_('Associated user account')
    )
    
    first_name = models.CharField(
        max_length=100,
        help_text=_('Customer first name')
    )
    
    last_name = models.CharField(
        max_length=100,
        help_text=_('Customer last name')
    )
    
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        help_text=_('Contact phone number')
    )
    
    profile_picture = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Profile picture URL')
    )
    
    valid_id = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Government ID file path')
    )
    
    is_senior = models.BooleanField(
        default=False,
        help_text=_('Whether customer is a senior citizen')
    )
    
    date_of_birth = models.DateField(
        blank=True,
        null=True,
        help_text=_('Customer date of birth')
    )
    
    # Senior citizen specific fields
    senior_citizen_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Senior citizen ID number')
    )
    
    emergency_contact_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Emergency contact person name')
    )
    
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Emergency contact phone number')
    )
    
    # Preferences
    preferred_delivery_time = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        choices=[
            ('morning', _('Morning (8AM-12PM)')),
            ('afternoon', _('Afternoon (12PM-5PM)')),
            ('evening', _('Evening (5PM-9PM)')),
            ('anytime', _('Anytime')),
        ],
        default='anytime',
        help_text=_('Preferred delivery time slot')
    )
    
    delivery_instructions = models.TextField(
        blank=True,
        null=True,
        help_text=_('Special delivery instructions')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Customer')
        verbose_name_plural = _('Customers')
        ordering = ['-created_at']
        db_table = 'customer'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['user'], name='idx_customer_user'),
            models.Index(fields=['phone_number'], name='idx_customer_phone'),
            models.Index(fields=['is_senior'], name='idx_customer_senior'),
            models.Index(fields=['created_at'], name='idx_customer_created'),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.email})"
    
    @property
    def full_name(self):
        """Return the full name of the customer."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        """Calculate customer age from date of birth."""
        if self.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None
    
    @property
    def is_eligible_for_senior_discount(self):
        """Check if customer is eligible for senior citizen discount."""
        if self.age and self.age >= 60:
            return True
        return self.is_senior
    
    def get_delivery_preferences(self):
        """Get customer delivery preferences."""
        return {
            'preferred_time': self.preferred_delivery_time,
            'instructions': self.delivery_instructions,
            'is_senior': self.is_senior,
        }
    
    def save(self, *args, **kwargs):
        """Override save to automatically set senior status based on age."""
        if self.date_of_birth and not self.is_senior:
            if self.age and self.age >= 60:
                self.is_senior = True
        super().save(*args, **kwargs)
