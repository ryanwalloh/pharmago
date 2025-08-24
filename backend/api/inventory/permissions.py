from rest_framework import permissions
from django.shortcuts import get_object_or_404
from .models import PharmacyInventory, MedicineCatalog, MedicineCategory


class IsPharmacyOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners to edit their inventory,
    but allow read access to everyone.
    """
    
    def has_permission(self, request, view):
        # Allow read access to everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if user is pharmacy owner
        if hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        
        # For MedicineCatalog and MedicineCategory, only admins can edit
        return request.user.is_staff


class IsPharmacyInventoryOwner(permissions.BasePermission):
    """
    Custom permission to only allow pharmacy owners to access their inventory items.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # Pharmacy owners can only access their own inventory
        if hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        
        return False


class IsMedicineCatalogEditor(permissions.BasePermission):
    """
    Custom permission to allow only admins and verified pharmacies to edit medicine catalog.
    """
    
    def has_permission(self, request, view):
        # Allow read access to everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if user is admin
        if request.user.is_staff:
            return True
        
        # Check if user is verified pharmacy
        if (request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            
            # Check if pharmacy is verified
            try:
                pharmacy = request.user.pharmacy
                return pharmacy.status == 'approved'
            except:
                return False
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only admins can edit catalog items
        return request.user.is_staff


class IsCategoryEditor(permissions.BasePermission):
    """
    Custom permission to allow only admins to edit medicine categories.
    """
    
    def has_permission(self, request, view):
        # Allow read access to everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only admins can edit categories
        return request.user.is_authenticated and request.user.is_staff
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only admins can edit categories
        return request.user.is_staff


class CanManageInventory(permissions.BasePermission):
    """
    Custom permission to check if user can manage inventory.
    Allows pharmacy owners to manage their inventory and admins to manage all.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Admins can manage all inventory
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can manage inventory
        if hasattr(request.user, 'role') and request.user.role == 'pharmacy':
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Admins can manage all inventory
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can only manage their own inventory
        if hasattr(request.user, 'role') and request.user.role == 'pharmacy':
            if hasattr(obj, 'pharmacy'):
                return obj.pharmacy.user == request.user
        
        return False


class CanViewInventory(permissions.BasePermission):
    """
    Custom permission to check if user can view inventory.
    Allows customers to view available inventory, pharmacy owners to view their own,
    and admins to view all.
    """
    
    def has_permission(self, request, view):
        # Allow read access to everyone for public inventory
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, check specific permissions
        return CanManageInventory().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to everyone for public inventory
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, check management permissions
        return CanManageInventory().has_object_permission(request, view, obj)


class CanSearchInventory(permissions.BasePermission):
    """
    Custom permission to allow inventory search for all authenticated users.
    """
    
    def has_permission(self, request, view):
        # Allow search for all authenticated users
        return request.user.is_authenticated


class CanBulkUpdateInventory(permissions.BasePermission):
    """
    Custom permission to allow only pharmacy owners to perform bulk inventory updates.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # This permission is checked at the view level for bulk operations
        return True


class CanViewInventoryStats(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners to view their inventory statistics
    and admins to view all statistics.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Admins can view all stats
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can view their stats
        if hasattr(request.user, 'role') and request.user.role == 'pharmacy':
            return True
        
        return False


class IsInventoryItemAvailable(permissions.BasePermission):
    """
    Custom permission to check if inventory item is available for ordering.
    This is used for order-related operations.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if inventory item is available
        if hasattr(obj, 'is_available'):
            return obj.is_available
        
        return True


class CanManagePrescriptions(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners and admins to manage prescription requirements.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Admins can manage prescriptions
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can manage prescriptions
        if hasattr(request.user, 'role') and request.user.role == 'pharmacy':
            return True
        
        return False


class CanViewPricing(permissions.BasePermission):
    """
    Custom permission to control who can view pricing information.
    Allows customers to view prices, pharmacy owners to view their own pricing,
    and admins to view all pricing.
    """
    
    def has_permission(self, request, view):
        # Allow read access to everyone for pricing
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, check management permissions
        return CanManageInventory().has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to everyone for pricing
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, check management permissions
        return CanManageInventory().has_object_permission(request, view, obj)


class CanManageSales(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners to manage sales and discounts.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # Pharmacy owners can only manage their own sales
        if hasattr(obj, 'pharmacy'):
            return obj.pharmacy.user == request.user
        
        return False


class CanExportInventory(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners to export their inventory data.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # This permission is checked at the view level for export operations
        return True
