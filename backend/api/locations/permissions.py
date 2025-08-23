from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an address to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsAddressOwner(permissions.BasePermission):
    """
    Custom permission to only allow address owners to access their addresses.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Address owners can only access their own addresses
        return obj.user == request.user


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow address owners and admins.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_staff:
            return True
        
        # Owners can access their own addresses
        return obj.user == request.user
