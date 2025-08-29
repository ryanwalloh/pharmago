from rest_framework import permissions
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist

User = get_user_model()


class BaseObjectPermission(permissions.BasePermission):
    """
    Base class for object-level permissions with enhanced security.
    """
    
    def has_permission(self, request, view):
        """
        Check if user has permission to access the view.
        """
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Require authentication for write operations
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission to access the specific object.
        """
        # Admin users can access everything
        if request.user.is_staff:
            return True
        
        # Check if user is active
        if not request.user.is_active:
            return False
        
        # Check if user is verified (for sensitive operations)
        if request.method not in permissions.SAFE_METHODS:
            if not self._is_user_verified(request.user):
                return False
        
        return self._check_object_permission(request, view, obj)
    
    def _is_user_verified(self, user):
        """
        Check if user is verified based on their role.
        """
        if user.role == User.UserRole.CUSTOMER:
            return user.is_email_verified or user.is_phone_verified
        elif user.role == User.UserRole.PHARMACY:
            return user.is_email_verified and user.is_phone_verified
        elif user.role == User.UserRole.RIDER:
            return user.is_email_verified and user.is_phone_verified
        elif user.role == User.UserRole.ADMIN:
            return True
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        """
        Override this method in subclasses to implement specific permission logic.
        """
        raise NotImplementedError("Subclasses must implement _check_object_permission")


class IsOwnerOrReadOnly(BaseObjectPermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Enhanced with verification checks.
    """
    
    def _check_object_permission(self, request, view, obj):
        # Read permissions are allowed for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        elif hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        elif hasattr(obj, 'rider'):
            return obj.rider.user == request.user
        
        # For objects without user field, check if it's the user themselves
        return obj == request.user


class IsPharmacyOwner(BaseObjectPermission):
    """
    Custom permission to only allow pharmacy owners to access their pharmacy.
    Enhanced with verification and business logic checks.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        if not request.user.is_authenticated:
            return False
        
        if request.user.role != User.UserRole.PHARMACY:
            return False
        
        # For write operations, require verification
        if request.method not in permissions.SAFE_METHODS:
            return (request.user.is_email_verified and 
                   request.user.is_phone_verified and
                   request.user.status == User.UserStatus.ACTIVE)
        
        return True
    
    def _check_object_permission(self, request, view, obj):
        # Pharmacy owners can only access their own pharmacy
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        
        return False


class IsRiderOwner(BaseObjectPermission):
    """
    Custom permission to only allow riders to access their own profile.
    Enhanced with verification checks.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has rider role
        if not request.user.is_authenticated:
            return False
        
        if request.user.role != User.UserRole.RIDER:
            return False
        
        # For write operations, require verification
        if request.method not in permissions.SAFE_METHODS:
            return (request.user.is_email_verified and 
                   request.user.is_phone_verified and
                   request.user.status == User.UserStatus.ACTIVE)
        
        return True
    
    def _check_object_permission(self, request, view, obj):
        # Riders can only access their own profile
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'rider'):
            return obj.rider.user == request.user
        
        return False


class IsCustomerOwner(BaseObjectPermission):
    """
    Custom permission to only allow customers to access their own profile.
    Enhanced with verification checks.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has customer role
        if not request.user.is_authenticated:
            return False
        
        if request.user.role != User.UserRole.CUSTOMER:
            return False
        
        # For write operations, require at least one verification method
        if request.method not in permissions.SAFE_METHODS:
            return ((request.user.is_email_verified or request.user.is_phone_verified) and
                   request.user.status == User.UserStatus.ACTIVE)
        
        return True
    
    def _check_object_permission(self, request, view, obj):
        # Customers can only access their own profile
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        
        return False


class IsAdminUser(BaseObjectPermission):
    """
    Custom permission to only allow admin users.
    Enhanced with additional security checks.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check if user is staff and has admin role
        if not request.user.is_staff:
            return False
        
        if request.user.role != User.UserRole.ADMIN:
            return False
        
        # Require verification for admin operations
        return (request.user.is_email_verified and 
               request.user.is_phone_verified and
               request.user.status == User.UserStatus.ACTIVE)
    
    def _check_object_permission(self, request, view, obj):
        # Admin users can access everything
        return True


class IsVerifiedUser(BaseObjectPermission):
    """
    Custom permission to only allow verified users.
    Enhanced with role-specific verification requirements.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check verification based on role
        if request.user.role == User.UserRole.CUSTOMER:
            return (request.user.is_email_verified or request.user.is_phone_verified)
        elif request.user.role in [User.UserRole.PHARMACY, User.UserRole.RIDER]:
            return (request.user.is_email_verified and request.user.is_phone_verified)
        elif request.user.role == User.UserRole.ADMIN:
            return True
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Verified users can access objects based on ownership
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        elif hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        elif hasattr(obj, 'rider'):
            return obj.rider.user == request.user
        
        return obj == request.user


class IsPharmacyOrAdmin(BaseObjectPermission):
    """
    Custom permission to allow pharmacy users and admins.
    Enhanced with verification checks.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin users
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Check pharmacy users
        if request.user.role == User.UserRole.PHARMACY:
            # For write operations, require verification
            if request.method not in permissions.SAFE_METHODS:
                return (request.user.is_email_verified and 
                       request.user.is_phone_verified and
                       request.user.status == User.UserStatus.ACTIVE)
            return True
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Admin users can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Pharmacy users can access their own objects
        if request.user.role == User.UserRole.PHARMACY:
            if hasattr(obj, 'user'):
                return obj.user == request.user
            elif hasattr(obj, 'pharmacy'):
                return obj.pharmacy.user == request.user
        
        return False


