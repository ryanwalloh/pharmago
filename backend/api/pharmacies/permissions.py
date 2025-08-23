from rest_framework import permissions


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


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners and admins.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can access their own pharmacy
        return obj.user == request.user


class IsVerifiedPharmacy(permissions.BasePermission):
    """
    Custom permission to only allow verified pharmacies.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy' and
            hasattr(request.user, 'pharmacy') and
            request.user.pharmacy.is_verified
        )
    
    def has_object_permission(self, request, view, obj):
        # Verified pharmacies can access their own pharmacy
        return obj.user == request.user and obj.is_verified


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
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can access their own pharmacy
        return obj.user == request.user
