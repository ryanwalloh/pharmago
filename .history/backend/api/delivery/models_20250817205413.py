from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from api.users.models import User
from api.orders.models import Order


class Rider(models.Model):
    """
    Delivery rider information and verification.
    Handles rider registration, verification, and current status.
    """
    
    class VehicleType(models.TextChoices):
        MOTORCYCLE = 'motorcycle', _('Motorcycle')
        BICYCLE = 'bicycle', _('Bicycle')
        E_BIKE = 'e_bike', _('E-Bike')
        CAR = 'car', _('Car')
        SCOOTER = 'scooter', _('Scooter')
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        APPROVED = 'approved', _('Approved')
        REJECTED = 'rejected', _('Rejected')
        SUSPENDED = 'suspended', _('Suspended')
        INACTIVE = 'inactive', _('Inactive')
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='rider_profile',
        help_text=_('Associated user account')
    )
    
    first_name = models.CharField(
        max_length=100,
        help_text=_('Rider\'s first name')
    )
    
    last_name = models.CharField(
        max_length=100,
        help_text=_('Rider\'s last name')
    )
    
    email = models.EmailField(
        help_text=_('Rider\'s email address')
    )
    
    phone_number = models.CharField(
        max_length=20,
        help_text=_('Contact phone number')
    )
    
    # Vehicle information
    vehicle_type = models.CharField(
        max_length=50,
        choices=VehicleType.choices,
        help_text=_('Type of delivery vehicle')
    )
    
    vehicle_brand = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text=_('Vehicle brand/model')
    )
    
    plate_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Vehicle plate number')
    )
    
    vehicle_color = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text=_('Vehicle color')
    )
    
    # Verification documents
    valid_id = models.URLField(
        max_length=255,
        help_text=_('Government ID file path')
    )
    
    driver_license = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Driver\'s license file path')
    )
    
    vehicle_registration = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Vehicle registration file path')
    )
    
    insurance_document = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Insurance document file path')
    )
    
    # Status and verification
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDING,
        help_text=_('Verification status')
    )
    
    date_status = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Status change timestamp')
    )
    
    status_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Notes about status change')
    )
    
    # Current location and status
    current_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90)
        ],
        help_text=_('Current GPS latitude coordinate')
    )
    
    current_longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180)
        ],
        help_text=_('Current GPS longitude coordinate')
    )
    
    is_online = models.BooleanField(
        default=False,
        help_text=_('Online/available status')
    )
    
    is_available = models.BooleanField(
        default=True,
        help_text=_('Available for new assignments')
    )
    
    # Profile and preferences
    profile_picture = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Rider\'s profile photo')
    )
    
    bio = models.TextField(
        blank=True,
        null=True,
        help_text=_('Rider bio/description')
    )
    
    preferred_areas = models.JSONField(
        blank=True,
        null=True,
        help_text=_('Preferred delivery areas')
    )
    
    max_delivery_distance = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.0,
        validators=[MinValueValidator(1)],
        help_text=_('Maximum delivery distance in kilometers')
    )
    
    # Performance metrics
    total_deliveries = models.PositiveIntegerField(
        default=0,
        help_text=_('Total deliveries completed')
    )
    
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=5.00,
        validators=[
            MinValueValidator(1.00),
            MaxValueValidator(5.00)
        ],
        help_text=_('Average customer rating')
    )
    
    total_earnings = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Total earnings')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Rider')
        verbose_name_plural = _('Riders')
        ordering = ['-created_at']
        db_table = 'rider'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['user'], name='idx_rider_user'),
            models.Index(fields=['status'], name='idx_rider_status'),
            models.Index(fields=['is_online'], name='idx_rider_online'),
            models.Index(fields=['is_available'], name='idx_rider_available'),
            models.Index(fields=['vehicle_type'], name='idx_rider_vehicle'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(current_latitude__isnull=True) | 
                      (models.Q(current_latitude__gte=-90) & models.Q(current_latitude__lte=90)),
                name='valid_rider_latitude'
            ),
            models.CheckConstraint(
                check=models.Q(current_longitude__isnull=True) | 
                      (models.Q(current_longitude__gte=-180) & models.Q(current_longitude__lte=180)),
                name='valid_rider_longitude'
            ),
            models.CheckConstraint(
                check=models.Q(rating__gte=1.00) & models.Q(rating__lte=5.00),
                name='valid_rider_rating'
            ),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_vehicle_type_display()})"
    
    @property
    def full_name(self):
        """Return the rider's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def coordinates(self):
        """Return coordinates as a tuple if both are available."""
        if self.current_latitude and self.current_longitude:
            return (float(self.current_latitude), float(self.current_longitude))
        return None
    
    @property
    def is_approved(self):
        """Check if rider is approved."""
        return self.status == self.Status.APPROVED
    
    @property
    def is_active(self):
        """Check if rider is active (approved and not suspended)."""
        return self.status == self.Status.APPROVED and not self.is_suspended
    
    @property
    def is_suspended(self):
        """Check if rider is suspended."""
        return self.status == self.Status.SUSPENDED
    
    @property
    def can_accept_assignments(self):
        """Check if rider can accept new assignments."""
        return (self.is_approved and 
                self.is_online and 
                self.is_available and 
                not self.is_suspended)
    
    def get_distance_to_location(self, target_lat, target_lng):
        """Calculate distance to a target location using Haversine formula."""
        if not self.coordinates:
            return None
        
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1 = radians(float(self.current_latitude)), radians(float(self.current_longitude))
        lat2, lon2 = radians(target_lat), radians(target_lng)
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r
    
    def update_location(self, latitude, longitude):
        """Update rider's current location."""
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.save()
    
    def go_online(self):
        """Set rider as online."""
        self.is_online = True
        self.save()
    
    def go_offline(self):
        """Set rider as offline."""
        self.is_online = False
        self.is_available = False
        self.save()
    
    def set_available(self):
        """Set rider as available for assignments."""
        if self.is_online:
            self.is_available = True
            self.save()
    
    def set_unavailable(self):
        """Set rider as unavailable for assignments."""
        self.is_available = False
        self.save()
    
    def approve(self, notes=None):
        """Approve the rider."""
        self.status = self.Status.APPROVED
        self.date_status = models.DateTimeField(auto_now=True)
        self.status_notes = notes
        self.save()
    
    def reject(self, notes):
        """Reject the rider."""
        self.status = self.Status.REJECTED
        self.date_status = models.DateTimeField(auto_now=True)
        self.status_notes = notes
        self.save()
    
    def suspend(self, notes):
        """Suspend the rider."""
        self.status = self.Status.SUSPENDED
        self.date_status = models.DateTimeField(auto_now=True)
        self.status_notes = notes
        self.is_online = False
        self.is_available = False
        self.save()
    
    def update_rating(self, new_rating):
        """Update rider's average rating."""
        if 1.00 <= new_rating <= 5.00:
            # Calculate new average rating
            total_ratings = self.total_deliveries
            current_total = self.rating * total_ratings
            new_total = current_total + new_rating
            new_average = new_total / (total_ratings + 1)
            
            self.rating = new_average
            self.save()
    
    def increment_deliveries(self):
        """Increment total deliveries count."""
        self.total_deliveries += 1
        self.save()
    
    def add_earnings(self, amount):
        """Add to total earnings."""
        self.total_earnings += amount
        self.save()
    
    def clean(self):
        """Validate rider data."""
        if self.status == self.Status.APPROVED and not self.coordinates:
            raise ValidationError(
                _('Approved riders must have GPS coordinates.')
            )
        
        super().clean()


