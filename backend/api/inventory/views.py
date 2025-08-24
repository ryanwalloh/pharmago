from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import MedicineCategory, MedicineCatalog, PharmacyInventory
from .serializers import (
    MedicineCategorySerializer, MedicineCatalogSerializer, PharmacyInventorySerializer,
    InventorySearchSerializer, InventoryBulkUpdateSerializer, InventoryStatsSerializer
)
from .permissions import (
    IsPharmacyOwnerOrReadOnly, IsPharmacyInventoryOwner, IsMedicineCatalogEditor,
    IsCategoryEditor, CanManageInventory, CanViewInventory, CanSearchInventory,
    CanBulkUpdateInventory, CanViewInventoryStats, CanManageSales, CanExportInventory
)
from api.users.models import Pharmacy


class MedicineCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing medicine categories with hierarchical support"""
    
    queryset = MedicineCategory.objects.all()
    serializer_class = MedicineCategorySerializer
    permission_classes = [IsCategoryEditor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'parent_category']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'sort_order', 'created_at']
    ordering = ['sort_order', 'name']
    
    def get_queryset(self):
        """Get queryset with optional filtering"""
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by level (root categories, subcategories)
        level = self.request.query_params.get('level', None)
        if level is not None:
            if level == 'root':
                queryset = queryset.filter(parent_category__isnull=True)
            elif level == 'sub':
                queryset = queryset.filter(parent_category__isnull=False)
            else:
                try:
                    level_int = int(level)
                    queryset = queryset.filter(parent_category__isnull=level_int == 0)
                except ValueError:
                    pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def root_categories(self, request):
        """Get only root categories"""
        root_categories = self.get_queryset().filter(parent_category__isnull=True)
        serializer = self.get_serializer(root_categories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get complete category tree structure"""
        root_categories = self.get_queryset().filter(parent_category__isnull=True)
        serializer = self.get_serializer(root_categories, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def subcategories(self, request, pk=None):
        """Get subcategories of a specific category"""
        category = self.get_object()
        subcategories = category.subcategories.all()
        serializer = self.get_serializer(subcategories, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def medicines(self, request, pk=None):
        """Get medicines in a specific category"""
        category = self.get_object()
        medicines = MedicineCatalog.objects.filter(category=category, is_active=True)
        
        # Apply additional filters
        form = request.query_params.get('form', None)
        if form:
            medicines = medicines.filter(form=form)
        
        prescription_required = request.query_params.get('prescription_required', None)
        if prescription_required is not None:
            medicines = medicines.filter(prescription_required=prescription_required.lower() == 'true')
        
        serializer = MedicineCatalogSerializer(medicines, many=True)
        return Response(serializer.data)


class MedicineCatalogViewSet(viewsets.ModelViewSet):
    """ViewSet for managing medicine catalog with comprehensive search and filtering"""
    
    queryset = MedicineCatalog.objects.all()
    serializer_class = MedicineCatalogSerializer
    permission_classes = [IsMedicineCatalogEditor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'form', 'prescription_required', 'controlled_substance', 'is_active', 'is_featured']
    search_fields = ['name', 'generic_name', 'description', 'therapeutic_class']
    ordering_fields = ['name', 'created_at', 'is_featured']
    ordering = ['name']
    
    def get_queryset(self):
        """Get queryset with advanced filtering"""
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by FDA approval
        fda_approved = self.request.query_params.get('fda_approved', None)
        if fda_approved is not None:
            queryset = queryset.filter(fda_approval=fda_approved.lower() == 'true')
        
        # Filter by prescription requirement
        prescription_required = self.request.query_params.get('prescription_required', None)
        if prescription_required is not None:
            queryset = queryset.filter(prescription_required=prescription_required.lower() == 'true')
        
        # Filter by controlled substance
        controlled_substance = self.request.query_params.get('controlled_substance', None)
        if controlled_substance is not None:
            queryset = queryset.filter(controlled_substance=controlled_substance.lower() == 'true')
        
        # Filter by availability in pharmacies
        available_in_pharmacy = self.request.query_params.get('available_in_pharmacy', None)
        if available_in_pharmacy is not None:
            if available_in_pharmacy.lower() == 'true':
                queryset = queryset.filter(pharmacy_inventories__is_available=True).distinct()
            else:
                queryset = queryset.exclude(pharmacy_inventories__is_available=True)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured medicines"""
        featured_medicines = self.get_queryset().filter(is_featured=True)
        serializer = self.get_serializer(featured_medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_form(self, request):
        """Get medicines grouped by form"""
        form = request.query_params.get('form', None)
        if not form:
            return Response({'error': 'Form parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        medicines = self.get_queryset().filter(form=form)
        serializer = self.get_serializer(medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def prescription_required(self, request):
        """Get medicines that require prescription"""
        prescription_medicines = self.get_queryset().filter(prescription_required=True)
        serializer = self.get_serializer(prescription_medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def controlled_substances(self, request):
        """Get controlled substances"""
        controlled_medicines = self.get_queryset().filter(controlled_substance=True)
        serializer = self.get_serializer(controlled_medicines, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def pharmacy_prices(self, request, pk=None):
        """Get pharmacy prices for a specific medicine"""
        medicine = self.get_object()
        pharmacy_prices = medicine.get_pharmacy_prices()
        return Response(pharmacy_prices)
    
    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        """Check availability of medicine in pharmacies"""
        medicine = self.get_object()
        pharmacy_id = request.query_params.get('pharmacy_id', None)
        
        if pharmacy_id:
            try:
                pharmacy = Pharmacy.objects.get(id=pharmacy_id)
                is_available = medicine.is_available_for_pharmacy(pharmacy)
                return Response({
                    'medicine_id': medicine.id,
                    'pharmacy_id': pharmacy_id,
                    'is_available': is_available
                })
            except Pharmacy.DoesNotExist:
                return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get availability across all pharmacies
        availability = []
        for pharmacy in Pharmacy.objects.filter(status='approved'):
            is_available = medicine.is_available_for_pharmacy(pharmacy)
            availability.append({
                'pharmacy_id': pharmacy.id,
                'pharmacy_name': pharmacy.pharmacy_name,
                'is_available': is_available
            })
        
        return Response(availability)


class PharmacyInventoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing pharmacy inventory with business logic"""
    
    queryset = PharmacyInventory.objects.all()
    serializer_class = PharmacyInventorySerializer
    permission_classes = [CanViewInventory]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['pharmacy', 'category', 'form', 'is_available', 'is_featured', 'is_on_sale']
    search_fields = ['name', 'description', 'manufacturer']
    ordering_fields = ['name', 'price', 'created_at', 'is_featured']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get queryset with role-based filtering"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by pharmacy ownership for pharmacy users
        if hasattr(user, 'role') and user.role == 'pharmacy':
            try:
                pharmacy = user.pharmacy
                queryset = queryset.filter(pharmacy=pharmacy)
            except:
                queryset = queryset.none()
        
        # Filter by availability for customers
        if hasattr(user, 'role') and user.role == 'customer':
            queryset = queryset.filter(is_available=True)
        
        # Apply additional filters
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        form = self.request.query_params.get('form', None)
        if form:
            queryset = queryset.filter(form=form)
        
        min_price = self.request.query_params.get('min_price', None)
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass
        
        max_price = self.request.query_params.get('max_price', None)
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass
        
        in_stock = self.request.query_params.get('in_stock', None)
        if in_stock is not None:
            if in_stock.lower() == 'true':
                queryset = queryset.filter(stock_quantity__gt=0)
            else:
                queryset = queryset.filter(stock_quantity=0)
        
        return queryset
    
    def get_permissions(self):
        """Get permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [CanManageInventory]
        elif self.action in ['bulk_update', 'start_sale', 'end_sale']:
            permission_classes = [CanManageSales]
        else:
            permission_classes = [CanViewInventory]
        
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'])
    def my_inventory(self, request):
        """Get current user's pharmacy inventory"""
        if not hasattr(request.user, 'role') or request.user.role != 'pharmacy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = request.user.pharmacy
            inventory = self.get_queryset().filter(pharmacy=pharmacy)
            serializer = self.get_serializer(inventory, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available inventory items"""
        available_items = self.get_queryset().filter(is_available=True)
        serializer = self.get_serializer(available_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured inventory items"""
        featured_items = self.get_queryset().filter(is_featured=True, is_available=True)
        serializer = self.get_serializer(featured_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def on_sale(self, request):
        """Get items on sale"""
        sale_items = self.get_queryset().filter(is_on_sale=True, is_available=True)
        serializer = self.get_serializer(sale_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get low stock items for pharmacy owners"""
        if not hasattr(request.user, 'role') or request.user.role != 'pharmacy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = request.user.pharmacy
            low_stock_items = self.get_queryset().filter(
                pharmacy=pharmacy,
                stock_quantity__lte=F('min_stock_level'),
                stock_quantity__gt=0
            )
            serializer = self.get_serializer(low_stock_items, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        """Get out of stock items for pharmacy owners"""
        if not hasattr(request.user, 'role') or request.user.role != 'pharmacy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = request.user.pharmacy
            out_of_stock_items = self.get_queryset().filter(
                pharmacy=pharmacy,
                stock_quantity=0
            )
            serializer = self.get_serializer(out_of_stock_items, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get items expiring soon for pharmacy owners"""
        if not hasattr(request.user, 'role') or request.user.role != 'pharmacy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = request.user.pharmacy
            thirty_days_from_now = timezone.now().date() + timedelta(days=30)
            expiring_items = self.get_queryset().filter(
                pharmacy=pharmacy,
                expiry_date__lte=thirty_days_from_now,
                expiry_date__gt=timezone.now().date()
            )
            serializer = self.get_serializer(expiring_items, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def start_sale(self, request, pk=None):
        """Start a sale for an inventory item"""
        inventory_item = self.get_object()
        
        discount_percentage = request.data.get('discount_percentage')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not all([discount_percentage, start_date, end_date]):
            return Response({
                'error': 'discount_percentage, start_date, and end_date are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            inventory_item.start_sale(discount_percentage, start_date, end_date)
            serializer = self.get_serializer(inventory_item)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def end_sale(self, request, pk=None):
        """End a sale for an inventory item"""
        inventory_item = self.get_object()
        inventory_item.end_sale()
        serializer = self.get_serializer(inventory_item)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """Update stock quantity for an inventory item"""
        inventory_item = self.get_object()
        
        quantity = request.data.get('quantity')
        operation = request.data.get('operation', 'set')
        
        if quantity is None:
            return Response({'error': 'quantity is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            inventory_item.update_stock(quantity, operation)
            serializer = self.get_serializer(inventory_item)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update inventory items"""
        serializer = InventoryBulkUpdateSerializer(data=request.data)
        if serializer.is_valid():
            inventory_ids = serializer.validated_data['inventory_ids']
            updates = serializer.validated_data['updates']
            
            # Check permissions for all items
            inventory_items = PharmacyInventory.objects.filter(id__in=inventory_ids)
            for item in inventory_items:
                if not CanManageInventory().has_object_permission(request, self, item):
                    return Response({'error': 'Permission denied for some items'}, 
                                 status=status.HTTP_403_FORBIDDEN)
            
            # Perform bulk update
            updated_count = inventory_items.update(**updates)
            
            return Response({
                'message': f'Successfully updated {updated_count} items',
                'updated_count': updated_count
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced inventory search"""
        serializer = InventorySearchSerializer(data=request.query_params)
        if serializer.is_valid():
            params = serializer.validated_data
            
            queryset = self.get_queryset()
            
            # Apply search filters
            if params.get('query'):
                query = params['query']
                queryset = queryset.filter(
                    Q(name__icontains=query) |
                    Q(description__icontains=query) |
                    Q(manufacturer__icontains=query)
                )
            
            if params.get('category'):
                queryset = queryset.filter(category_id=params['category'])
            
            if params.get('form'):
                queryset = queryset.filter(form=params['form'])
            
            if params.get('prescription_required') is not None:
                queryset = queryset.filter(prescription_required=params['prescription_required'])
            
            if params.get('min_price'):
                queryset = queryset.filter(price__gte=params['min_price'])
            
            if params.get('max_price'):
                queryset = queryset.filter(price__lte=params['max_price'])
            
            if params.get('in_stock') is not None:
                if params['in_stock']:
                    queryset = queryset.filter(stock_quantity__gt=0)
                else:
                    queryset = queryset.filter(stock_quantity=0)
            
            if params.get('pharmacy_id'):
                queryset = queryset.filter(pharmacy_id=params['pharmacy_id'])
            
            if params.get('is_featured') is not None:
                queryset = queryset.filter(is_featured=params['is_featured'])
            
            if params.get('is_on_sale') is not None:
                queryset = queryset.filter(is_on_sale=params['is_on_sale'])
            
            # Apply sorting
            sort_by = params.get('sort_by', 'name')
            if sort_by == 'price_low':
                queryset = queryset.order_by('price')
            elif sort_by == 'price_high':
                queryset = queryset.order_by('-price')
            elif sort_by == 'newest':
                queryset = queryset.order_by('-created_at')
            elif sort_by == 'popularity':
                # This would need to be implemented based on order history
                queryset = queryset.order_by('-created_at')
            else:
                queryset = queryset.order_by('name')
            
            # Apply pagination
            page = params.get('page', 1)
            page_size = params.get('page_size', 20)
            start = (page - 1) * page_size
            end = start + page_size
            
            total_count = queryset.count()
            queryset = queryset[start:end]
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'results': serializer.data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get inventory statistics"""
        if not CanViewInventoryStats().has_permission(request, self):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        queryset = self.get_queryset()
        
        # Filter by pharmacy if user is pharmacy owner
        if hasattr(user, 'role') and user.role == 'pharmacy':
            try:
                pharmacy = user.pharmacy
                queryset = queryset.filter(pharmacy=pharmacy)
            except:
                return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate statistics
        total_items = queryset.count()
        available_items = queryset.filter(is_available=True).count()
        out_of_stock_items = queryset.filter(stock_quantity=0).count()
        low_stock_items = queryset.filter(
            stock_quantity__lte=F('min_stock_level'),
            stock_quantity__gt=0
        ).count()
        
        # Expiring soon items
        thirty_days_from_now = timezone.now().date() + timedelta(days=30)
        expiring_soon_items = queryset.filter(
            expiry_date__lte=thirty_days_from_now,
            expiry_date__gt=timezone.now().date()
        ).count()
        
        on_sale_items = queryset.filter(is_on_sale=True).count()
        
        # Financial statistics
        total_value = queryset.aggregate(
            total=Sum(F('price') * F('stock_quantity'))
        )['total'] or 0
        
        average_price = queryset.aggregate(avg=Avg('price'))['avg'] or 0
        
        # Category distribution
        category_distribution = queryset.values('category__name').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Stock alerts
        stock_alerts = []
        low_stock_items_queryset = queryset.filter(
            stock_quantity__lte=F('min_stock_level'),
            stock_quantity__gt=0
        )
        for item in low_stock_items_queryset[:10]:  # Limit to 10 alerts
            stock_alerts.append({
                'item_id': item.id,
                'item_name': item.display_name,
                'current_stock': item.stock_quantity,
                'min_stock': item.min_stock_level,
                'message': f'Stock level is low: {item.stock_quantity} remaining'
            })
        
        stats = {
            'total_items': total_items,
            'available_items': available_items,
            'out_of_stock_items': out_of_stock_items,
            'low_stock_items': low_stock_items,
            'expiring_soon_items': expiring_soon_items,
            'on_sale_items': on_sale_items,
            'total_value': total_value,
            'average_price': average_price,
            'category_distribution': list(category_distribution),
            'stock_alerts': stock_alerts
        }
        
        serializer = InventoryStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export inventory data"""
        if not CanExportInventory().has_permission(request, self):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # This would implement CSV/Excel export functionality
        # For now, return JSON data
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