class IsRiderOrAdmin(BaseObjectPermission):
    """
    Custom permission to allow rider users and admins.
    Enhanced with verification checks.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin users
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Check rider users
        if request.user.role == User.UserRole.RIDER:
            # For write operations, require verification
            if request.method not in permissions.SAFE_METHODS:
                return (request.user.is_email_verified and 
                       request.user.is_phone_verified and
                       request.user.status == User.UserStatus.ACTIVE)
            return True
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Admin users can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Rider users can access their own objects
        if request.user.role == User.UserRole.RIDER:
            if hasattr(obj, 'user'):
                return obj.user == request.user
            elif hasattr(obj, 'rider'):
                return obj.rider.user == request.user
        
        return False


class IsCustomerOrAdmin(BaseObjectPermission):
    """
    Custom permission to allow customer users and admins.
    Enhanced with verification checks.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin users
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Check customer users
        if request.user.role == User.UserRole.CUSTOMER:
            # For write operations, require at least one verification method
            if request.method not in permissions.SAFE_METHODS:
                return ((request.user.is_email_verified or request.user.is_phone_verified) and
                       request.user.status == User.UserStatus.ACTIVE)
            return True
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Admin users can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Customer users can access their own objects
        if request.user.role == User.UserRole.CUSTOMER:
            if hasattr(obj, 'user'):
                return obj.user == request.user
            elif hasattr(obj, 'customer'):
                return obj.customer.user == request.user
        
        return False


class IsOwnerOrAdmin(BaseObjectPermission):
    """
    Custom permission to allow object owners and admins.
    Enhanced with verification checks.
    """
    
    def _check_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Owners can access their own objects
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        elif hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        elif hasattr(obj, 'rider'):
            return obj.rider.user == request.user
        
        # For objects without user field, check if it's the user themselves
        return obj == request.user


class IsVerifiedOrAdmin(BaseObjectPermission):
    """
    Custom permission to allow verified users and admins.
    Enhanced with role-specific verification requirements.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin users
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Check verification based on role
        if request.user.role == User.UserRole.CUSTOMER:
            return (request.user.is_email_verified or request.user.is_phone_verified)
        elif request.user.role in [User.UserRole.PHARMACY, User.UserRole.RIDER]:
            return (request.user.is_email_verified and request.user.is_phone_verified)
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Verified users can access objects based on ownership
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        elif hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        elif hasattr(obj, 'rider'):
            return obj.rider.user == request.user
        
        return obj == request.user


class PharmacyInventoryPermission(BaseObjectPermission):
    """
    Special permission for pharmacy inventory management.
    Only pharmacy owners can manage their own inventory.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin users
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Check pharmacy users
        if request.user.role == User.UserRole.PHARMACY:
            # For write operations, require verification
            if request.method not in permissions.SAFE_METHODS:
                return (request.user.is_email_verified and 
                       request.user.is_phone_verified and
                       request.user.status == User.UserStatus.ACTIVE)
            return True
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Pharmacy users can only access their own inventory
        if request.user.role == User.UserRole.PHARMACY:
            if hasattr(obj, 'pharmacy'):
                return obj.pharmacy.user == request.user
        
        return False


class OrderPermission(BaseObjectPermission):
    """
    Special permission for order management.
    Customers can only access their own orders.
    Pharmacies can access orders assigned to them.
    Riders can access orders assigned to them.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Allow admin users
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Check user verification based on role
        if request.user.role == User.UserRole.CUSTOMER:
            return (request.user.is_email_verified or request.user.is_phone_verified)
        elif request.user.role in [User.UserRole.PHARMACY, User.UserRole.RIDER]:
            return (request.user.is_email_verified and request.user.is_phone_verified)
        
        return False
    
    def _check_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff and request.user.role == User.UserRole.ADMIN:
            return True
        
        # Customers can only access their own orders
        if request.user.role == User.UserRole.CUSTOMER:
            if hasattr(obj, 'customer'):
                return obj.customer.user == request.user
        
        # Pharmacies can access orders assigned to them
        elif request.user.role == User.UserRole.PHARMACY:
            if hasattr(obj, 'pharmacy'):
                return obj.pharmacy.user == request.user
        
        # Riders can access orders assigned to them
        elif request.user.role == User.UserRole.RIDER:
            if hasattr(obj, 'rider_assignment') and obj.rider_assignment:
                return obj.rider_assignment.rider.user == request.user
        
        return False
