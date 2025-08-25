from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsPharmacyOwner(permissions.BasePermission):
    """
    Custom permission to only allow pharmacy owners to access their pharmacy.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # Pharmacy owners can only access their own pharmacy
        return obj.user == request.user


class IsRiderOwner(permissions.BasePermission):
    """
    Custom permission to only allow riders to access their own profile.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has rider role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'rider'
        )
    
    def has_object_permission(self, request, view, obj):
        # Riders can only access their own profile
        return obj.user == request.user


class IsCustomerOwner(permissions.BasePermission):
    """
    Custom permission to only allow customers to access their own profile.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has customer role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'customer'
        )
    
    def has_object_permission(self, request, view, obj):
        # Customers can only access their own profile
        return obj.user == request.user


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class IsVerifiedUser(permissions.BasePermission):
    """
    Custom permission to only allow verified users.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_verified


class IsPharmacyOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow pharmacy users and admins.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_staff or 
             (hasattr(request.user, 'role') and request.user.role == 'pharmacy'))
        )


class IsRiderOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow rider users and admins.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_staff or 
             (hasattr(request.user, 'role') and request.user.role == 'rider'))
        )


class IsCustomerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow customer users and admins.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_staff or 
             (hasattr(request.user, 'role') and request.user.role == 'customer'))
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow object owners and admins.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Owners can access their own objects
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # For objects without user field, check if it's the user themselves
        return obj == request.user


class IsVerifiedOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow verified users and admins.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_verified)
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_verified)


# Additional permission classes for delivery and payment views
class IsRider(permissions.BasePermission):
    """
    Custom permission to only allow rider users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'rider'
        )


class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class IsPharmacy(permissions.BasePermission):
    """
    Custom permission to only allow pharmacy users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )


class IsCustomer(permissions.BasePermission):
    """
    Custom permission to only allow customer users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'customer'
        )
