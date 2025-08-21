from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db.models import Q, Count
from django.utils import timezone
from api.users.models import User, Rider
from api.orders.models import Order
from api.locations.models import Address
import math


class DeliveryZone(models.Model):
    """
    Delivery zones and coverage areas for riders.
    This is separate from the main Rider model to avoid conflicts.
    """
    
    name = models.CharField(
        max_length=100,
        help_text=_('Name of the delivery zone')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text=_('Description of the delivery zone')
    )
    
    # Geographic boundaries
    center_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        help_text=_('Center latitude of the delivery zone')
    )
    
    center_longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        help_text=_('Center longitude of the delivery zone')
    )
    
    radius_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text=_('Radius of the delivery zone in kilometers')
    )
    
    # Delivery settings
    base_delivery_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text=_('Base delivery fee for this zone')
    )
    
    estimated_delivery_time = models.PositiveIntegerField(
        help_text=_('Estimated delivery time in minutes')
    )
    
    # Batching settings
    max_batch_size = models.PositiveIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_('Maximum number of orders that can be batched together')
    )
    
    max_batch_distance_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.0,
        help_text=_('Maximum distance between orders in a batch (km)')
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this delivery zone is active')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Delivery Zone')
        verbose_name_plural = _('Delivery Zones')
        ordering = ['name']
        db_table = 'delivery_zone'
        
        indexes = [
            models.Index(fields=['is_active'], name='idx_zone_active'),
            models.Index(fields=['center_latitude', 'center_longitude'], name='idx_zone_center'),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.radius_km}km radius)"
    
    def is_point_in_zone(self, lat, lng):
        """
        Check if a given point is within this delivery zone.
        Uses simple distance calculation (can be improved with proper geospatial queries).
        """
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1 = radians(float(self.center_latitude)), radians(float(self.center_longitude))
        lat2, lon2 = radians(lat), radians(lng)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth's radius in kilometers
        
        distance = c * r
        return distance <= float(self.radius_km)
    
    def get_batch_settings(self):
        """Get batching configuration for this zone."""
        return {
            'max_batch_size': self.max_batch_size,
            'max_batch_distance_km': float(self.max_batch_distance_km),
            'base_delivery_fee': self.base_delivery_fee,
            'estimated_delivery_time': self.estimated_delivery_time
        }


