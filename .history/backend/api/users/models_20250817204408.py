from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Handles authentication and role management for the Pharmago platform.
    """
    
    class Role(models.TextChoices):
        CUSTOMER = 'customer', _('Customer')
        PHARMACY = 'pharmacy', _('Pharmacy')
        RIDER = 'rider', _('Rider')
        ADMIN = 'admin', _('Admin')
    
    # Override username field to be email
    username = models.CharField(
        max_length=150,
        unique=True,
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    
    email = models.EmailField(
        _('email address'),
        unique=True,
        help_text=_('Required. Enter a valid email address.')
    )
    
    role = models.CharField(
        max_length=50,
        choices=Role.choices,
        default=Role.CUSTOMER,
        help_text=_('User role in the system')
    )
    
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Contact phone number')
    )
    
    profile_picture = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Profile picture URL')
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text=_('Whether the user account has been verified')
    )
    
    date_verified = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When the account was verified')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-date_joined']
        db_table = 'user'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['role'], name='idx_user_role'),
            models.Index(fields=['email'], name='idx_user_email'),
            models.Index(fields=['username'], name='idx_user_username'),
            models.Index(fields=['is_verified'], name='idx_user_verified'),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = '%s %s' % (self.first_name, self.last_name)
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name
    
    @property
    def is_customer(self):
        """Check if user is a customer."""
        return self.role == self.Role.CUSTOMER
    
    @property
    def is_pharmacy(self):
        """Check if user is a pharmacy."""
        return self.role == self.Role.PHARMACY
    
    @property
    def is_rider(self):
        """Check if user is a rider."""
        return self.role == self.Role.RIDER
    
    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.role == self.Role.ADMIN
    
    def can_access_pharmacy_features(self):
        """Check if user can access pharmacy-specific features."""
        return self.role in [self.Role.PHARMACY, self.Role.ADMIN]
    
    def can_access_rider_features(self):
        """Check if user can access rider-specific features."""
        return self.role in [self.Role.RIDER, self.Role.ADMIN]
    
    def can_access_admin_features(self):
        """Check if user can access admin features."""
        return self.role == self.Role.ADMIN
