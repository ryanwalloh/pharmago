from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import User, ValidID, UserDocument, Customer, Pharmacy, Rider


@admin.register(ValidID)
class ValidIDAdmin(admin.ModelAdmin):
    """Admin interface for Valid ID types."""
    
    list_display = ['name', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['category', 'name']
    
    fieldsets = (
        ('ID Information', {
            'fields': ('name', 'category', 'description')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of system-critical ID types."""
        return False


@admin.register(UserDocument)
class UserDocumentAdmin(admin.ModelAdmin):
    """Admin interface for User Documents."""
    
    list_display = ['user', 'id_type', 'status', 'document_number', 'expiry_date', 'created_at']
    list_filter = ['status', 'id_type__category', 'created_at', 'expiry_date']
    search_fields = ['user__email', 'user__phone_number', 'document_number', 'id_type__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Document Information', {
            'fields': ('user', 'id_type', 'document_file', 'document_number', 'expiry_date')
        }),
        ('Verification Status', {
            'fields': ('status', 'admin_notes')
        }),
        ('Verification Details', {
            'fields': ('verified_by', 'verified_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user', 'id_type', 'verified_by')
    
    def get_readonly_fields(self, request, obj=None):
        """Make fields readonly after verification."""
        if obj and obj.status in ['approved', 'rejected']:
            return self.readonly_fields + ('user', 'id_type', 'document_file', 'document_number', 'expiry_date')
        return self.readonly_fields


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    """Admin interface for Customer profiles."""
    
    list_display = [
        'full_name', 'user_email', 'phone_number', 'age', 'is_senior_citizen', 
        'is_identity_verified', 'created_at'
    ]
    list_filter = [
        'is_senior_citizen', 'is_identity_verified', 'gender', 'preferred_payment_method',
        'marketing_consent', 'created_at'
    ]
    search_fields = [
        'first_name', 'last_name', 'middle_name', 'user__email', 'user__phone_number'
    ]
    readonly_fields = ['created_at', 'updated_at', 'age', 'is_senior_citizen']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('user', 'first_name', 'last_name', 'middle_name', 'date_of_birth', 'gender')
        }),
        ('Contact Information', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship')
        }),
        ('Senior Citizen Status', {
            'fields': ('is_senior_citizen', 'senior_citizen_id_number', 'senior_citizen_id_issued_by', 'senior_citizen_id_issue_date')
        }),
        ('Profile Media', {
            'fields': ('profile_picture',)
        }),
        ('Verification Status', {
            'fields': ('primary_id_uploaded', 'secondary_ids_uploaded', 'is_identity_verified')
        }),
        ('Preferences', {
            'fields': ('preferred_payment_method', 'marketing_consent')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user')
    
    def user_email(self, obj):
        """Display user email."""
        return obj.user.email or 'N/A'
    user_email.short_description = 'Email'
    
    def phone_number(self, obj):
        """Display user phone number."""
        return obj.user.phone_number or 'N/A'
    phone_number.short_description = 'Phone Number'
    
    def age(self, obj):
        """Display customer age."""
        return obj.age or 'N/A'
    age.short_description = 'Age'


@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    """Admin interface for Pharmacy profiles."""
    
    list_display = [
        'pharmacy_name', 'owner_full_name', 'business_permit_number', 'status', 
        'city', 'is_fully_verified', 'created_at'
    ]
    list_filter = [
        'status', 'city', 'province', 'is_fully_verified', 'created_at'
    ]
    search_fields = [
        'pharmacy_name', 'owner_first_name', 'owner_last_name', 'business_permit_number',
        'pharmacy_license_number', 'street_address'
    ]
    readonly_fields = ['created_at', 'updated_at', 'is_fully_verified', 'owner_full_name', 'full_address']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Business Information', {
            'fields': ('user', 'pharmacy_name', 'business_permit_number', 'business_permit_expiry',
                      'pharmacy_license_number', 'pharmacy_license_expiry')
        }),
        ('Owner Information', {
            'fields': ('owner_first_name', 'owner_last_name', 'owner_middle_name', 
                      'owner_date_of_birth', 'owner_gender')
        }),
        ('Contact Information', {
            'fields': ('business_phone', 'business_email')
        }),
        ('Location Information', {
            'fields': ('street_address', 'barangay', 'city', 'province', 'postal_code',
                      'latitude', 'longitude')
        }),
        ('Business Details', {
            'fields': ('operating_hours', 'services_offered', 'payment_methods_accepted')
        }),
        ('Verification Requirements', {
            'fields': ('owner_primary_id_uploaded', 'business_permit_uploaded',
                      'pharmacy_license_uploaded', 'storefront_image_uploaded', 'is_fully_verified')
        }),
        ('Status and Verification', {
            'fields': ('status', 'admin_notes', 'verified_by', 'verified_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user', 'verified_by')
    
    def owner_full_name(self, obj):
        """Display owner's full name."""
        return obj.owner_full_name
    owner_full_name.short_description = 'Owner Name'
    
    def full_address(self, obj):
        """Display full address."""
        return obj.full_address
    full_address.short_description = 'Full Address'


@admin.register(Rider)
class RiderAdmin(admin.ModelAdmin):
    """Admin interface for Rider profiles."""
    
    list_display = [
        'full_name', 'vehicle_type', 'plate_number', 'status', 'age', 
        'is_fully_verified', 'total_deliveries', 'average_rating', 'created_at'
    ]
    list_filter = [
        'status', 'vehicle_type', 'gender', 'is_fully_verified', 'created_at'
    ]
    search_fields = [
        'first_name', 'last_name', 'middle_name', 'user__email', 'user__phone_number',
        'plate_number', 'vehicle_brand', 'vehicle_model'
    ]
    readonly_fields = ['created_at', 'updated_at', 'age', 'is_fully_verified', 'full_name', 'vehicle_display_name']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('user', 'first_name', 'last_name', 'middle_name', 'date_of_birth', 'gender')
        }),
        ('Vehicle Information', {
            'fields': ('vehicle_type', 'vehicle_brand', 'vehicle_model', 'plate_number', 'vehicle_color')
        }),
        ('Contact Information', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship')
        }),
        ('Profile Media', {
            'fields': ('profile_picture',)
        }),
        ('Verification Requirements', {
            'fields': ('primary_id_uploaded', 'drivers_license_uploaded', 'psa_birth_certificate_uploaded', 'is_fully_verified')
        }),
        ('Status and Verification', {
            'fields': ('status', 'admin_notes', 'verified_by', 'verified_at')
        }),
        ('Performance Metrics', {
            'fields': ('total_deliveries', 'average_rating', 'total_earnings')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user', 'verified_by')
    
    def full_name(self, obj):
        """Display rider's full name."""
        return obj.full_name
    full_name.short_description = 'Full Name'
    
    def vehicle_display_name(self, obj):
        """Display vehicle information."""
        return obj.vehicle_display_name
    vehicle_display_name.short_description = 'Vehicle Information'
    
    def age(self, obj):
        """Display rider age."""
        return obj.age or 'N/A'
    age.short_description = 'Age'


# Custom User Admin
class CustomerInline(admin.StackedInline):
    """Inline admin for Customer profile."""
    model = Customer
    can_delete = False
    verbose_name_plural = 'Customer Profile'
    fk_name = 'user'


class PharmacyInline(admin.StackedInline):
    """Inline admin for Pharmacy profile."""
    model = Pharmacy
    can_delete = False
    verbose_name_plural = 'Pharmacy Profile'
    fk_name = 'user'


class RiderInline(admin.StackedInline):
    """Inline admin for Rider profile."""
    model = Rider
    can_delete = False
    verbose_name_plural = 'Rider Profile'
    fk_name = 'user'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin interface."""
    
    list_display = [
        'get_full_name', 'email', 'phone_number', 'role', 'status', 
        'is_verified', 'can_login', 'created_at'
    ]
    list_filter = [
        'role', 'status', 'is_email_verified', 'is_phone_verified', 
        'is_staff', 'is_superuser', 'created_at'
    ]
    search_fields = [
        'username', 'email', 'phone_number', 'first_name', 'last_name'
    ]
    ordering = ['-created_at']
    
    # Custom fieldsets
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Information', {'fields': ('first_name', 'last_name', 'email', 'phone_number')}),
        ('Role and Status', {'fields': ('role', 'status')}),
        ('Verification', {'fields': ('is_email_verified', 'is_phone_verified')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
        ('Security', {
            'fields': ('failed_login_attempts', 'last_failed_login', 'account_locked_until'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone_number', 'role', 'password1', 'password2'),
        }),
    )
    
    # Inline profiles based on user role
    def get_inlines(self, request, obj):
        """Return appropriate inlines based on user role."""
        if obj and obj.role == User.UserRole.CUSTOMER:
            return [CustomerInline]
        elif obj and obj.role == User.UserRole.PHARMACY:
            return [PharmacyInline]
        elif obj and obj.role == User.UserRole.RIDER:
            return [RiderInline]
        return []
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).prefetch_related('groups', 'user_permissions')
    
    def is_verified(self, obj):
        """Display verification status."""
        if obj.is_verified():
            return format_html('<span style="color: green;">✓ Verified</span>')
        return format_html('<span style="color: red;">✗ Not Verified</span>')
    is_verified.short_description = 'Verification Status'
    
    def can_login(self, obj):
        """Display login capability."""
        if obj.can_login():
            return format_html('<span style="color: green;">✓ Can Login</span>')
        return format_html('<span style="color: red;">✗ Cannot Login</span>')
    can_login.short_description = 'Login Status'
    
    def get_full_name(self, obj):
        """Display full name."""
        return obj.get_full_name()
    get_full_name.short_description = 'Full Name'