class RiderAssignment(models.Model):
    """
    Rider assignment and delivery tracking.
    Links riders to orders and tracks delivery progress.
    """
    
    class AssignmentStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        ACCEPTED = 'accepted', _('Accepted')
        PICKED_UP = 'picked_up', _('Picked Up')
        DELIVERED = 'delivered', _('Delivered')
        CANCELLED = 'cancelled', _('Cancelled')
    
    rider = models.ForeignKey(
        Rider,
        on_delete=models.CASCADE,
        related_name='assignments',
        help_text=_('Assigned rider')
    )
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='rider_assignments',
        help_text=_('Order to be delivered')
    )
    
    # Financial information
    rider_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text=_('Amount paid to rider')
    )
    
    service_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text=_('Platform service fee')
    )
    
    # Assignment details
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text=_('Assignment timestamp')
    )
    
    accepted_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('When rider accepted assignment')
    )
    
    picked_up_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Pickup timestamp')
    )
    
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Delivery completion timestamp')
    )
    
    # Delivery tracking
    proof_of_delivery = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Delivery proof image path')
    )
    
    estimated_delivery_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Estimated delivery time')
    )
    
    status = models.CharField(
        max_length=50,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.PENDING,
        help_text=_('Assignment status')
    )
    
    # Notes and feedback
    delivery_notes = models.TextField(
        blank=True,
        null=True,
        help_text=_('Delivery-related notes')
    )
    
    customer_feedback = models.TextField(
        blank=True,
        null=True,
        help_text=_('Customer feedback about delivery')
    )
    
    customer_rating = models.PositiveIntegerField(
        blank=True,
        null=True,
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5)
        ],
        help_text=_('Customer rating for delivery (1-5)')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('Rider Assignment')
        verbose_name_plural = _('Rider Assignments')
        ordering = ['-created_at']
        db_table = 'rider_assignment'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['rider'], name='idx_assignment_rider'),
            models.Index(fields=['order'], name='idx_assignment_order'),
            models.Index(fields=['status'], name='idx_assignment_status'),
            models.Index(fields=['assigned_at'], name='idx_assignment_assigned'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(rider_fee__gte=0),
                name='valid_assignment_rider_fee'
            ),
            models.CheckConstraint(
                check=models.Q(service_fee__gte=0),
                name='valid_assignment_service_fee'
            ),
        ]
    
    def __str__(self):
        return f"{self.rider.full_name} - Order #{self.order.order_number}"
    
    @property
    def is_completed(self):
        """Check if assignment is completed."""
        return self.status == self.AssignmentStatus.DELIVERED
    
    @property
    def is_cancelled(self):
        """Check if assignment is cancelled."""
        return self.status == self.AssignmentStatus.CANCELLED
    
    @property
    def delivery_time(self):
        """Calculate delivery time if completed."""
        if self.picked_up_at and self.delivered_at:
            return self.delivered_at - self.picked_up_at
        return None
    
    @property
    def total_fee(self):
        """Calculate total fee for this assignment."""
        return self.rider_fee + self.service_fee
    
    def accept_assignment(self):
        """Accept the assignment."""
        if self.status == self.AssignmentStatus.PENDING:
            from django.utils import timezone
            self.status = self.AssignmentStatus.ACCEPTED
            self.accepted_at = timezone.now()
            self.save()
            
            # Update rider availability
            self.rider.set_unavailable()
            
            # Update order status
            self.order.update_status('accepted', 'Rider assigned and accepted')
    
    def pickup_order(self):
        """Mark order as picked up."""
        if self.status == self.AssignmentStatus.ACCEPTED:
            from django.utils import timezone
            self.status = self.AssignmentStatus.PICKED_UP
            self.picked_up_at = timezone.now()
            self.save()
            
            # Update order status
            self.order.update_status('picked_up', 'Order picked up by rider')
    
    def deliver_order(self, proof_image=None):
        """Mark order as delivered."""
        if self.status == self.AssignmentStatus.PICKED_UP:
            from django.utils import timezone
            self.status = self.AssignmentStatus.DELIVERED
            self.delivered_at = timezone.now()
            
            if proof_image:
                self.proof_of_delivery = proof_image
            
            self.save()
            
            # Update order status
            self.order.update_status('delivered', 'Order delivered successfully')
            
            # Update rider metrics
            self.rider.increment_deliveries()
            self.rider.add_earnings(self.rider_fee)
            self.rider.set_available()
            
            # Update customer rating if provided
            if self.customer_rating:
                self.rider.update_rating(self.customer_rating)
    
    def cancel_assignment(self, reason):
        """Cancel the assignment."""
        if self.status in [self.AssignmentStatus.PENDING, self.AssignmentStatus.ACCEPTED]:
            self.status = self.AssignmentStatus.CANCELLED
            self.delivery_notes = f"{self.delivery_notes}\nCancelled: {reason}"
            self.save()
            
            # Update rider availability
            self.rider.set_available()
            
            # Update order status
            self.order.update_status('cancelled', f'Rider assignment cancelled: {reason}')
    
    def get_delivery_estimate(self):
        """Get delivery time estimate."""
        if self.estimated_delivery_at:
            return self.estimated_delivery_at
        
        # Calculate estimate based on distance and vehicle type
        if self.rider.coordinates and self.order.delivery_address.coordinates:
            distance = self.rider.get_distance_to_location(
                self.order.delivery_address.latitude,
                self.order.delivery_address.longitude
            )
            
            if distance:
                # Base delivery time: 30 minutes + 2 minutes per km
                base_time = 30
                distance_time = distance * 2
                total_minutes = base_time + distance_time
                
                from datetime import datetime, timedelta
                return datetime.now() + timedelta(minutes=total_minutes)
        
        return None


