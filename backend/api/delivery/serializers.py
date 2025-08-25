from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _

from .models import (
    RiderAssignment, RiderLocation, OrderRiderAssignment, 
    DeliveryZone, OrderBatchingService
)
from api.users.models import Rider
from api.orders.models import Order
from api.locations.models import Address


class DeliveryZoneSerializer(serializers.ModelSerializer):
    """Serializer for delivery zones."""
    
    class Meta:
        model = DeliveryZone
        fields = [
            'id', 'name', 'description', 'center_latitude', 'center_longitude',
            'radius_km', 'base_delivery_fee', 'estimated_delivery_time',
            'max_batch_size', 'max_batch_distance_km', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_center_latitude(self, value):
        """Validate latitude coordinates."""
        if value < -90 or value > 90:
            raise serializers.ValidationError(_('Latitude must be between -90 and 90 degrees'))
        return value
    
    def validate_center_longitude(self, value):
        """Validate longitude coordinates."""
        if value < -180 or value > 180:
            raise serializers.ValidationError(_('Longitude must be between -180 and 180 degrees'))
        return value
    
    def validate_radius_km(self, value):
        """Validate delivery zone radius."""
        if value <= 0:
            raise serializers.ValidationError(_('Radius must be greater than 0'))
        if value > 50:
            raise serializers.ValidationError(_('Radius cannot exceed 50km'))
        return value


class RiderLocationSerializer(serializers.ModelSerializer):
    """Serializer for real-time rider location updates."""
    
    rider_name = serializers.CharField(source='rider.full_name', read_only=True)
    assignment_id = serializers.CharField(source='assignment.assignment_id', read_only=True)
    
    class Meta:
        model = RiderLocation
        fields = [
            'id', 'rider', 'rider_name', 'assignment', 'assignment_id',
            'latitude', 'longitude', 'accuracy', 'speed', 'heading',
            'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def validate_latitude(self, value):
        """Validate latitude coordinates."""
        if value < -90 or value > 90:
            raise serializers.ValidationError(_('Latitude must be between -90 and 90 degrees'))
        return value
    
    def validate_longitude(self, value):
        """Validate longitude coordinates."""
        if value < -180 or value > 180:
            raise serializers.ValidationError(_('Longitude must be between -180 and 180 degrees'))
        return value
    
    def validate_speed(self, value):
        """Validate speed value."""
        if value is not None and value < 0:
            raise serializers.ValidationError(_('Speed cannot be negative'))
        return value


class OrderRiderAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for order-rider assignment relationships."""
    
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_status = serializers.CharField(source='order.order_status', read_only=True)
    customer_name = serializers.CharField(source='order.customer.full_name', read_only=True)
    delivery_address = serializers.CharField(source='order.delivery_address.full_address', read_only=True)
    
    class Meta:
        model = OrderRiderAssignment
        fields = [
            'id', 'order', 'order_number', 'order_status', 'customer_name',
            'delivery_address', 'assignment', 'pickup_sequence', 'delivery_sequence',
            'picked_up_at', 'delivered_at', 'delivery_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_pickup_sequence(self, value):
        """Validate pickup sequence."""
        if value < 1:
            raise serializers.ValidationError(_('Pickup sequence must be at least 1'))
        return value
    
    def validate_delivery_sequence(self, value):
        """Validate delivery sequence."""
        if value < 1:
            raise serializers.ValidationError(_('Delivery sequence must be at least 1'))
        return value


class RiderAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for rider assignments (single and batch)."""
    
    rider_name = serializers.CharField(source='rider.full_name', read_only=True)
    rider_phone = serializers.CharField(source='rider.phone_number', read_only=True)
    rider_vehicle = serializers.CharField(source='rider.vehicle_type', read_only=True)
    
    # Nested serializers for related data
    order_assignments = OrderRiderAssignmentSerializer(
        source='order_assignments.all', 
        many=True, 
        read_only=True
    )
    
    # Computed fields
    total_orders = serializers.SerializerMethodField()
    estimated_completion_formatted = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assignment_type_display = serializers.CharField(source='get_assignment_type_display', read_only=True)
    
    class Meta:
        model = RiderAssignment
        fields = [
            'id', 'assignment_id', 'rider', 'rider_name', 'rider_phone', 'rider_vehicle',
            'assignment_type', 'assignment_type_display', 'status', 'status_display',
            'batch_size', 'max_batch_size', 'pickup_latitude', 'pickup_longitude',
            'total_delivery_fee', 'rider_earnings', 'assigned_at', 'accepted_at',
            'picked_up_at', 'started_delivery_at', 'completed_at', 'estimated_completion',
            'estimated_completion_formatted', 'notes', 'admin_notes', 'order_assignments',
            'total_orders', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'assignment_id', 'assigned_at', 'created_at', 'updated_at'
        ]
    
    def get_total_orders(self, obj):
        """Get total number of orders in this assignment."""
        return obj.batch_size
    
    def get_estimated_completion_formatted(self, obj):
        """Get formatted estimated completion time."""
        if obj.estimated_completion:
            return obj.estimated_completion.strftime('%Y-%m-%d %H:%M:%S')
        return None
    
    def validate_batch_size(self, value):
        """Validate batch size."""
        if value < 1:
            raise serializers.ValidationError(_('Batch size must be at least 1'))
        if value > 5:
            raise serializers.ValidationError(_('Batch size cannot exceed 5'))
        return value
    
    def validate_total_delivery_fee(self, value):
        """Validate delivery fee."""
        if value < 0:
            raise serializers.ValidationError(_('Delivery fee cannot be negative'))
        return value
    
    def validate_rider_earnings(self, value):
        """Validate rider earnings."""
        if value < 0:
            raise serializers.ValidationError(_('Rider earnings cannot be negative'))
        return value


class RiderAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new rider assignments."""
    
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text=_('List of order IDs to assign')
    )
    
    class Meta:
        model = RiderAssignment
        fields = [
            'rider', 'assignment_type', 'batch_size', 'max_batch_size',
            'pickup_latitude', 'pickup_longitude', 'total_delivery_fee',
            'rider_earnings', 'estimated_completion', 'notes', 'order_ids'
        ]
    
    def validate_order_ids(self, value):
        """Validate order IDs."""
        if not value:
            raise serializers.ValidationError(_('At least one order must be specified'))
        
        # Check if orders exist and are valid for assignment
        orders = Order.objects.filter(id__in=value)
        if len(orders) != len(value):
            raise serializers.ValidationError(_('Some orders do not exist'))
        
        # Check if orders are already assigned
        assigned_orders = orders.filter(rider_assignments__isnull=False)
        if assigned_orders.exists():
            raise serializers.ValidationError(_('Some orders are already assigned to riders'))
        
        return value
    
    def validate(self, data):
        """Validate assignment data."""
        order_ids = data.get('order_ids', [])
        assignment_type = data.get('assignment_type')
        batch_size = data.get('batch_size', len(order_ids))
        
        # Validate batch size matches order count
        if len(order_ids) != batch_size:
            raise serializers.ValidationError(_('Batch size must match the number of orders'))
        
        # Validate assignment type
        if assignment_type == RiderAssignment.AssignmentType.BATCH and batch_size == 1:
            raise serializers.ValidationError(_('Single orders should use single assignment type'))
        
        if assignment_type == RiderAssignment.AssignmentType.SINGLE and batch_size > 1:
            raise serializers.ValidationError(_('Multiple orders should use batch assignment type'))
        
        return data
    
    def create(self, validated_data):
        """Create rider assignment with order relationships."""
        order_ids = validated_data.pop('order_ids')
        
        # Create the assignment
        assignment = RiderAssignment.objects.create(**validated_data)
        
        # Create order assignments
        for i, order_id in enumerate(order_ids, 1):
            order = Order.objects.get(id=order_id)
            OrderRiderAssignment.objects.create(
                order=order,
                assignment=assignment,
                pickup_sequence=i,
                delivery_sequence=i
            )
        
        return assignment


class RiderAssignmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating rider assignments."""
    
    class Meta:
        model = RiderAssignment
        fields = [
            'status', 'notes', 'admin_notes', 'estimated_completion'
        ]
    
    def validate_status(self, value):
        """Validate status transitions."""
        instance = self.instance
        if not instance:
            return value
        
        # Define valid status transitions
        valid_transitions = {
            RiderAssignment.AssignmentStatus.ASSIGNED: [
                RiderAssignment.AssignmentStatus.ACCEPTED,
                RiderAssignment.AssignmentStatus.CANCELLED
            ],
            RiderAssignment.AssignmentStatus.ACCEPTED: [
                RiderAssignment.AssignmentStatus.PICKED_UP,
                RiderAssignment.AssignmentStatus.CANCELLED
            ],
            RiderAssignment.AssignmentStatus.PICKED_UP: [
                RiderAssignment.AssignmentStatus.DELIVERING,
                RiderAssignment.AssignmentStatus.CANCELLED
            ],
            RiderAssignment.AssignmentStatus.DELIVERING: [
                RiderAssignment.AssignmentStatus.COMPLETED,
                RiderAssignment.AssignmentStatus.CANCELLED
            ]
        }
        
        current_status = instance.status
        if current_status in valid_transitions and value not in valid_transitions[current_status]:
            raise serializers.ValidationError(
                _('Invalid status transition from {} to {}').format(
                    instance.get_status_display(), 
                    dict(RiderAssignment.AssignmentStatus.choices)[value]
                )
            )
        
        return value


class DeliveryZoneCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating delivery zones."""
    
    class Meta:
        model = DeliveryZone
        fields = [
            'name', 'description', 'center_latitude', 'center_longitude',
            'radius_km', 'base_delivery_fee', 'estimated_delivery_time',
            'max_batch_size', 'max_batch_distance_km', 'is_active'
        ]
    
    def validate(self, data):
        """Validate delivery zone data."""
        # Check if zone overlaps with existing zones (simplified check)
        center_lat = data.get('center_latitude')
        center_lng = data.get('center_longitude')
        radius = data.get('radius_km')
        
        if center_lat and center_lng and radius:
            # Check for overlapping zones (simplified distance check)
            existing_zones = DeliveryZone.objects.filter(is_active=True)
            for zone in existing_zones:
                # Calculate distance between centers
                distance = self._calculate_distance(
                    center_lat, center_lng,
                    zone.center_latitude, zone.center_longitude
                )
                
                # If centers are closer than combined radii, zones overlap
                if distance < (radius + zone.radius_km):
                    raise serializers.ValidationError(
                        _('Delivery zone overlaps with existing zone: {}').format(zone.name)
                    )
        
        return data
    
    def _calculate_distance(self, lat1, lng1, lat2, lng2):
        """Calculate distance between two points using Haversine formula."""
        import math
        
        # Convert to radians
        lat1, lng1 = math.radians(float(lat1)), math.radians(float(lng1))
        lat2, lng2 = math.radians(float(lat2)), math.radians(float(lng2))
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r


class OrderBatchingSerializer(serializers.Serializer):
    """Serializer for order batching operations."""
    
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text=_('List of order IDs to batch together')
    )
    
    max_batch_size = serializers.IntegerField(
        default=3,
        help_text=_('Maximum number of orders in a batch')
    )
    
    max_distance_km = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.0,
        help_text=_('Maximum distance between orders in km')
    )
    
    def validate_order_ids(self, value):
        """Validate order IDs for batching."""
        if not value:
            raise serializers.ValidationError(_('At least one order must be specified'))
        
        if len(value) > 5:
            raise serializers.ValidationError(_('Cannot batch more than 5 orders'))
        
        # Check if orders exist and are valid for batching
        orders = Order.objects.filter(id__in=value)
        if len(orders) != len(value):
            raise serializers.ValidationError(_('Some orders do not exist'))
        
        # Check if orders are already assigned
        assigned_orders = orders.filter(rider_assignments__isnull=False)
        if assigned_orders.exists():
            raise serializers.ValidationError(_('Some orders are already assigned to riders'))
        
        # Check if orders can be batched together
        if not OrderBatchingService.can_batch_orders(
            list(orders), 
            max_batch_size=5, 
            max_distance_km=10.0
        ):
            raise serializers.ValidationError(_('Some orders cannot be batched together (distance or other constraints)'))
        
        return value
    
    def validate_max_batch_size(self, value):
        """Validate max batch size."""
        if value < 1 or value > 5:
            raise serializers.ValidationError(_('Max batch size must be between 1 and 5'))
        return value
    
    def validate_max_distance_km(self, value):
        """Validate max distance."""
        if value < 0.1 or value > 10.0:
            raise serializers.ValidationError(_('Max distance must be between 0.1 and 10.0 km'))
        return value


class RiderAssignmentBulkSerializer(serializers.Serializer):
    """Serializer for bulk rider assignment operations."""
    
    assignment_type = serializers.ChoiceField(
        choices=RiderAssignment.AssignmentType.choices,
        help_text=_('Type of assignment (single or batch)')
    )
    
    rider_id = serializers.IntegerField(
        help_text=_('ID of the rider to assign')
    )
    
    order_batches = serializers.ListField(
        child=OrderBatchingSerializer(),
        help_text=_('List of order batches to assign')
    )
    
    def validate_rider_id(self, value):
        """Validate rider ID."""
        try:
            rider = Rider.objects.get(id=value)
            if rider.status != 'approved':
                raise serializers.ValidationError(_('Rider must be approved'))
        except Rider.DoesNotExist:
            raise serializers.ValidationError(_('Rider does not exist'))
        
        return value
    
    def validate(self, data):
        """Validate bulk assignment data."""
        assignment_type = data.get('assignment_type')
        order_batches = data.get('order_batches', [])
        
        if not order_batches:
            raise serializers.ValidationError(_('At least one order batch must be specified'))
        
        # Validate assignment type consistency
        for batch in order_batches:
            batch_size = len(batch['order_ids'])
            if assignment_type == RiderAssignment.AssignmentType.SINGLE and batch_size > 1:
                raise serializers.ValidationError(_('Single assignment type cannot have multiple orders in a batch'))
            elif assignment_type == RiderAssignment.AssignmentType.BATCH and batch_size == 1:
                raise serializers.ValidationError(_('Batch assignment type should have multiple orders'))
        
        return data


class DeliveryAnalyticsSerializer(serializers.Serializer):
    """Serializer for delivery analytics and metrics."""
    
    total_assignments = serializers.IntegerField(read_only=True)
    completed_assignments = serializers.IntegerField(read_only=True)
    active_assignments = serializers.IntegerField(read_only=True)
    cancelled_assignments = serializers.IntegerField(read_only=True)
    
    total_delivery_fees = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_rider_earnings = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    average_delivery_time = serializers.DurationField(read_only=True)
    average_batch_size = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    
    delivery_zones = serializers.ListField(child=serializers.DictField(), read_only=True)
    rider_performance = serializers.ListField(child=serializers.DictField(), read_only=True)