class RiderAssignment(models.Model):
    """
    Track rider assignments to orders with support for batching.
    Supports both single orders and batched orders (max 3) for nearby deliveries.
    """
    
    class AssignmentStatus(models.TextChoices):
        ASSIGNED = 'assigned', _('Assigned')
        ACCEPTED = 'accepted', _('Accepted by Rider')
        PICKED_UP = 'picked_up', _('Orders Picked Up')
        DELIVERING = 'delivering', _('Out for Delivery')
        COMPLETED = 'completed', _('All Orders Delivered')
        CANCELLED = 'cancelled', _('Assignment Cancelled')
        REASSIGNED = 'reassigned', _('Reassigned to Another Rider')
    
    class AssignmentType(models.TextChoices):
        SINGLE = 'single', _('Single Order')
        BATCH = 'batch', _('Batched Orders')
    
    # Assignment identification
    assignment_id = models.CharField(
        max_length=50,
        unique=True,
        help_text=_('Unique assignment identifier')
    )
    
    rider = models.ForeignKey(
        Rider,
        on_delete=models.CASCADE,
        related_name='assignments',
        help_text=_('Rider assigned to these orders')
    )
    
    assignment_type = models.CharField(
        max_length=20,
        choices=AssignmentType.choices,
        default=AssignmentType.SINGLE,
        help_text=_('Type of assignment (single or batch)')
    )
    
    status = models.CharField(
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ASSIGNED,
        help_text=_('Current assignment status')
    )
    
    # Batching information
    batch_size = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_('Number of orders in this assignment')
    )
    
    max_batch_size = models.PositiveIntegerField(
        default=3,
        help_text=_('Maximum batch size allowed for this assignment')
    )
    
    # Geographic information
    pickup_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        help_text=_('Pickup location latitude')
    )
    
    pickup_longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True,
        help_text=_('Pickup location longitude')
    )
    
    # Financial information
    total_delivery_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0.00,
        help_text=_('Total delivery fee for all orders')
    )
    
    rider_earnings = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0.00,
        help_text=_('Rider earnings for this assignment')
    )
    
    # Timing information
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text=_('When the assignment was created')
    )
    
    accepted_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When the rider accepted the assignment')
    )
    
    picked_up_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When all orders were picked up')
    )
    
    started_delivery_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When delivery started')
    )
    
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When all orders were delivered')
    )
    
    estimated_completion = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Estimated completion time')
    )
    
    # Assignment metadata
    notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Assignment notes and instructions')
    )
    
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Admin notes for this assignment')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Rider Assignment')
        verbose_name_plural = _('Rider Assignments')
        ordering = ['-created_at']
        db_table = 'rider_assignment'
        
        indexes = [
            models.Index(fields=['rider'], name='idx_assignment_rider'),
            models.Index(fields=['status'], name='idx_assignment_status'),
            models.Index(fields=['assignment_type'], name='idx_assignment_type'),
            models.Index(fields=['assigned_at'], name='idx_assignment_assigned'),
            models.Index(fields=['batch_size'], name='idx_assignment_batch_size'),
        ]
        
        constraints = [
            models.CheckConstraint(
                check=models.Q(batch_size__gte=1) & models.Q(batch_size__lte=5),
                name='valid_batch_size'
            ),
            models.CheckConstraint(
                check=models.Q(total_delivery_fee__gte=0),
                name='valid_delivery_fee'
            ),
        ]
    
    def __str__(self):
        if self.assignment_type == self.AssignmentType.BATCH:
            return f"Batch Assignment #{self.assignment_id} - {self.rider.full_name} ({self.batch_size} orders)"
        return f"Assignment #{self.assignment_id} - {self.rider.full_name}"
    
    @property
    def is_batch(self):
        """Check if this is a batch assignment."""
        return self.assignment_type == self.AssignmentType.BATCH
    
    @property
    def is_single(self):
        """Check if this is a single order assignment."""
        return self.assignment_type == self.AssignmentType.SINGLE
    
    @property
    def can_be_batched(self):
        """Check if this assignment can accept more orders."""
        return self.batch_size < self.max_batch_size
    
    @property
    def is_active(self):
        """Check if assignment is currently active."""
        return self.status in [
            self.AssignmentStatus.ASSIGNED,
            self.AssignmentStatus.ACCEPTED,
            self.AssignmentStatus.PICKED_UP,
            self.AssignmentStatus.DELIVERING
        ]
    
    @property
    def is_completed(self):
        """Check if assignment is completed."""
        return self.status == self.AssignmentStatus.COMPLETED
    
    def accept_assignment(self):
        """Rider accepts the assignment."""
        if self.status != self.AssignmentStatus.ASSIGNED:
            raise ValidationError(_('Assignment can only be accepted when status is "Assigned"'))
        
        self.status = self.AssignmentStatus.ACCEPTED
        self.accepted_at = timezone.now()
        self.save()
    
    def mark_picked_up(self):
        """Mark all orders as picked up."""
        if self.status not in [self.AssignmentStatus.ACCEPTED, self.AssignmentStatus.PICKED_UP]:
            raise ValidationError(_('Orders can only be picked up after acceptance'))
        
        self.status = self.AssignmentStatus.PICKED_UP
        self.picked_up_at = timezone.now()
        self.save()
    
    def start_delivery(self):
        """Start the delivery process."""
        if self.status != self.AssignmentStatus.PICKED_UP:
            raise ValidationError(_('Delivery can only start after pickup'))
        
        self.status = self.AssignmentStatus.DELIVERING
        self.started_delivery_at = timezone.now()
        self.save()
    
    def complete_assignment(self):
        """Mark assignment as completed."""
        if self.status != self.AssignmentStatus.DELIVERING:
            raise ValidationError(_('Assignment can only be completed while delivering'))
        
        self.status = self.AssignmentStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save()
        
        # Update rider performance metrics
        self.rider.update_performance_metrics(
            delivery_earnings=self.rider_earnings
        )
    
    def cancel_assignment(self, reason):
        """Cancel the assignment."""
        if self.status in [self.AssignmentStatus.COMPLETED, self.AssignmentStatus.CANCELLED]:
            raise ValidationError(_('Cannot cancel completed or cancelled assignment'))
        
        self.status = self.AssignmentStatus.CANCELLED
        self.notes = f"{self.notes}\nAssignment cancelled: {reason}"
        self.save()
    
    def save(self, *args, **kwargs):
        """Override save to generate assignment ID if not set."""
        if not self.assignment_id:
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.assignment_id = f"ASS{timestamp}"
        
        super().save(*args, **kwargs)


