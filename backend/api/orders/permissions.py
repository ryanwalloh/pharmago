from rest_framework import permissions
from django.shortcuts import get_object_or_404
from .models import Order, OrderLine


class IsOrderOwner(permissions.BasePermission):
    """
    Custom permission to only allow order owners (customers) to access their orders.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Customers can only access their own orders
        if hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        
        return False


class IsPharmacyOrderManager(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners to manage orders from their pharmacy.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has pharmacy role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'
        )
    
    def has_object_permission(self, request, view, obj):
        # Pharmacy owners can manage orders that contain their inventory items
        if hasattr(obj, 'order_lines'):
            # Check if any order line contains items from this pharmacy
            for order_line in obj.order_lines.all():
                if (hasattr(order_line.inventory_item, 'pharmacy') and 
                    order_line.inventory_item.pharmacy.user == request.user):
                    return True
        
        return False


class IsRiderOrderManager(permissions.BasePermission):
    """
    Custom permission to allow riders to manage orders assigned to them.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has rider role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'rider'
        )
    
    def has_object_permission(self, request, view, obj):
        # Riders can manage orders assigned to them
        if hasattr(obj, 'rider_assignments'):
            for assignment in obj.rider_assignments.all():
                if (hasattr(assignment, 'assignment') and 
                    assignment.assignment.rider.user == request.user):
                    return True
        
        return False


class CanCreateOrder(permissions.BasePermission):
    """
    Custom permission to allow customers to create orders.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated and has customer role
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'customer'
        )


class CanViewOrder(permissions.BasePermission):
    """
    Custom permission to control who can view order details.
    Allows order owners, pharmacy owners, riders, and admins to view orders.
    """
    
    def has_permission(self, request, view):
        # Allow read access for authenticated users
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Allow read access for order owner
        if hasattr(obj, 'customer') and obj.customer.user == request.user:
            return True
        
        # Allow read access for admins
        if request.user.is_staff:
            return True
        
        # Allow read access for pharmacy owners if order contains their items
        if (hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            for order_line in obj.order_lines.all():
                if (hasattr(order_line.inventory_item, 'pharmacy') and 
                    order_line.inventory_item.pharmacy.user == request.user):
                    return True
        
        # Allow read access for riders if order is assigned to them
        if (hasattr(request.user, 'role') and 
            request.user.role == 'rider'):
            for assignment in obj.rider_assignments.all():
                if (hasattr(assignment, 'assignment') and 
                    assignment.assignment.rider.user == request.user):
                    return True
        
        return False


class CanUpdateOrderStatus(permissions.BasePermission):
    """
    Custom permission to control who can update order status.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admins can update any order status
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can update status of orders containing their items
        if (hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            for order_line in obj.order_lines.all():
                if (hasattr(order_line.inventory_item, 'pharmacy') and 
                    order_line.inventory_item.pharmacy.user == request.user):
                    return True
        
        # Riders can update status of orders assigned to them
        if (hasattr(request.user, 'role') and 
            request.user.role == 'rider'):
            for assignment in obj.rider_assignments.all():
                if (hasattr(assignment, 'assignment') and 
                    assignment.assignment.rider.user == request.user):
                    return True
        
        return False


class CanCancelOrder(permissions.BasePermission):
    """
    Custom permission to control who can cancel orders.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check if order can be cancelled
        if not obj.can_be_cancelled:
            return False
        
        # Order owners can cancel their own orders
        if hasattr(obj, 'customer') and obj.customer.user == request.user:
            return True
        
        # Admins can cancel any order
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can cancel orders containing their items
        if (hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            for order_line in obj.order_lines.all():
                if (hasattr(order_line.inventory_item, 'pharmacy') and 
                    order_line.inventory_item.pharmacy.user == request.user):
                    return True
        
        return False


class CanManagePrescriptions(permissions.BasePermission):
    """
    Custom permission to allow pharmacy owners and admins to manage prescription verification.
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
    
    def has_object_permission(self, request, view, obj):
        # Check if the order line requires prescription
        if not obj.prescription_required:
            return False
        
        # Admins can manage any prescription
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can manage prescriptions for their inventory items
        if (hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            if (hasattr(obj.inventory_item, 'pharmacy') and 
                obj.inventory_item.pharmacy.user == request.user):
                return True
        
        return False


class CanViewOrderAnalytics(permissions.BasePermission):
    """
    Custom permission to control who can view order analytics and statistics.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Admins can view all analytics
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can view analytics for their orders
        if hasattr(request.user, 'role') and request.user.role == 'pharmacy':
            return True
        
        # Riders can view analytics for their assigned orders
        if hasattr(request.user, 'role') and request.user.role == 'rider':
            return True
        
        return False


class CanSearchOrders(permissions.BasePermission):
    """
    Custom permission to allow authenticated users to search orders based on their role.
    """
    
    def has_permission(self, request, view):
        # Allow search for all authenticated users
        return request.user.is_authenticated


class CanExportOrders(permissions.BasePermission):
    """
    Custom permission to allow users to export order data based on their role.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Admins can export all orders
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can export orders containing their items
        if hasattr(request.user, 'role') and request.user.role == 'pharmacy':
            return True
        
        # Riders can export orders assigned to them
        if hasattr(request.user, 'role') and request.user.role == 'rider':
            return True
        
        return False


class CanManageOrderLines(permissions.BasePermission):
    """
    Custom permission to control who can manage order lines.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Order owners can manage their order lines
        if hasattr(obj, 'order') and obj.order.customer.user == request.user:
            return True
        
        # Admins can manage any order line
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can manage order lines containing their items
        if (hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            if (hasattr(obj.inventory_item, 'pharmacy') and 
                obj.inventory_item.pharmacy.user == request.user):
                return True
        
        return False


class IsOrderInEditableState(permissions.BasePermission):
    """
    Custom permission to check if order is in an editable state.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if order can be edited
        editable_statuses = ['pending', 'accepted']
        return obj.order_status in editable_statuses


class CanProcessPayment(permissions.BasePermission):
    """
    Custom permission to control who can process payments for orders.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Order owners can process payments for their orders
        if hasattr(obj, 'customer') and obj.customer.user == request.user:
            return True
        
        # Admins can process payments for any order
        if request.user.is_staff:
            return True
        
        # Pharmacy owners can process payments for orders containing their items
        if (hasattr(request.user, 'role') and 
            request.user.role == 'pharmacy'):
            for order_line in obj.order_lines.all():
                if (hasattr(order_line.inventory_item, 'pharmacy') and 
                    order_line.inventory_item.pharmacy.user == request.user):
                    return True
        
        return False


class CanViewOrderHistory(permissions.BasePermission):
    """
    Custom permission to control who can view order history.
    """
    
    def has_permission(self, request, view):
        # Allow access for all authenticated users
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # This permission is checked at the view level for list operations
        return True
