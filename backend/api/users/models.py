from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date
import re


class CustomUserManager(BaseUserManager):
    """
    Custom user manager for creating users with email/phone authentication.
    """
    
    def create_user(self, email=None, phone_number=None, password=None, **extra_fields):
        """
        Create and save a user with the given email/phone and password.
        """
        if not email and not phone_number:
            raise ValueError(_('Users must have either an email or phone number.'))
        
        if email:
            email = self.normalize_email(email)
        if phone_number:
            phone_number = self.normalize_phone(phone_number)
        
        user = self.model(
            email=email,
            phone_number=phone_number,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email=None, phone_number=None, password=None, **extra_fields):
        """
        Create and save a superuser with the given email/phone and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(email, phone_number, password, **extra_fields)
    
    def normalize_phone(self, phone_number):
        """
        Normalize phone number format.
        """
        # Remove all non-digit characters
        phone = re.sub(r'\D', '', phone_number)
        
        # Ensure it starts with country code (63 for Philippines)
        if phone.startswith('0'):
            phone = '63' + phone[1:]
        elif not phone.startswith('63'):
            phone = '63' + phone
        
        return phone


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Supports authentication via email or phone number.
    """
    
    class UserRole(models.TextChoices):
        CUSTOMER = 'customer', _('Customer')
        PHARMACY = 'pharmacy', _('Pharmacy')
        RIDER = 'rider', _('Rider')
        ADMIN = 'admin', _('Admin')
    
    class UserStatus(models.TextChoices):
        PENDING = 'pending', _('Pending Verification')
        ACTIVE = 'active', _('Active')
        SUSPENDED = 'suspended', _('Suspended')
        BANNED = 'banned', _('Banned')
    
    # Override username to make it optional
    username = models.CharField(
        max_length=150,
        unique=True,
        blank=True,
        null=True,
        help_text=_('Optional username. Users can login with email or phone.')
    )
    
    # Authentication fields
    email = models.EmailField(
        _('email address'),
        unique=True,
        blank=True,
        null=True,
        help_text=_('Email address for authentication and notifications.')
    )
    
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        help_text=_('Phone number for authentication and SMS notifications.')
    )
    
    # Role and status
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
        help_text=_('User role in the system.')
    )
    
    status = models.CharField(
        max_length=20,
        choices=UserStatus.choices,
        default=UserStatus.PENDING,
        help_text=_('User account status.')
    )
    
    # Verification fields
    is_email_verified = models.BooleanField(
        default=False,
        help_text=_('Whether email has been verified.')
    )
    
    is_phone_verified = models.BooleanField(
        default=False,
        help_text=_('Whether phone number has been verified.')
    )
    
    email_verification_token = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Token for email verification.')
    )
    
    phone_verification_code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text=_('SMS verification code.')
    )
    
    phone_verification_expires = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Expiration time for phone verification code.')
    )
    
    # Security fields
    failed_login_attempts = models.PositiveIntegerField(
        default=0,
        help_text=_('Number of failed login attempts.')
    )
    
    last_failed_login = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Timestamp of last failed login attempt.')
    )
    
    account_locked_until = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Account locked until this timestamp.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(blank=True, null=True)
    
    # Manager
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        db_table = 'users'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['email'], name='idx_user_email'),
            models.Index(fields=['phone_number'], name='idx_user_phone'),
            models.Index(fields=['role'], name='idx_user_role'),
            models.Index(fields=['status'], name='idx_user_status'),
            models.Index(fields=['created_at'], name='idx_user_created'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(email__isnull=False) | models.Q(phone_number__isnull=False),
                name='user_must_have_email_or_phone'
            ),
        ]
    
    def __str__(self):
        if self.email:
            return self.email
        return self.phone_number or str(self.id)
    
    def clean(self):
        """Validate user data."""
        super().clean()
        
        # Ensure at least one authentication method
        if not self.email and not self.phone_number:
            raise ValidationError(_('User must have either email or phone number.'))
        
        # Validate password strength for pharmacy and rider accounts
        if self.role in [self.UserRole.PHARMACY, self.UserRole.RIDER]:
            if self.password and not self._is_strong_password():
                raise ValidationError(_(
                    'Password must contain at least 8 characters, including uppercase, '
                    'lowercase, numbers, and special characters.'
                ))
    
    def _is_strong_password(self):
        """Check if password meets strength requirements."""
        if not self.password:
            return True
        
        # Check length
        if len(self.password) < 8:
            return False
        
        # Check for uppercase, lowercase, numbers, and special characters
        has_upper = re.search(r'[A-Z]', self.password)
        has_lower = re.search(r'[a-z]', self.password)
        has_digit = re.search(r'\d', self.password)
        has_special = re.search(r'[!@#$%^&*(),.?":{}|<>]', self.password)
        
        return all([has_upper, has_lower, has_digit, has_special])
    
    def get_username(self):
        """Return email or phone number for authentication."""
        return self.email or self.phone_number
    
    def is_verified(self):
        """Check if user is fully verified."""
        if self.email and not self.is_email_verified:
            return False
        if self.phone_number and not self.is_phone_verified:
            return False
        return True
    
    def can_login(self):
        """Check if user can attempt login."""
        if self.status != self.UserStatus.ACTIVE:
            return False
        
        if self.account_locked_until and timezone.now() < self.account_locked_until:
            return False
        
        return True
    
    def record_failed_login(self):
        """Record a failed login attempt."""
        self.failed_login_attempts += 1
        self.last_failed_login = timezone.now()
        
        # Lock account after 5 failed attempts for 30 minutes
        if self.failed_login_attempts >= 5:
            self.account_locked_until = timezone.now() + timezone.timedelta(minutes=30)
        
        self.save(update_fields=['failed_login_attempts', 'last_failed_login', 'account_locked_until'])
    
    def reset_failed_login_attempts(self):
        """Reset failed login attempts after successful login."""
        self.failed_login_attempts = 0
        self.account_locked_until = None
        self.save(update_fields=['failed_login_attempts', 'account_locked_until'])
    
    def get_full_name(self):
        """Return user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.get_username()


class ValidID(models.Model):
    """
    Valid ID types for user verification.
    """
    
    class IDType(models.TextChoices):
        # Primary IDs
        PHILSYS_ID = 'philsys_id', _('PhilSys ID (PhilID/ePhilID)')
        PASSPORT = 'passport', _('Passport')
        DRIVERS_LICENSE = 'drivers_license', _('Driver\'s License')
        UMID = 'umid', _('UMID (Unified Multi-Purpose ID)')
        PRC_ID = 'prc_id', _('PRC ID (Professional Regulation Commission)')
        POSTAL_ID = 'postal_id', _('Postal ID')
        VOTERS_ID = 'voters_id', _('Voter\'s ID')
        SSS_ID = 'sss_id', _('SSS ID')
        PHILHEALTH_ID = 'philhealth_id', _('PhilHealth ID')
        
        # Secondary IDs
        GSIS_ID = 'gsis_id', _('GSIS ID')
        SENIOR_CITIZEN_ID = 'senior_citizen_id', _('Senior Citizen ID')
        NBI_CLEARANCE = 'nbi_clearance', _('NBI Clearance')
        POLICE_CLEARANCE = 'police_clearance', _('Police Clearance')
        SCHOOL_ID = 'school_id', _('School ID')
        BARANGAY_ID = 'barangay_id', _('Barangay ID/Certification')
        TIN_ID = 'tin_id', _('TIN ID')
        PWD_ID = 'pwd_id', _('PWD ID')
        OWWA_ID = 'owwa_id', _('OWWA ID')
        SEAFARER_ID = 'seafarer_id', _('Seafarer\'s Book/ID')
        COMPANY_ID = 'company_id', _('Company ID')
    
    class IDCategory(models.TextChoices):
        PRIMARY = 'primary', _('Primary ID')
        SECONDARY = 'secondary', _('Secondary ID')
    
    name = models.CharField(
        max_length=100,
        choices=IDType.choices,
        unique=True,
        help_text=_('Type of valid ID.')
    )
    
    category = models.CharField(
        max_length=20,
        choices=IDCategory.choices,
        help_text=_('Category of the ID (Primary or Secondary).')
    )
    
    description = models.TextField(
        blank=True,
        help_text=_('Description of the ID type.')
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this ID type is currently accepted.')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Valid ID Type')
        verbose_name_plural = _('Valid ID Types')
        db_table = 'valid_id_types'
        ordering = ['category', 'name']
    
    def __str__(self):
        return self.get_name_display()
    
    def save(self, *args, **kwargs):
        """Set category based on ID type."""
        if not self.category:
            if self.name in [
                self.IDType.PHILSYS_ID, self.IDType.PASSPORT, self.IDType.DRIVERS_LICENSE,
                self.IDType.UMID, self.IDType.PRC_ID, self.IDType.POSTAL_ID,
                self.IDType.VOTERS_ID, self.IDType.SSS_ID, self.IDType.PHILHEALTH_ID
            ]:
                self.category = self.IDCategory.PRIMARY
            else:
                self.category = self.IDCategory.SECONDARY
        super().save(*args, **kwargs)


class UserDocument(models.Model):
    """
    User uploaded documents for verification.
    """
    
    class DocumentStatus(models.TextChoices):
        PENDING = 'pending', _('Pending Review')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
        EXPIRED = 'expired', _('Expired')
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text=_('User who uploaded this document.')
    )
    
    id_type = models.ForeignKey(
        ValidID,
        on_delete=models.CASCADE,
        help_text=_('Type of ID document.')
    )
    
    document_file = models.FileField(
        upload_to='user_documents/%Y/%m/%d/',
        help_text=_('Uploaded document file.')
    )
    
    document_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('ID number on the document.')
    )
    
    expiry_date = models.DateField(
        blank=True,
        null=True,
        help_text=_('Expiry date of the document.')
    )
    
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING,
        help_text=_('Verification status of the document.')
    )
    
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Admin notes for approval/rejection.')
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='verified_documents',
        help_text=_('Admin who verified this document.')
    )
    
    verified_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When the document was verified.')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('User Document')
        verbose_name_plural = _('User Documents')
        db_table = 'user_documents'
        ordering = ['-created_at']
        
        indexes = [
            models.Index(fields=['user'], name='idx_document_user'),
            models.Index(fields=['status'], name='idx_document_status'),
            models.Index(fields=['id_type'], name='idx_document_type'),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.id_type.name}"
    
    def clean(self):
        """Validate document data."""
        super().clean()
        
        # Check if document is expired
        if self.expiry_date and self.expiry_date < date.today():
            self.status = self.DocumentStatus.EXPIRED
    
    def is_expired(self):
        """Check if document is expired."""
        if not self.expiry_date:
            return False
        return self.expiry_date < date.today()


class Customer(models.Model):
    """
    Customer profile extending the base User model.
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile',
        help_text=_('Associated user account.')
    )
    
    # Personal Information
    first_name = models.CharField(
        max_length=100,
        help_text=_('Customer\'s first name.')
    )
    
    last_name = models.CharField(
        max_length=100,
        help_text=_('Customer\'s last name.')
    )
    
    middle_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Customer\'s middle name.')
    )
    
    date_of_birth = models.DateField(
        blank=True,
        null=True,
        help_text=_('Customer\'s date of birth.')
    )
    
    gender = models.CharField(
        max_length=10,
        choices=[
            ('male', _('Male')),
            ('female', _('Female')),
            ('other', _('Other')),
        ],
        default='male',
        help_text=_('Customer\'s gender.')
    )
    
    # Contact Information
    emergency_contact_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Emergency contact person name.')
    )
    
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Emergency contact phone number.')
    )
    
    emergency_contact_relationship = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Relationship to emergency contact.')
    )
    
    # Senior Citizen Features
    is_senior_citizen = models.BooleanField(
        default=False,
        help_text=_('Whether customer is a senior citizen (60+ years old).')
    )
    
    senior_citizen_id_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Senior citizen ID number.')
    )
    
    senior_citizen_id_issued_by = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Issuing authority for senior citizen ID.')
    )
    
    senior_citizen_id_issue_date = models.DateField(
        blank=True,
        null=True,
        help_text=_('Date when senior citizen ID was issued.')
    )
    
    # Profile Media
    profile_picture = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text=_('AWS S3 URL for profile picture.')
    )
    
    # Verification Requirements
    primary_id_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether primary valid ID has been uploaded.')
    )
    
    secondary_ids_uploaded = models.PositiveIntegerField(
        default=0,
        help_text=_('Number of secondary valid IDs uploaded.')
    )
    
    is_identity_verified = models.BooleanField(
        default=False,
        help_text=_('Whether customer identity has been verified.')
    )
    
    # Preferences
    preferred_payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cod', _('Cash on Delivery')),
            ('gcash', _('GCash')),
            ('card', _('Credit/Debit Card')),
            ('bank_transfer', _('Bank Transfer')),
        ],
        default='cod',
        help_text=_('Preferred payment method.')
    )
    
    marketing_consent = models.BooleanField(
        default=False,
        help_text=_('Whether customer consents to marketing communications.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Customer')
        verbose_name_plural = _('Customers')
        db_table = 'customers'
        
        indexes = [
            models.Index(fields=['user'], name='idx_customer_user'),
            models.Index(fields=['is_senior_citizen'], name='idx_customer_senior'),
            models.Index(fields=['is_identity_verified'], name='idx_customer_verified'),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    def clean(self):
        """Validate customer data."""
        super().clean()
        
        # Calculate age and set senior citizen status
        if self.date_of_birth:
            age = self._calculate_age()
            if age >= 60:
                self.is_senior_citizen = True
            else:
                self.is_senior_citizen = False
    
    def _calculate_age(self):
        """Calculate customer's age."""
        today = date.today()
        age = today.year - self.date_of_birth.year
        if today.month < self.date_of_birth.month or (
            today.month == self.date_of_birth.month and 
            today.day < self.date_of_birth.day
        ):
            age -= 1
        return age
    
    @property
    def age(self):
        """Return customer's current age."""
        if self.date_of_birth:
            return self._calculate_age()
        return None
    
    @property
    def full_name(self):
        """Return customer's full name."""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_eligible_for_senior_discount(self):
        """Check if customer is eligible for senior citizen discount."""
        return self.is_senior_citizen and self.is_identity_verified
    
    def get_senior_discount_percentage(self):
        """Return senior citizen discount percentage (20% under RA 9994)."""
        if self.is_eligible_for_senior_discount:
            return 20
        return 0
    
    def meets_verification_requirements(self):
        """Check if customer meets verification requirements."""
        # Must have either 1 primary ID or 2 secondary IDs
        if self.primary_id_uploaded:
            return True
        return self.secondary_ids_uploaded >= 2
    
    def can_be_verified(self):
        """Check if customer can be marked as verified."""
        return self.meets_verification_requirements() and self.user.is_verified()


class Pharmacy(models.Model):
    """
    Pharmacy profile extending the base User model.
    """
    
    class PharmacyStatus(models.TextChoices):
        PENDING = 'pending', _('Pending Verification')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
        SUSPENDED = 'suspended', _('Suspended')
        CLOSED = 'closed', _('Closed')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='pharmacy_profile',
        help_text=_('Associated user account.')
    )
    
    # Business Information
    pharmacy_name = models.CharField(
        max_length=255,
        help_text=_('Official business name of the pharmacy.')
    )
    
    business_permit_number = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Business permit number.')
    )
    
    business_permit_expiry = models.DateField(
        help_text=_('Expiry date of business permit.')
    )
    
    pharmacy_license_number = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Pharmacy license number.')
    )
    
    pharmacy_license_expiry = models.DateField(
        help_text=_('Expiry date of pharmacy license.')
    )
    
    # Owner Information
    owner_first_name = models.CharField(
        max_length=100,
        help_text=_('Pharmacy owner\'s first name.')
    )
    
    owner_last_name = models.CharField(
        max_length=100,
        help_text=_('Pharmacy owner\'s last name.')
    )
    
    owner_middle_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Pharmacy owner\'s middle name.')
    )
    
    owner_date_of_birth = models.DateField(
        help_text=_('Pharmacy owner\'s date of birth.')
    )
    
    owner_gender = models.CharField(
        max_length=10,
        choices=[
            ('male', _('Male')),
            ('female', _('Female')),
            ('other', _('Other')),
        ],
        help_text=_('Pharmacy owner\'s gender.')
    )
    
    # Contact Information
    business_phone = models.CharField(
        max_length=20,
        help_text=_('Business phone number.')
    )
    
    business_email = models.EmailField(
        help_text=_('Business email address.')
    )
    
    # Location Information
    street_address = models.CharField(
        max_length=255,
        help_text=_('Street address of the pharmacy.')
    )
    
    barangay = models.CharField(
        max_length=100,
        help_text=_('Barangay where pharmacy is located.')
    )
    
    city = models.CharField(
        max_length=50,
        default='Iligan City',
        help_text=_('City where pharmacy is located.')
    )
    
    province = models.CharField(
        max_length=50,
        default='Lanao del Norte',
        help_text=_('Province where pharmacy is located.')
    )
    
    postal_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text=_('Postal/ZIP code.')
    )
    
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        help_text=_('GPS latitude coordinate.')
    )
    
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True,
        help_text=_('GPS longitude coordinate.')
    )
    
    # Business Details
    operating_hours = models.JSONField(
        default=dict,
        help_text=_('Operating hours for each day of the week.')
    )
    
    services_offered = models.JSONField(
        default=list,
        help_text=_('List of services offered (delivery, consultation, etc.).')
    )
    
    payment_methods_accepted = models.JSONField(
        default=list,
        help_text=_('Payment methods accepted by the pharmacy.')
    )
    
    # Verification Requirements
    owner_primary_id_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether owner\'s primary valid ID has been uploaded.')
    )
    
    business_permit_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether business permit has been uploaded.')
    )
    
    pharmacy_license_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether pharmacy license has been uploaded.')
    )
    
    storefront_image_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether storefront image has been uploaded.')
    )
    
    is_fully_verified = models.BooleanField(
        default=False,
        help_text=_('Whether pharmacy has completed all verification requirements.')
    )
    
    # Status and Verification
    status = models.CharField(
        max_length=20,
        choices=PharmacyStatus.choices,
        default=PharmacyStatus.PENDING,
        help_text=_('Pharmacy verification status.')
    )
    
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Admin notes for approval/rejection.')
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='verified_pharmacies',
        help_text=_('Admin who verified this pharmacy.')
    )
    
    verified_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When the pharmacy was verified.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Pharmacy')
        verbose_name_plural = _('Pharmacies')
        db_table = 'pharmacies'
        
        indexes = [
            models.Index(fields=['user'], name='idx_pharmacy_user'),
            models.Index(fields=['status'], name='idx_pharmacy_status'),
            models.Index(fields=['city'], name='idx_pharmacy_city'),
            models.Index(fields=['latitude', 'longitude'], name='idx_pharmacy_location'),
        ]
    
    def __str__(self):
        return self.pharmacy_name
    
    def clean(self):
        """Validate pharmacy data."""
        super().clean()
        
        # Check if business permit is expired
        if self.business_permit_expiry and self.business_permit_expiry < date.today():
            raise ValidationError(_('Business permit has expired.'))
        
        # Check if pharmacy license is expired
        if self.pharmacy_license_expiry and self.pharmacy_license_expiry < date.today():
            raise ValidationError(_('Pharmacy license has expired.'))
    
    @property
    def owner_full_name(self):
        """Return owner's full name."""
        if self.owner_middle_name:
            return f"{self.owner_first_name} {self.owner_middle_name} {self.owner_last_name}"
        return f"{self.owner_first_name} {self.owner_last_name}"
    
    @property
    def full_address(self):
        """Return complete address."""
        address_parts = [
            self.street_address,
            self.barangay,
            self.city,
            self.province
        ]
        if self.postal_code:
            address_parts.append(self.postal_code)
        return ", ".join(filter(None, address_parts))
    
    @property
    def is_expired(self):
        """Check if any business documents are expired."""
        today = date.today()
        return (
            (self.business_permit_expiry and self.business_permit_expiry < today) or
            (self.pharmacy_license_expiry and self.pharmacy_license_expiry < today)
        )
    
    def meets_verification_requirements(self):
        """Check if pharmacy meets verification requirements."""
        return all([
            self.owner_primary_id_uploaded,
            self.business_permit_uploaded,
            self.pharmacy_license_uploaded,
            self.storefront_image_uploaded
        ])
    
    def can_be_verified(self):
        """Check if pharmacy can be marked as verified."""
        return (
            self.meets_verification_requirements() and 
            self.user.is_verified() and 
            not self.is_expired
        )


