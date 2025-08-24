from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import Order, OrderLine
from .serializers import (
    OrderSerializer, OrderLineSerializer, OrderCreateSerializer,
    OrderStatusUpdateSerializer, OrderSearchSerializer, OrderStatsSerializer,
    PrescriptionVerificationSerializer
)
from .permissions import (
    IsOrderOwner, IsPharmacyOrderManager, IsRiderOrderManager, CanCreateOrder,
    CanViewOrder, CanUpdateOrderStatus, CanCancelOrder, CanManagePrescriptions,
    CanViewOrderAnalytics, CanSearchOrders, CanExportOrders, CanManageOrderLines,
    IsOrderInEditableState, CanProcessPayment, CanViewOrderHistory
)
from api.inventory.models import PharmacyInventory
from api.users.models import Customer
from api.locations.models import Address


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing orders with comprehensive business logic"""
    
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [CanViewOrder]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['order_status', 'payment_status', 'delivery_type', 'customer', 'source']
    search_fields = ['order_number', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'total_amount', 'order_number']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get queryset with role-based filtering"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by user role
        if hasattr(user, 'role'):
            if user.role == 'customer':
                # Customers can only see their own orders
                try:
                    customer = user.customer
                    queryset = queryset.filter(customer=customer)
                except:
                    queryset = queryset.none()
            
            elif user.role == 'pharmacy':
                # Pharmacy owners can see orders containing their items
                try:
                    pharmacy = user.pharmacy
                    queryset = queryset.filter(
                        order_lines__inventory_item__pharmacy=pharmacy
                    ).distinct()
                except:
                    queryset = queryset.none()
            
            elif user.role == 'rider':
                # Riders can see orders assigned to them
                queryset = queryset.filter(
                    rider_assignments__assignment__rider__user=user
                ).distinct()
        
        # Apply additional filters
        order_status = self.request.query_params.get('order_status', None)
        if order_status:
            queryset = queryset.filter(order_status=order_status)
        
        payment_status = self.request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        delivery_type = self.request.query_params.get('delivery_type', None)
        if delivery_type:
            queryset = queryset.filter(delivery_type=delivery_type)
        
        date_from = self.request.query_params.get('date_from', None)
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=date_from)
            except ValueError:
                pass
        
        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=date_to)
            except ValueError:
                pass
        
        min_total = self.request.query_params.get('min_total', None)
        if min_total:
            try:
                queryset = queryset.filter(total_amount__gte=float(min_total))
            except ValueError:
                pass
        
        max_total = self.request.query_params.get('max_total', None)
        if max_total:
            try:
                queryset = queryset.filter(total_amount__lte=float(max_total))
            except ValueError:
                pass
        
        has_prescription = self.request.query_params.get('has_prescription', None)
        if has_prescription is not None:
            if has_prescription.lower() == 'true':
                queryset = queryset.filter(order_lines__prescription_required=True).distinct()
            else:
                queryset = queryset.filter(order_lines__prescription_required=False).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        """Get appropriate serializer based on action"""
        if self.action == 'create':
            return OrderCreateSerializer
        elif self.action == 'update_status':
            return OrderStatusUpdateSerializer
        return OrderSerializer
    
    def get_permissions(self):
        """Get permissions based on action"""
        if self.action == 'create':
            permission_classes = [CanCreateOrder]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsOrderOwner]
        elif self.action in ['update_status', 'cancel_order']:
            permission_classes = [CanUpdateOrderStatus]
        elif self.action in ['prescription_verification']:
            permission_classes = [CanManagePrescriptions]
        elif self.action in ['stats', 'analytics']:
            permission_classes = [CanViewOrderAnalytics]
        elif self.action in ['search', 'export']:
            permission_classes = [CanSearchOrders]
        else:
            permission_classes = [CanViewOrder]
        
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        """Get current user's orders"""
        if not hasattr(request.user, 'role') or request.user.role != 'customer':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            customer = request.user.customer
            orders = self.get_queryset().filter(customer=customer)
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def pharmacy_orders(self, request):
        """Get orders for pharmacy owners"""
        if not hasattr(request.user, 'role') or request.user.role != 'pharmacy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = request.user.pharmacy
            orders = self.get_queryset().filter(
                order_lines__inventory_item__pharmacy=pharmacy
            ).distinct()
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def rider_orders(self, request):
        """Get orders assigned to current rider"""
        if not hasattr(request.user, 'role') or request.user.role != 'rider':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        orders = self.get_queryset().filter(
            rider_assignments__assignment__rider__user=request.user
        ).distinct()
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending orders"""
        pending_orders = self.get_queryset().filter(order_status='pending')
        serializer = self.get_serializer(pending_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def preparing(self, request):
        """Get orders being prepared"""
        preparing_orders = self.get_queryset().filter(order_status='preparing')
        serializer = self.get_serializer(preparing_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ready_for_pickup(self, request):
        """Get orders ready for pickup"""
        ready_orders = self.get_queryset().filter(order_status='ready_for_pickup')
        serializer = self.get_serializer(ready_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def in_delivery(self, request):
        """Get orders currently being delivered"""
        delivery_orders = self.get_queryset().filter(
            order_status__in=['picked_up']
        )
        serializer = self.get_serializer(delivery_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Get completed orders"""
        completed_orders = self.get_queryset().filter(order_status='delivered')
        serializer = self.get_serializer(completed_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def cancelled(self, request):
        """Get cancelled orders"""
        cancelled_orders = self.get_queryset().filter(order_status='cancelled')
        serializer = self.get_serializer(cancelled_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status with validation"""
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(
            data=request.data,
            context={'order': order}
        )
        
        if serializer.is_valid():
            new_status = serializer.validated_data['new_status']
            notes = serializer.validated_data.get('notes', '')
            
            # Update order status
            order.update_status(new_status, notes)
            
            # Return updated order
            serializer = OrderSerializer(order)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        """Cancel an order"""
        order = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        try:
            order.cancel_order(reason)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def apply_discount(self, request, pk=None):
        """Apply discount to an order"""
        order = self.get_object()
        discount_amount = request.data.get('discount_amount')
        
        if discount_amount is None:
            return Response({'error': 'discount_amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order.apply_discount(discount_amount)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def delivery_tracking(self, request, pk=None):
        """Get delivery tracking information"""
        order = self.get_object()
        tracking_info = order.get_delivery_tracking()
        return Response(tracking_info)
    
    @action(detail=True, methods=['get'])
    def delivery_analytics(self, request, pk=None):
        """Get delivery analytics for an order"""
        order = self.get_object()
        analytics = order.get_delivery_analytics()
        return Response(analytics)
    
    @action(detail=True, methods=['get'])
    def order_summary(self, request, pk=None):
        """Get order summary"""
        order = self.get_object()
        summary = order.get_order_summary()
        return Response(summary)
    
    @action(detail=True, methods=['get'])
    def batch_info(self, request, pk=None):
        """Get batch delivery information"""
        order = self.get_object()
        batch_info = order.get_batch_info()
        return Response(batch_info)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced order search"""
        serializer = OrderSearchSerializer(data=request.query_params)
        if serializer.is_valid():
            params = serializer.validated_data
            
            queryset = self.get_queryset()
            
            # Apply search filters
            if params.get('customer_id'):
                queryset = queryset.filter(customer_id=params['customer_id'])
            
            if params.get('order_status'):
                queryset = queryset.filter(order_status=params['order_status'])
            
            if params.get('payment_status'):
                queryset = queryset.filter(payment_status=params['payment_status'])
            
            if params.get('delivery_type'):
                queryset = queryset.filter(delivery_type=params['delivery_type'])
            
            if params.get('min_total'):
                queryset = queryset.filter(total_amount__gte=params['min_total'])
            
            if params.get('max_total'):
                queryset = queryset.filter(total_amount__lte=params['max_total'])
            
            if params.get('date_from'):
                queryset = queryset.filter(created_at__date__gte=params['date_from'])
            
            if params.get('date_to'):
                queryset = queryset.filter(created_at__date__lte=params['date_to'])
            
            if params.get('has_prescription') is not None:
                if params['has_prescription']:
                    queryset = queryset.filter(order_lines__prescription_required=True).distinct()
                else:
                    queryset = queryset.filter(order_lines__prescription_required=False).distinct()
            
            # Apply sorting
            sort_by = params.get('sort_by', 'created_at')
            if sort_by == 'total_amount':
                queryset = queryset.order_by('total_amount')
            elif sort_by == 'order_number':
                queryset = queryset.order_by('order_number')
            else:
                queryset = queryset.order_by('-created_at')
            
            # Apply pagination
            page = params.get('page', 1)
            page_size = params.get('page_size', 20)
            start = (page - 1) * page_size
            end = start + page_size
            
            total_count = queryset.count()
            queryset = queryset[start:end]
            
            serializer = OrderSerializer(queryset, many=True)
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
        """Get order statistics"""
        if not CanViewOrderAnalytics().has_permission(request, self):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        queryset = self.get_queryset()
        
        # Filter by user role
        if hasattr(user, 'role'):
            if user.role == 'pharmacy':
                try:
                    pharmacy = user.pharmacy
                    queryset = queryset.filter(
                        order_lines__inventory_item__pharmacy=pharmacy
                    ).distinct()
                except:
                    return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
            
            elif user.role == 'rider':
                queryset = queryset.filter(
                    rider_assignments__assignment__rider__user=user
                ).distinct()
        
        # Calculate statistics
        total_orders = queryset.count()
        pending_orders = queryset.filter(order_status='pending').count()
        completed_orders = queryset.filter(order_status='delivered').count()
        cancelled_orders = queryset.filter(order_status='cancelled').count()
        
        # Financial statistics
        total_revenue = queryset.filter(payment_status='paid').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        average_order_value = queryset.aggregate(avg=Avg('total_amount'))['avg'] or 0
        
        # Time-based statistics
        today = timezone.now().date()
        orders_today = queryset.filter(created_at__date=today).count()
        
        week_start = today - timedelta(days=today.weekday())
        orders_this_week = queryset.filter(
            created_at__date__gte=week_start
        ).count()
        
        month_start = today.replace(day=1)
        orders_this_month = queryset.filter(
            created_at__date__gte=month_start
        ).count()
        
        # Status distribution
        status_distribution = queryset.values('order_status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Delivery type distribution
        delivery_type_distribution = queryset.values('delivery_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Prescription orders count
        prescription_orders_count = queryset.filter(
            order_lines__prescription_required=True
        ).distinct().count()
        
        stats = {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'total_revenue': total_revenue,
            'average_order_value': average_order_value,
            'orders_today': orders_today,
            'orders_this_week': orders_this_week,
            'orders_this_month': orders_this_month,
            'status_distribution': list(status_distribution),
            'delivery_type_distribution': list(delivery_type_distribution),
            'prescription_orders_count': prescription_orders_count
        }
        
        serializer = OrderStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get detailed order analytics"""
        if not CanViewOrderAnalytics().has_permission(request, self):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        user = request.user
        queryset = self.get_queryset()
        
        # Filter by user role
        if hasattr(user, 'role'):
            if user.role == 'pharmacy':
                try:
                    pharmacy = user.pharmacy
                    queryset = queryset.filter(
                        order_lines__inventory_item__pharmacy=pharmacy
                    ).distinct()
                except:
                    return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
            
            elif user.role == 'rider':
                queryset = queryset.filter(
                    rider_assignments__assignment__rider__user=user
                ).distinct()
        
        # Time series analysis
        days_back = 30
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        daily_orders = []
        daily_revenue = []
        
        current_date = start_date
        while current_date <= end_date:
            day_orders = queryset.filter(created_at__date=current_date).count()
            day_revenue = queryset.filter(
                created_at__date=current_date,
                payment_status='paid'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            daily_orders.append({
                'date': current_date.isoformat(),
                'orders': day_orders
            })
            
            daily_revenue.append({
                'date': current_date.isoformat(),
                'revenue': float(day_revenue)
            })
            
            current_date += timedelta(days=1)
        
        # Category performance
        category_performance = queryset.values(
            'order_lines__inventory_item__category__name'
        ).annotate(
            order_count=Count('id', distinct=True),
            total_revenue=Sum('total_amount')
        ).order_by('-total_revenue')
        
        # Delivery performance
        delivery_performance = queryset.filter(
            order_status='delivered'
        ).aggregate(
            avg_delivery_time=Avg(
                F('actual_delivery') - F('created_at')
            )
        )
        
        analytics = {
            'daily_orders': daily_orders,
            'daily_revenue': daily_revenue,
            'category_performance': list(category_performance),
            'delivery_performance': delivery_performance,
            'total_orders': queryset.count(),
            'total_revenue': queryset.filter(payment_status='paid').aggregate(
                total=Sum('total_amount')
            )['total'] or 0
        }
        
        return Response(analytics)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export order data"""
        if not CanExportOrders().has_permission(request, self):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # This would implement CSV/Excel export functionality
        # For now, return JSON data
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class OrderLineViewSet(viewsets.ModelViewSet):
    """ViewSet for managing order lines"""
    
    queryset = OrderLine.objects.all()
    serializer_class = OrderLineSerializer
    permission_classes = [CanManageOrderLines]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['order', 'inventory_item', 'prescription_required', 'prescription_status']
    search_fields = ['inventory_item__name', 'notes']
    
    def get_queryset(self):
        """Get queryset with role-based filtering"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by user role
        if hasattr(user, 'role'):
            if user.role == 'customer':
                # Customers can only see their own order lines
                try:
                    customer = user.customer
                    queryset = queryset.filter(order__customer=customer)
                except:
                    queryset = queryset.none()
            
            elif user.role == 'pharmacy':
                # Pharmacy owners can see order lines containing their items
                try:
                    pharmacy = user.pharmacy
                    queryset = queryset.filter(inventory_item__pharmacy=pharmacy)
                except:
                    queryset = queryset.none()
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def verify_prescription(self, request, pk=None):
        """Verify prescription for an order line"""
        order_line = self.get_object()
        serializer = PrescriptionVerificationSerializer(
            data=request.data,
            context={'order_line': order_line}
        )
        
        if serializer.is_valid():
            prescription_status = serializer.validated_data['prescription_status']
            prescription_notes = serializer.validated_data.get('prescription_notes', '')
            
            # Update prescription status
            order_line.prescription_status = prescription_status
            order_line.prescription_notes = prescription_notes
            order_line.save()
            
            # Return updated order line
            serializer = OrderLineSerializer(order_line)
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PrescriptionVerificationViewSet(viewsets.ViewSet):
    """ViewSet for managing prescription verification"""
    
    permission_classes = [CanManagePrescriptions]
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending prescription verifications"""
        if not hasattr(request.user, 'role') or request.user.role != 'pharmacy':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            pharmacy = request.user.pharmacy
            pending_prescriptions = OrderLine.objects.filter(
                inventory_item__pharmacy=pharmacy,
                prescription_required=True,
                prescription_status='pending'
            )
            serializer = OrderLineSerializer(pending_prescriptions, many=True)
            return Response(serializer.data)
        except:
            return Response({'error': 'Pharmacy not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def bulk_verify(self, request):
        """Bulk verify prescriptions"""
        verifications = request.data.get('verifications', [])
        
        if not verifications:
            return Response({'error': 'No verifications provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        for verification in verifications:
            order_line_id = verification.get('order_line_id')
            prescription_status = verification.get('prescription_status')
            prescription_notes = verification.get('prescription_notes', '')
            
            try:
                order_line = OrderLine.objects.get(id=order_line_id)
                
                # Check permissions
                if not CanManagePrescriptions().has_object_permission(request, self, order_line):
                    results.append({
                        'order_line_id': order_line_id,
                        'status': 'denied',
                        'error': 'Permission denied'
                    })
                    continue
                
                # Update prescription status
                order_line.prescription_status = prescription_status
                order_line.prescription_notes = prescription_notes
                order_line.save()
                
                results.append({
                    'order_line_id': order_line_id,
                    'status': 'success',
                    'prescription_status': prescription_status
                })
                
            except OrderLine.DoesNotExist:
                results.append({
                    'order_line_id': order_line_id,
                    'status': 'error',
                    'error': 'Order line not found'
                })
        
        return Response({'results': results})