class RiderLocation(models.Model):
    """
    Real-time rider location tracking for delivery monitoring.
    Tracks rider location with order context and timestamps.
    """
    
    rider = models.ForeignKey(
        Rider,
        on_delete=models.CASCADE,
        related_name='location_updates',
        help_text=_('Rider whose location is being tracked')
    )
    
    assignment = models.ForeignKey(
        RiderAssignment,
        on_delete=models.CASCADE,
        related_name='location_updates',
        blank=True,
        null=True,
        help_text=_('Current assignment (if any)')
    )
    
    # GPS coordinates
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90)
        ],
        help_text=_('Current latitude coordinate')
    )
    
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180)
        ],
        help_text=_('Current longitude coordinate')
    )
    
    # Location metadata
    accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('GPS accuracy in meters')
    )
    
    speed = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('Current speed in km/h')
    )
    
    heading = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('Direction of travel in degrees (0-360)')
    )
    
    # Timestamps
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text=_('When this location was recorded')
    )
    
    class Meta:
        verbose_name = _('Rider Location')
        verbose_name_plural = _('Rider Locations')
        ordering = ['-timestamp']
        db_table = 'rider_location'
        
        indexes = [
            models.Index(fields=['rider'], name='idx_location_rider'),
            models.Index(fields=['assignment'], name='idx_location_assignment'),
            models.Index(fields=['timestamp'], name='idx_location_timestamp'),
            models.Index(fields=['latitude', 'longitude'], name='idx_location_coordinates'),
        ]
        
        constraints = [
            models.CheckConstraint(
                check=models.Q(latitude__gte=-90) & models.Q(latitude__lte=90),
                name='valid_location_latitude'
            ),
            models.CheckConstraint(
                check=models.Q(longitude__gte=-180) & models.Q(longitude__lte=180),
                name='valid_location_longitude'
            ),
        ]
    
    def __str__(self):
        return f"{self.rider.full_name} at ({self.latitude}, {self.longitude}) - {self.timestamp}"
    
    @property
    def coordinates(self):
        """Return coordinates as a tuple."""
        return (float(self.latitude), float(self.longitude))
    
    def distance_to(self, target_lat, target_lng):
        """Calculate distance to a target point using Haversine formula."""
        return self._haversine_distance(
            self.latitude, self.longitude,
            target_lat, target_lng
        )
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula."""
        # Convert to radians
        lat1, lon1 = math.radians(float(lat1)), math.radians(float(lon1))
        lat2, lon2 = math.radians(lat2), math.radians(lon2)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r


class OrderRiderAssignment(models.Model):
    """
    Junction table linking orders to rider assignments.
    Supports both single orders and batched orders.
    """
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='rider_assignments',
        help_text=_('Order being delivered')
    )
    
    assignment = models.ForeignKey(
        RiderAssignment,
        on_delete=models.CASCADE,
        related_name='order_assignments',
        help_text=_('Rider assignment for this order')
    )
    
    # Order-specific delivery information
    pickup_sequence = models.PositiveIntegerField(
        default=1,
        help_text=_('Sequence for pickup (1 = first, 2 = second, etc.)')
    )
    
    delivery_sequence = models.PositiveIntegerField(
        default=1,
        help_text=_('Sequence for delivery (1 = first, 2 = second, etc.)')
    )
    
    # Delivery status for this specific order
    picked_up_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When this specific order was picked up')
    )
    
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When this specific order was delivered')
    )
    
    delivery_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Notes specific to this order delivery')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Order Rider Assignment')
        verbose_name_plural = _('Order Rider Assignments')
        ordering = ['assignment', 'pickup_sequence', 'delivery_sequence']
        db_table = 'order_rider_assignment'
        
        indexes = [
            models.Index(fields=['order'], name='idx_order_rider_order'),
            models.Index(fields=['assignment'], name='idx_order_rider_assignment'),
            models.Index(fields=['pickup_sequence'], name='idx_order_pickup_seq'),
            models.Index(fields=['delivery_sequence'], name='idx_order_delivery_seq'),
        ]
        
        unique_together = [
            ['order', 'assignment'],
            ['assignment', 'pickup_sequence'],
            ['assignment', 'delivery_sequence']
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - Assignment #{self.assignment.assignment_id} (Pickup: {self.pickup_sequence}, Delivery: {self.delivery_sequence})"
    
    def mark_picked_up(self):
        """Mark this specific order as picked up."""
        if not self.picked_up_at:
            self.picked_up_at = timezone.now()
            self.save()
    
    def mark_delivered(self):
        """Mark this specific order as delivered."""
        if not self.delivered_at:
            self.delivered_at = timezone.now()
            self.save()


# Business Logic Functions for Order Batching
class OrderBatchingService:
    """
    Service class for handling order batching logic.
    Groups nearby orders for efficient delivery by single riders.
    """
    
    @staticmethod
    def can_batch_orders(orders, max_batch_size=3, max_distance_km=2.0):
        """
        Check if a group of orders can be batched together.
        
        Args:
            orders: List of Order objects
            max_batch_size: Maximum number of orders in a batch
            max_distance_km: Maximum distance between orders in km
            
        Returns:
            bool: True if orders can be batched, False otherwise
        """
        if len(orders) > max_batch_size:
            return False
        
        if len(orders) <= 1:
            return True
        
        # Check if all orders are within the maximum distance of each other
        order_addresses = [order.delivery_address for order in orders]
        
        for i in range(len(order_addresses)):
            for j in range(i + 1, len(order_addresses)):
                addr1 = order_addresses[i]
                addr2 = order_addresses[j]
                
                if not addr1.has_coordinates() or not addr2.has_coordinates():
                    return False
                
                distance = addr1.get_distance_to(addr2.latitude, addr2.longitude)
                if distance is None or distance > max_distance_km:
                    return False
        
        return True
    
    @staticmethod
    def find_batchable_orders(orders, max_batch_size=3, max_distance_km=2.0):
        """
        Find groups of orders that can be batched together.
        
        Args:
            orders: List of Order objects
            max_batch_size: Maximum number of orders in a batch
            max_distance_km: Maximum distance between orders in km
            
        Returns:
            list: List of order batches (each batch is a list of orders)
        """
        if not orders:
            return []
        
        # Sort orders by creation time (FIFO)
        sorted_orders = sorted(orders, key=lambda x: x.created_at)
        batches = []
        used_orders = set()
        
        for order in sorted_orders:
            if order.id in used_orders:
                continue
            
            # Start a new batch with this order
            current_batch = [order]
            used_orders.add(order.id)
            
            # Try to add more orders to this batch
            for other_order in sorted_orders:
                if other_order.id in used_orders:
                    continue
                
                if len(current_batch) >= max_batch_size:
                    break
                
                # Check if this order can be added to the current batch
                test_batch = current_batch + [other_order]
                if OrderBatchingService.can_batch_orders(test_batch, max_batch_size, max_distance_km):
                    current_batch.append(other_order)
                    used_orders.add(other_order.id)
            
            batches.append(current_batch)
        
        return batches
    
    @staticmethod
    def create_batch_assignment(orders, rider, delivery_zone=None):
        """
        Create a batch assignment for multiple orders.
        
        Args:
            orders: List of Order objects to batch
            rider: Rider to assign the batch to
            delivery_zone: Optional delivery zone for configuration
            
        Returns:
            RiderAssignment: Created batch assignment
        """
        if not orders:
            raise ValidationError(_('Cannot create assignment with no orders'))
        
        # Validate batching
        max_batch_size = 3
        max_distance_km = 2.0
        
        if delivery_zone:
            zone_settings = delivery_zone.get_batch_settings()
            max_batch_size = zone_settings['max_batch_size']
            max_distance_km = zone_settings['max_batch_distance_km']
        
        if not OrderBatchingService.can_batch_orders(orders, max_batch_size, max_distance_km):
            raise ValidationError(_('Orders cannot be batched together'))
        
        # Create the assignment
        assignment = RiderAssignment.objects.create(
            rider=rider,
            assignment_type=RiderAssignment.AssignmentType.BATCH,
            batch_size=len(orders),
            max_batch_size=max_batch_size,
            total_delivery_fee=sum(order.delivery_fee for order in orders),
            rider_earnings=sum(order.delivery_fee for order in orders) * 0.8,  # 80% to rider
            estimated_completion=timezone.now() + timezone.timedelta(hours=2)
        )
        
        # Create order assignments with pickup and delivery sequences
        pickup_sequence = 1
        delivery_sequence = 1
        
        for order in orders:
            OrderRiderAssignment.objects.create(
                order=order,
                assignment=assignment,
                pickup_sequence=pickup_sequence,
                delivery_sequence=delivery_sequence
            )
            pickup_sequence += 1
            delivery_sequence += 1
        
        return assignment
    
    @staticmethod
    def find_available_riders(delivery_address, max_distance_km=5.0):
        """
        Find available riders near a delivery address.
        
        Args:
            delivery_address: Address object for delivery location
            max_distance_km: Maximum distance to search for riders
            
        Returns:
            QuerySet: Available riders within the specified distance
        """
        if not delivery_address.has_coordinates():
            return Rider.objects.none()
        
        # Get all active riders
        available_riders = Rider.objects.filter(
            status='approved',
            user__status='active'
        )
        
        # Filter by distance (this is a simplified approach)
        # In production, you might want to use PostGIS or similar for efficient geospatial queries
        nearby_riders = []
        
        for rider in available_riders:
            # Get rider's last known location
            last_location = rider.location_updates.order_by('-timestamp').first()
            
            if last_location:
                distance = last_location.distance_to(
                    delivery_address.latitude,
                    delivery_address.longitude
                )
                
                if distance <= max_distance_km:
                    nearby_riders.append(rider)
        
        return Rider.objects.filter(id__in=[r.id for r in nearby_riders])
