from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import (
    RiderAssignment, RiderLocation, OrderRiderAssignment, 
    DeliveryZone, OrderBatchingService
)
from .serializers import (
    RiderAssignmentSerializer, RiderAssignmentCreateSerializer, RiderAssignmentUpdateSerializer,
    RiderLocationSerializer, OrderRiderAssignmentSerializer, DeliveryZoneSerializer,
    DeliveryZoneCreateSerializer, OrderBatchingSerializer, RiderAssignmentBulkSerializer,
    DeliveryAnalyticsSerializer
)
from api.users.models import Rider
from api.orders.models import Order
from api.users.permissions import IsRider, IsAdmin, IsPharmacy, IsCustomer


class DeliveryZoneViewSet(viewsets.ModelViewSet):
    """ViewSet for delivery zone management."""
    
    queryset = DeliveryZone.objects.all()
    serializer_class = DeliveryZoneSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'max_batch_size']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'radius_km']
    ordering = ['name']
    
    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == 'create':
            return DeliveryZoneCreateSerializer
        return DeliveryZoneSerializer
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active delivery zones."""
        zones = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(zones, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get delivery zones by location coordinates."""
        lat = request.query_params.get('latitude')
        lng = request.query_params.get('longitude')
        
        if not lat or not lng:
            return Response(
                {'error': 'Latitude and longitude are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response(
                {'error': 'Invalid coordinates'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find zones that contain this point
        zones = []
        for zone in self.queryset.filter(is_active=True):
            if zone.is_point_in_zone(lat, lng):
                zones.append(zone)
        
        serializer = self.get_serializer(zones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle delivery zone active status."""
        zone = self.get_object()
        zone.is_active = not zone.is_active
        zone.save()
        
        serializer = self.get_serializer(zone)
        return Response(serializer.data)


class RiderAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for rider assignment management."""
    
    queryset = RiderAssignment.objects.select_related('rider').prefetch_related('order_assignments__order')
    serializer_class = RiderAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'assignment_type', 'rider', 'batch_size']
    search_fields = ['assignment_id', 'notes']
    ordering_fields = ['assigned_at', 'created_at', 'batch_size']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == 'create':
            return RiderAssignmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return RiderAssignmentUpdateSerializer
        return RiderAssignmentSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        
        if user.role == 'rider':
            # Riders see only their assignments
            return self.queryset.filter(rider__user=user)
        elif user.role == 'pharmacy':
            # Pharmacies see assignments for their orders
            pharmacy_orders = Order.objects.filter(
                pharmacy__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(
                order_assignments__order__in=pharmacy_orders
            ).distinct()
        elif user.role == 'customer':
            # Customers see assignments for their orders
            customer_orders = Order.objects.filter(
                customer__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(
                order_assignments__order__in=customer_orders
            ).distinct()
        
        # Admins see all assignments
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def my_assignments(self, request):
        """Get current user's assignments."""
        if request.user.role != 'rider':
            return Response(
                {'error': 'Only riders can access this endpoint'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignments = self.get_queryset().filter(
            rider__user=request.user,
            status__in=['assigned', 'accepted', 'picked_up', 'delivering']
        )
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active assignments."""
        assignments = self.get_queryset().filter(
            status__in=['assigned', 'accepted', 'picked_up', 'delivering']
        )
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Get completed assignments."""
        assignments = self.get_queryset().filter(status='completed')
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def cancelled(self, request):
        """Get cancelled assignments."""
        assignments = self.get_queryset().filter(status='cancelled')
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Rider accepts assignment."""
        assignment = self.get_object()
        
        if request.user.role != 'rider' or assignment.rider.user != request.user:
            return Response(
                {'error': 'Only assigned rider can accept assignment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            assignment.accept_assignment()
            serializer = self.get_serializer(assignment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def pickup(self, request, pk=None):
        """Mark orders as picked up."""
        assignment = self.get_object()
        
        if request.user.role != 'rider' or assignment.rider.user != request.user:
            return Response(
                {'error': 'Only assigned rider can mark pickup'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            assignment.mark_picked_up()
            serializer = self.get_serializer(assignment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def start_delivery(self, request, pk=None):
        """Start delivery process."""
        assignment = self.get_object()
        
        if request.user.role != 'rider' or assignment.rider.user != request.user:
            return Response(
                {'error': 'Only assigned rider can start delivery'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            assignment.start_delivery()
            serializer = self.get_serializer(assignment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete assignment."""
        assignment = self.get_object()
        
        if request.user.role != 'rider' or assignment.rider.user != request.user:
            return Response(
                {'error': 'Only assigned rider can complete assignment'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            assignment.complete_assignment()
            serializer = self.get_serializer(assignment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel assignment."""
        assignment = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can cancel assignments'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            assignment.cancel_assignment(reason)
            serializer = self.get_serializer(assignment)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign orders to riders."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can bulk assign'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RiderAssignmentBulkSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Process bulk assignment
                assignments = []
                for batch_data in serializer.validated_data['order_batches']:
                    assignment = RiderAssignment.objects.create(
                        rider_id=serializer.validated_data['rider_id'],
                        assignment_type=serializer.validated_data['assignment_type'],
                        batch_size=len(batch_data['order_ids']),
                        max_batch_size=5
                    )
                    
                    # Create order assignments
                    for i, order_id in enumerate(batch_data['order_ids'], 1):
                        OrderRiderAssignment.objects.create(
                            order_id=order_id,
                            assignment=assignment,
                            pickup_sequence=i,
                            delivery_sequence=i
                        )
                    
                    assignments.append(assignment)
                
                # Return created assignments
                result_serializer = RiderAssignmentSerializer(assignments, many=True)
                return Response(result_serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to create assignments: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get delivery analytics."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can access analytics'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        # Calculate metrics
        total_assignments = queryset.count()
        completed_assignments = queryset.filter(status='completed').count()
        active_assignments = queryset.filter(
            status__in=['assigned', 'accepted', 'picked_up', 'delivering']
        ).count()
        cancelled_assignments = queryset.filter(status='cancelled').count()
        
        # Financial metrics
        total_delivery_fees = queryset.aggregate(
            total=Sum('total_delivery_fee')
        )['total'] or 0
        total_rider_earnings = queryset.aggregate(
            total=Sum('rider_earnings')
        )['total'] or 0
        
        # Performance metrics
        completed_assignments_qs = queryset.filter(status='completed')
        if completed_assignments_qs.exists():
            avg_delivery_time = completed_assignments_qs.aggregate(
                avg_time=Avg(F('completed_at') - F('assigned_at'))
            )['avg_time']
        else:
            avg_delivery_time = None
        
        avg_batch_size = queryset.aggregate(avg_size=Avg('batch_size'))['avg_size'] or 0
        
        # Delivery zone breakdown
        delivery_zones = queryset.values('pickup_latitude', 'pickup_longitude').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Rider performance
        rider_performance = queryset.values('rider__first_name', 'rider__last_name').annotate(
            total_assignments=Count('id'),
            completed_assignments=Count('id', filter=Q(status='completed')),
            total_earnings=Sum('rider_earnings')
        ).order_by('-total_assignments')[:10]
        
        analytics_data = {
            'total_assignments': total_assignments,
            'completed_assignments': completed_assignments,
            'active_assignments': active_assignments,
            'cancelled_assignments': cancelled_assignments,
            'total_delivery_fees': total_delivery_fees,
            'total_rider_earnings': total_rider_earnings,
            'average_delivery_time': avg_delivery_time,
            'average_batch_size': avg_batch_size,
            'delivery_zones': list(delivery_zones),
            'rider_performance': list(rider_performance)
        }
        
        serializer = DeliveryAnalyticsSerializer(analytics_data)
        return Response(serializer.data)


class RiderLocationViewSet(viewsets.ModelViewSet):
    """ViewSet for real-time rider location tracking."""
    
    queryset = RiderLocation.objects.select_related('rider', 'assignment')
    serializer_class = RiderLocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rider', 'assignment']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        
        if user.role == 'rider':
            # Riders see only their location updates
            return self.queryset.filter(rider__user=user)
        elif user.role == 'pharmacy':
            # Pharmacies see locations for their order assignments
            pharmacy_orders = Order.objects.filter(
                pharmacy__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(
                assignment__order_assignments__order__in=pharmacy_orders
            ).distinct()
        elif user.role == 'customer':
            # Customers see locations for their order assignments
            customer_orders = Order.objects.filter(
                customer__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(
                assignment__order_assignments__order__in=customer_orders
            ).distinct()
        
        # Admins see all location updates
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current location for a specific rider."""
        rider_id = request.query_params.get('rider_id')
        if not rider_id:
            return Response(
                {'error': 'Rider ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            current_location = self.get_queryset().filter(
                rider_id=rider_id
            ).latest('timestamp')
            serializer = self.get_serializer(current_location)
            return Response(serializer.data)
        except RiderLocation.DoesNotExist:
            return Response(
                {'error': 'No location data found for this rider'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def by_assignment(self, request):
        """Get location updates for a specific assignment."""
        assignment_id = request.query_params.get('assignment_id')
        if not assignment_id:
            return Response(
                {'error': 'Assignment ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        locations = self.get_queryset().filter(
            assignment_id=assignment_id
        ).order_by('timestamp')
        serializer = self.get_serializer(locations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def nearby_riders(self, request):
        """Find riders near a specific location."""
        lat = request.query_params.get('latitude')
        lng = request.query_params.get('longitude')
        radius_km = float(request.query_params.get('radius_km', 5.0))
        
        if not lat or not lng:
            return Response(
                {'error': 'Latitude and longitude are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response(
                {'error': 'Invalid coordinates'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find riders within the specified radius
        nearby_riders = []
        for location in self.get_queryset().select_related('rider'):
            distance = location.distance_to(lat, lng)
            if distance <= radius_km:
                nearby_riders.append({
                    'rider_id': location.rider.id,
                    'rider_name': location.rider.full_name,
                    'distance_km': round(distance, 2),
                    'latitude': location.latitude,
                    'longitude': location.longitude,
                    'timestamp': location.timestamp
                })
        
        # Sort by distance
        nearby_riders.sort(key=lambda x: x['distance_km'])
        return Response(nearby_riders)


class OrderRiderAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for order-rider assignment relationships."""
    
    queryset = OrderRiderAssignment.objects.select_related('order', 'assignment')
    serializer_class = OrderRiderAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['order', 'assignment', 'pickup_sequence', 'delivery_sequence']
    ordering_fields = ['pickup_sequence', 'delivery_sequence', 'created_at']
    ordering = ['pickup_sequence', 'delivery_sequence']
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        user = self.request.user
        
        if user.role == 'rider':
            # Riders see assignments for their orders
            return self.queryset.filter(assignment__rider__user=user)
        elif user.role == 'pharmacy':
            # Pharmacies see assignments for their orders
            pharmacy_orders = Order.objects.filter(
                pharmacy__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(order__in=pharmacy_orders)
        elif user.role == 'customer':
            # Customers see assignments for their orders
            customer_orders = Order.objects.filter(
                customer__user=user
            ).values_list('id', flat=True)
            return self.queryset.filter(order__in=customer_orders)
        
        # Admins see all assignments
        return self.queryset
    
    @action(detail=True, methods=['post'])
    def mark_picked_up(self, request, pk=None):
        """Mark specific order as picked up."""
        assignment = self.get_object()
        
        if request.user.role != 'rider' or assignment.assignment.rider.user != request.user:
            return Response(
                {'error': 'Only assigned rider can mark pickup'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment.mark_picked_up()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """Mark specific order as delivered."""
        assignment = self.get_object()
        
        if request.user.role != 'rider' or assignment.assignment.rider.user != request.user:
            return Response(
                {'error': 'Only assigned rider can mark delivery'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment.mark_delivered()
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def batch_orders(self, request):
        """Batch orders for efficient delivery."""
        if request.user.role not in ['admin', 'pharmacy']:
            return Response(
                {'error': 'Only admins and pharmacies can batch orders'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = OrderBatchingSerializer(data=request.data)
        if serializer.is_valid():
            try:
                order_ids = serializer.validated_data['order_ids']
                max_batch_size = serializer.validated_data['max_batch_size']
                max_distance_km = serializer.validated_data['max_distance_km']
                
                # Get orders
                orders = Order.objects.filter(id__in=order_ids)
                
                # Check if orders can be batched
                if not OrderBatchingService.can_batch_orders(
                    list(orders), max_batch_size, max_distance_km
                ):
                    return Response(
                        {'error': 'Orders cannot be batched together'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Find available riders
                delivery_address = orders.first().delivery_address
                available_riders = OrderBatchingService.find_available_riders(
                    delivery_address, max_distance_km
                )
                
                if not available_riders.exists():
                    return Response(
                        {'error': 'No available riders found in the area'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # For now, assign to first available rider
                # In production, you might want more sophisticated rider selection
                selected_rider = available_riders.first()
                
                # Create batch assignment
                batch_assignment = OrderBatchingService.create_batch_assignment(
                    list(orders), selected_rider
                )
                
                serializer = RiderAssignmentSerializer(batch_assignment)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to batch orders: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