class Rider(models.Model):
    """
    Rider profile extending the base User model.
    """
    
    class RiderStatus(models.TextChoices):
        PENDING = 'pending', _('Pending Verification')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
        SUSPENDED = 'suspended', _('Suspended')
        INACTIVE = 'inactive', _('Inactive')
    
    class VehicleType(models.TextChoices):
        MOTORCYCLE = 'motorcycle', _('Motorcycle')
        BICYCLE = 'bicycle', _('Bicycle')
        CAR = 'car', _('Car')
        SCOOTER = 'scooter', _('Scooter')
        OTHER = 'other', _('Other')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='rider_profile',
        help_text=_('Associated user account.')
    )
    
    # Personal Information
    first_name = models.CharField(
        max_length=100,
        help_text=_('Rider\'s first name.')
    )
    
    last_name = models.CharField(
        max_length=100,
        help_text=_('Rider\'s last name.')
    )
    
    middle_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Rider\'s middle name.')
    )
    
    date_of_birth = models.DateField(
        help_text=_('Rider\'s date of birth.')
    )
    
    gender = models.CharField(
        max_length=10,
        choices=[
            ('male', _('Male')),
            ('female', _('Female')),
            ('other', _('Other')),
        ],
        help_text=_('Rider\'s gender.')
    )
    
    # Vehicle Information
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        help_text=_('Type of vehicle used for delivery.')
    )
    
    vehicle_brand = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Brand of the vehicle.')
    )
    
    vehicle_model = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Model of the vehicle.')
    )
    
    plate_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Vehicle plate number (if applicable).')
    )
    
    vehicle_color = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Color of the vehicle.')
    )
    
    # Contact Information
    emergency_contact_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Emergency contact person name.')
    )
    
    emergency_contact_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Emergency contact phone number.')
    )
    
    emergency_contact_relationship = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Relationship to emergency contact.')
    )
    
    # Profile Media
    profile_picture = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text=_('AWS S3 URL for profile picture.')
    )
    
    # Verification Requirements
    primary_id_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether primary valid ID has been uploaded.')
    )
    
    drivers_license_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether driver\'s license has been uploaded (for motorized vehicles).')
    )
    
    psa_birth_certificate_uploaded = models.BooleanField(
        default=False,
        help_text=_('Whether PSA birth certificate has been uploaded.')
    )
    
    is_fully_verified = models.BooleanField(
        default=False,
        help_text=_('Whether rider has completed all verification requirements.')
    )
    
    # Status and Verification
    status = models.CharField(
        max_length=20,
        choices=RiderStatus.choices,
        default=RiderStatus.PENDING,
        help_text=_('Rider verification status.')
    )
    
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Admin notes for approval/rejection.')
    )
    
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='verified_riders',
        help_text=_('Admin who verified this rider.')
    )
    
    verified_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When the rider was verified.')
    )
    
    # Performance Metrics
    total_deliveries = models.PositiveIntegerField(
        default=0,
        help_text=_('Total number of successful deliveries.')
    )
    
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        help_text=_('Average customer rating (0.00 to 5.00).')
    )
    
    total_earnings = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text=_('Total earnings from deliveries.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Rider')
        verbose_name_plural = _('Riders')
        db_table = 'riders'
        
        indexes = [
            models.Index(fields=['user'], name='idx_rider_user'),
            models.Index(fields=['status'], name='idx_rider_status'),
            models.Index(fields=['vehicle_type'], name='idx_rider_vehicle'),
            models.Index(fields=['average_rating'], name='idx_rider_rating'),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    def clean(self):
        """Validate rider data."""
        super().clean()
        
        # Check age requirement (must be 18+ to be a rider)
        if self.date_of_birth:
            age = self._calculate_age()
            if age < 18:
                raise ValidationError(_('Rider must be at least 18 years old.'))
        
        # Validate vehicle requirements
        if self.vehicle_type == self.VehicleType.MOTORCYCLE and not self.plate_number:
            raise ValidationError(_('Motorcycle riders must provide plate number.'))
    
    def _calculate_age(self):
        """Calculate rider's age."""
        today = date.today()
        age = today.year - self.date_of_birth.year
        if today.month < self.date_of_birth.month or (
            today.month == self.date_of_birth.month and 
            today.day < self.date_of_birth.day
        ):
            age -= 1
        return age
    
    @property
    def age(self):
        """Return rider's current age."""
        if self.date_of_birth:
            return self._calculate_age()
        return None
    
    @property
    def full_name(self):
        """Return rider's full name."""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def vehicle_display_name(self):
        """Return formatted vehicle information."""
        if self.vehicle_type == self.VehicleType.BICYCLE:
            return f"{self.get_vehicle_type_display()}"
        
        parts = [self.get_vehicle_type_display()]
        if self.vehicle_brand:
            parts.append(self.vehicle_brand)
        if self.vehicle_model:
            parts.append(self.vehicle_model)
        if self.plate_number:
            parts.append(f"({self.plate_number})")
        
        return " ".join(parts)
    
    def meets_verification_requirements(self):
        """Check if rider meets verification requirements."""
        base_requirements = [
            self.primary_id_uploaded,
            self.psa_birth_certificate_uploaded
        ]
        
        # Add vehicle-specific requirements
        if self.vehicle_type in [self.VehicleType.MOTORCYCLE, self.VehicleType.CAR, self.VehicleType.SCOOTER]:
            base_requirements.append(self.drivers_license_uploaded)
        
        return all(base_requirements)
    
    def can_be_verified(self):
        """Check if rider can be marked as verified."""
        return (
            self.meets_verification_requirements() and 
            self.user.is_verified() and
            self.age >= 18
        )
    
    def update_performance_metrics(self, delivery_rating=None, delivery_earnings=None):
        """Update rider performance metrics."""
        if delivery_rating is not None:
            # Calculate new average rating
            total_rating = self.average_rating * self.total_deliveries + delivery_rating
            self.total_deliveries += 1
            self.average_rating = total_rating / self.total_deliveries
        
        if delivery_earnings is not None:
            self.total_earnings += delivery_earnings
        
        self.save()


# Signal handlers for automatic profile creation
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically create profile when user is created.
    """
    if created:
        if instance.role == User.UserRole.CUSTOMER:
            Customer.objects.create(user=instance)
        elif instance.role == User.UserRole.PHARMACY:
            Pharmacy.objects.create(user=instance)
        elif instance.role == User.UserRole.RIDER:
            Rider.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Automatically save profile when user is saved.
    """
    if instance.role == User.UserRole.CUSTOMER and hasattr(instance, 'customer_profile'):
        instance.customer_profile.save()
    elif instance.role == User.UserRole.PHARMACY and hasattr(instance, 'pharmacy_profile'):
        instance.pharmacy_profile.save()
    elif instance.role == User.UserRole.RIDER and hasattr(instance, 'rider_profile'):
        instance.rider_profile.save()


# Data migration for existing valid ID types
def create_valid_id_types():
    """
    Create default valid ID types if they don't exist.
    """
    # Primary Valid IDs
    ValidID.objects.get_or_create(
        name=ValidID.IDType.PHILSYS_ID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'The national ID issued by the Philippine Statistics Authority.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.PASSPORT,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Issued by the Department of Foreign Affairs (DFA).'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.DRIVERS_LICENSE,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Issued by the Land Transportation Office (LTO).'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.UMID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Unified Multi-Purpose ID issued by SSS, GSIS, PhilHealth, and Pag-IBIG.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.PRC_ID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Professional Regulation Commission ID issued to licensed professionals.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.POSTAL_ID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Issued by the Philippine Postal Corporation.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.VOTERS_ID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Issued by the Commission on Elections (COMELEC).'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.SSS_ID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Social Security System ID issued by SSS.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.PHILHEALTH_ID,
        defaults={
            'category': ValidID.IDCategory.PRIMARY,
            'description': 'Issued by the Philippine Health Insurance Corporation.'
        }
    )
    
    # Secondary Valid IDs
    ValidID.objects.get_or_create(
        name=ValidID.IDType.GSIS_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Government Service Insurance System ID issued by GSIS.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.SENIOR_CITIZEN_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Issued by the local government unit for senior citizens.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.NBI_CLEARANCE,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Issued by the National Bureau of Investigation.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.POLICE_CLEARANCE,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Issued by the local police station.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.SCHOOL_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Issued by schools and universities.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.BARANGAY_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Barangay ID/Certification issued by the local barangay.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.TIN_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Tax Identification Number ID issued by the Bureau of Internal Revenue.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.PWD_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Person with Disability ID issued by the local government unit.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.OWWA_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Overseas Workers Welfare Administration ID issued by OWWA.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.SEAFARER_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Seafarer\'s Book/ID issued by MARINA.'
        }
    )
    ValidID.objects.get_or_create(
        name=ValidID.IDType.COMPANY_ID,
        defaults={
            'category': ValidID.IDCategory.SECONDARY,
            'description': 'Company ID issued by private companies.'
        }
    )