class RiderLocation(models.Model):
    """
    Real-time rider location tracking.
    Stores GPS coordinates and movement data for delivery tracking.
    """
    
    rider = models.ForeignKey(
        Rider,
        on_delete=models.CASCADE,
        related_name='location_updates',
        help_text=_('Rider whose location is being tracked')
    )
    
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90)
        ],
        help_text=_('GPS latitude coordinate')
    )
    
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180)
        ],
        help_text=_('GPS longitude coordinate')
    )
    
    speed_kmph = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        help_text=_('Current speed in km/h')
    )
    
    direction = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Direction (N, S, E, W) or heading angle')
    )
    
    accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0)],
        help_text=_('GPS accuracy in meters')
    )
    
    altitude = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True,
        help_text=_('Altitude in meters')
    )
    
    battery_level = models.PositiveIntegerField(
        blank=True,
        null=True,
        validators=[MaxValueValidator(100)],
        help_text=_('Device battery level (0-100)')
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text=_('Location timestamp')
    )
    
    class Meta:
        verbose_name = _('Rider Location')
        verbose_name_plural = _('Rider Locations')
        ordering = ['-timestamp']
        db_table = 'rider_location'
        
        # Indexes for performance
        indexes = [
            models.Index(fields=['rider'], name='idx_location_rider'),
            models.Index(fields=['timestamp'], name='idx_location_timestamp'),
            models.Index(fields=['latitude', 'longitude'], name='idx_location_coordinates'),
        ]
        
        # Constraints
        constraints = [
            models.CheckConstraint(
                check=models.Q(latitude__gte=-90) & models.Q(latitude__lte=90),
                name='valid_location_latitude'
            ),
            models.CheckConstraint(
                check=models.Q(longitude__gte=-180) & models.Q(longitude__lte=180),
                name='valid_location_longitude'
            ),
            models.CheckConstraint(
                check=models.Q(speed_kmph__isnull=True) | models.Q(speed_kmph__gte=0),
                name='valid_location_speed'
            ),
            models.CheckConstraint(
                check=models.Q(accuracy__isnull=True) | models.Q(accuracy__gte=0),
                name='valid_location_accuracy'
            ),
            models.CheckConstraint(
                check=models.Q(battery_level__isnull=True) | 
                      (models.Q(battery_level__gte=0) & models.Q(battery_level__lte=100)),
                name='valid_location_battery'
            ),
        ]
    
    def __str__(self):
        return f"{self.rider.full_name} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
    
    @property
    def coordinates(self):
        """Return coordinates as a tuple."""
        return (float(self.latitude), float(self.longitude))
    
    def get_distance_to_previous(self):
        """Calculate distance to previous location update."""
        previous_location = RiderLocation.objects.filter(
            rider=self.rider,
            timestamp__lt=self.timestamp
        ).order_by('-timestamp').first()
        
        if previous_location:
            from math import radians, cos, sin, asin, sqrt
            
            # Convert to radians
            lat1, lon1 = radians(float(previous_location.latitude)), radians(float(previous_location.longitude))
            lat2, lon2 = radians(float(self.latitude)), radians(float(self.longitude))
            
            # Haversine formula
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            
            # Earth's radius in kilometers
            r = 6371
            
            return c * r
        
        return None
    
    def get_estimated_arrival_time(self, destination_lat, destination_lng):
        """Estimate arrival time to destination."""
        if not self.speed_kmph or self.speed_kmph <= 0:
            return None
        
        # Calculate distance to destination
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lon1 = radians(float(self.latitude)), radians(float(self.longitude))
        lat2, lon2 = radians(destination_lat), radians(destination_lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        distance = c * r
        
        # Calculate time in hours
        time_hours = distance / float(self.speed_kmph)
        
        # Convert to minutes
        time_minutes = time_hours * 60
        
        from datetime import datetime, timedelta
        return datetime.now() + timedelta(minutes=time_minutes)
