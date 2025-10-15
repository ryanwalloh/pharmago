"""
Smart Dispatch Service for Rider Order Assignment

This service implements the intelligent dispatch system with:
1. Automatic order dispatch to online riders
2. Proximity-based rider selection
3. Dynamic batching on rejection (key innovation!)
4. 30-second offer timeout
5. Race condition prevention
6. Fallback to manual browsing

Created: October 2025
"""
import logging
from typing import List, Optional, Tuple
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError

from api.users.models import Rider
from api.orders.models import Order
from api.delivery.models import (
    DispatchOffer, 
    DispatchQueue, 
    RiderAssignment, 
    OrderRiderAssignment,
    OrderBatchingService
)
from api.utils.google_maps_service import GoogleMapsService

logger = logging.getLogger(__name__)


class DispatchService:
    """
    Core service for dispatching orders to riders.
    Implements smart selection, dynamic batching, and timeout handling.
    """
    
    # Configuration
    OFFER_TIMEOUT_SINGLE = 30  # seconds for single order
    OFFER_TIMEOUT_BATCH = 45   # seconds for batch offer
    MAX_RIDERS_TO_TRY = 10     # max riders before giving up
    BATCH_CHECK_WINDOW = 10    # minutes to look back for batchable orders
    MAX_BATCH_SIZE = 3         # maximum orders per batch
    MAX_BATCH_DISTANCE_KM = 2.0  # max distance between orders in batch
    
    @classmethod
    def dispatch_order(cls, order: Order) -> bool:
        """
        Main entry point for dispatching an order.
        
        Args:
            order: Order instance to dispatch
            
        Returns:
            bool: True if dispatch initiated successfully, False otherwise
        """
        logger.info(f"🚀 Starting dispatch for order {order.order_number}")
        
        # Validate order can be dispatched
        if order.is_assigned_to_rider():
            logger.warning(f"⚠️  Order {order.order_number} already assigned to rider")
            return False
        
        if order.order_status != Order.OrderStatus.ACCEPTED:
            logger.warning(f"⚠️  Order {order.order_number} status is {order.order_status}, not 'accepted'")
            return False
        
        # Check for existing dispatch queue
        existing_queue = DispatchQueue.objects.filter(
            order=order,
            status__in=[
                DispatchQueue.QueueStatus.PENDING,
                DispatchQueue.QueueStatus.DISPATCHING
            ]
        ).first()
        
        if existing_queue:
            logger.warning(f"⚠️  Order {order.order_number} already in dispatch queue")
            return False
        
        # Check for immediate batching opportunity
        compatible_orders = cls.check_for_batchable_orders(order)
        
        if len(compatible_orders) > 1:
            logger.info(f"🔄 Found {len(compatible_orders)} orders to batch immediately")
            return cls._dispatch_batch(compatible_orders)
        else:
            logger.info(f"📦 Dispatching as single order")
            return cls._dispatch_single(order)
    
    @classmethod
    def _dispatch_single(cls, order: Order) -> bool:
        """
        Dispatch a single order to riders.
        
        Args:
            order: Order to dispatch
            
        Returns:
            bool: True if dispatch queue created successfully
        """
        try:
            # Create dispatch queue
            queue = DispatchQueue.objects.create(
                queue_id=f"DQ_{order.order_number}_{timezone.now().strftime('%H%M%S')}",
                order=order,
                is_batch=False,
                priority_level=cls._calculate_priority(order),
                max_attempts=cls.MAX_RIDERS_TO_TRY
            )
            
            logger.info(f"✅ Created dispatch queue: {queue.queue_id}")
            
            # Find eligible riders
            eligible_riders = cls.find_eligible_riders(order)
            
            if not eligible_riders:
                logger.warning(f"❌ No eligible riders found for {order.order_number}")
                queue.mark_failed()
                return False
            
            logger.info(f"👥 Found {len(eligible_riders)} eligible riders")
            
            # Offer to first rider
            return cls._offer_to_next_rider(queue, eligible_riders)
            
        except Exception as e:
            logger.error(f"❌ Error dispatching order {order.order_number}: {str(e)}", exc_info=True)
            return False
    
    @classmethod
    def _dispatch_batch(cls, orders: List[Order]) -> bool:
        """
        Dispatch a batch of orders to riders.
        
        Args:
            orders: List of orders to batch
            
        Returns:
            bool: True if dispatch initiated successfully
        """
        try:
            # Create a temporary batch assignment (not yet assigned to rider)
            total_delivery_fee = sum(float(order.delivery_fee) for order in orders)
            rider_earnings = total_delivery_fee * 0.8
            
            batch_assignment = RiderAssignment.objects.create(
                rider=None,  # Will be set when rider accepts
                assignment_type=RiderAssignment.AssignmentType.BATCH,
                batch_size=len(orders),
                max_batch_size=cls.MAX_BATCH_SIZE,
                total_delivery_fee=Decimal(str(total_delivery_fee)),
                rider_earnings=Decimal(str(rider_earnings)),
                status=RiderAssignment.AssignmentStatus.PENDING,
                estimated_completion=timezone.now() + timedelta(hours=2)
            )
            
            # Link orders to batch (temporarily)
            for seq, order in enumerate(orders, 1):
                OrderRiderAssignment.objects.create(
                    order=order,
                    assignment=batch_assignment,
                    pickup_sequence=seq,
                    delivery_sequence=seq
                )
            
            logger.info(f"✅ Created batch assignment: {batch_assignment.assignment_id} with {len(orders)} orders")
            
            # Create dispatch queue for batch
            queue = DispatchQueue.objects.create(
                queue_id=f"DQ_BATCH_{batch_assignment.assignment_id}",
                batch_assignment=batch_assignment,
                is_batch=True,
                priority_level=1,  # Batches have higher priority
                max_attempts=cls.MAX_RIDERS_TO_TRY
            )
            
            # Find eligible riders
            # Use first order's pickup location for rider selection
            eligible_riders = cls.find_eligible_riders(orders[0])
            
            if not eligible_riders:
                logger.warning(f"❌ No eligible riders found for batch")
                queue.mark_failed()
                return False
            
            logger.info(f"👥 Found {len(eligible_riders)} eligible riders for batch")
            
            # Offer batch to first rider
            return cls._offer_to_next_rider(queue, eligible_riders)
            
        except Exception as e:
            logger.error(f"❌ Error dispatching batch: {str(e)}", exc_info=True)
            return False
    
    @classmethod
    def _offer_to_next_rider(cls, queue: DispatchQueue, eligible_riders: List[Rider]) -> bool:
        """
        Offer order/batch to the next rider in the eligibility list.
        Implements dynamic batching check before each offer.
        
        Args:
            queue: DispatchQueue instance
            eligible_riders: Sorted list of eligible riders
            
        Returns:
            bool: True if offer sent successfully
        """
        # Check if max attempts reached
        if queue.total_attempts >= queue.max_attempts:
            logger.warning(f"❌ Max attempts ({queue.max_attempts}) reached for {queue.queue_id}")
            queue.mark_failed()
            return False
        
        # Get next rider
        if queue.total_attempts >= len(eligible_riders):
            logger.warning(f"❌ No more eligible riders for {queue.queue_id}")
            queue.mark_failed()
            return False
        
        rider = eligible_riders[queue.total_attempts]
        
        logger.info(f"📤 Offering to rider #{queue.total_attempts + 1}: {rider.full_name}")
        
        # DYNAMIC BATCHING CHECK (Your brilliant idea!)
        # Before offering to next rider, check if we can now batch with new orders
        if not queue.is_batch and queue.order:
            logger.info(f"🔍 Checking for dynamic batching opportunities...")
            compatible_orders = cls.check_for_batchable_orders(queue.order)
            
            if len(compatible_orders) > 1:
                logger.info(f"🎉 Dynamic batching! Found {len(compatible_orders)} compatible orders")
                
                # Convert to batch
                queue = cls._convert_to_batch_queue(queue, compatible_orders)
                
                if not queue:
                    # Conversion failed, continue with single order
                    logger.warning(f"⚠️  Failed to convert to batch, continuing with single order")
                else:
                    logger.info(f"✅ Successfully converted to batch dispatch")
        
        # Calculate earnings
        if queue.is_batch:
            earnings = float(queue.batch_assignment.rider_earnings)
            orders_count = queue.batch_assignment.batch_size
        else:
            earnings = float(queue.order.delivery_fee) * 0.8
            orders_count = 1
        
        # Calculate distance from rider to pickup
        pickup_distance = cls._calculate_pickup_distance(rider, queue)
        
        # Determine timeout duration
        timeout_seconds = cls.OFFER_TIMEOUT_BATCH if queue.is_batch else cls.OFFER_TIMEOUT_SINGLE
        expires_at = timezone.now() + timedelta(seconds=timeout_seconds)
        
        # Create dispatch offer
        try:
            offer = DispatchOffer.objects.create(
                offer_id=f"OFFER_{queue.queue_id}_{queue.total_attempts + 1}",
                rider=rider,
                order=queue.order if not queue.is_batch else None,
                batch_assignment=queue.batch_assignment if queue.is_batch else None,
                is_batch=queue.is_batch,
                orders_count=orders_count,
                total_earnings=Decimal(str(earnings)),
                pickup_distance_km=pickup_distance,
                expires_at=expires_at,
                attempt_number=queue.total_attempts + 1
            )
            
            # Update queue
            queue.current_offer = offer
            queue.total_attempts += 1
            queue.status = DispatchQueue.QueueStatus.DISPATCHING
            if queue.total_attempts == 1:
                queue.dispatched_at = timezone.now()
            queue.save()
            
            # Update rider's offer count
            rider.total_offers_received += 1
            rider.save()
            
            logger.info(
                f"✅ Offer {offer.offer_id} sent to {rider.full_name} "
                f"(₱{earnings:.2f}, {timeout_seconds}s timeout)"
            )
            
            # Send offer via WebSocket
            cls._send_offer_notification(rider, offer)
            
            # TODO: Schedule timeout check (can be done with Celery or similar)
            # cls._schedule_timeout_check(offer)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error creating offer: {str(e)}", exc_info=True)
            return False
    
    @classmethod
    def check_for_batchable_orders(cls, original_order: Order) -> List[Order]:
        """
        Check if original order can be batched with other recently accepted orders.
        YOUR BRILLIANT DYNAMIC BATCHING IDEA!
        
        This is called BEFORE offering to each new rider, allowing orders that
        became 'accepted' during the dispatch process to be batched together.
        
        Args:
            original_order: The order currently being dispatched
            
        Returns:
            List of orders that can be batched together (includes original_order)
        """
        try:
            # Find other recently accepted orders (within last X minutes)
            recent_accepted = Order.objects.filter(
                order_status=Order.OrderStatus.ACCEPTED,
                created_at__gte=timezone.now() - timedelta(minutes=cls.BATCH_CHECK_WINDOW)
            ).exclude(
                id=original_order.id
            ).exclude(
                # Exclude orders already in dispatch queue
                dispatch_queue__status__in=[
                    DispatchQueue.QueueStatus.DISPATCHING,
                    DispatchQueue.QueueStatus.ASSIGNED
                ]
            )
            
            logger.debug(f"🔍 Found {recent_accepted.count()} recent accepted orders to check for batching")
            
            if not recent_accepted.exists():
                return [original_order]  # No compatible orders
            
            # Test which orders can batch with original
            compatible = []
            for other_order in recent_accepted:
                test_batch = [original_order, other_order]
                
                can_batch = OrderBatchingService.can_batch_orders(
                    test_batch,
                    max_batch_size=cls.MAX_BATCH_SIZE,
                    max_distance_km=cls.MAX_BATCH_DISTANCE_KM,
                    use_driving_distance=True  # Use Google Maps
                )
                
                if can_batch:
                    compatible.append(other_order)
                    logger.debug(f"✅ Order {other_order.order_number} compatible for batching")
                    
                    # Stop if we have enough for max batch
                    if len(compatible) >= cls.MAX_BATCH_SIZE - 1:  # -1 because we include original
                        break
            
            if compatible:
                # Return original + compatible orders (up to MAX_BATCH_SIZE total)
                all_orders = [original_order] + compatible[:cls.MAX_BATCH_SIZE - 1]
                logger.info(f"🎉 Dynamic batching: {len(all_orders)} orders can be batched!")
                return all_orders
            
            return [original_order]  # No compatible orders found
            
        except Exception as e:
            logger.error(f"❌ Error checking for batchable orders: {str(e)}", exc_info=True)
            return [original_order]  # Fallback to single order
    
    @classmethod
    def _convert_to_batch_queue(cls, queue: DispatchQueue, orders: List[Order]) -> Optional[DispatchQueue]:
        """
        Convert a single-order queue to a batch queue.
        Used when dynamic batching finds compatible orders.
        
        Args:
            queue: Existing single-order queue
            orders: All orders to include in batch (including original)
            
        Returns:
            Updated queue or None if conversion failed
        """
        try:
            # Create batch assignment
            total_delivery_fee = sum(float(order.delivery_fee) for order in orders)
            rider_earnings = total_delivery_fee * 0.8
            
            batch_assignment = RiderAssignment.objects.create(
                rider=None,  # Will be set when accepted
                assignment_type=RiderAssignment.AssignmentType.BATCH,
                batch_size=len(orders),
                max_batch_size=cls.MAX_BATCH_SIZE,
                total_delivery_fee=Decimal(str(total_delivery_fee)),
                rider_earnings=Decimal(str(rider_earnings)),
                status=RiderAssignment.AssignmentStatus.PENDING,
                estimated_completion=timezone.now() + timedelta(hours=2)
            )
            
            # Link all orders to batch
            for seq, order in enumerate(orders, 1):
                OrderRiderAssignment.objects.create(
                    order=order,
                    assignment=batch_assignment,
                    pickup_sequence=seq,
                    delivery_sequence=seq
                )
            
            # Update queue to point to batch
            queue.batch_assignment = batch_assignment
            queue.order = None  # Clear single order reference
            queue.is_batch = True
            queue.priority_level = 1  # Batches get higher priority
            queue.save()
            
            logger.info(f"✅ Converted {queue.queue_id} to batch with {len(orders)} orders")
            return queue
            
        except Exception as e:
            logger.error(f"❌ Error converting to batch: {str(e)}", exc_info=True)
            return None
    
    @classmethod
    def find_eligible_riders(cls, order: Order) -> List[Rider]:
        """
        Find and prioritize eligible riders for an order.
        
        Selection criteria:
        1. Must be online (activity_status='online')
        2. Must be verified and approved
        3. Sorted by: distance, acceptance rate, rating
        
        Args:
            order: Order to find riders for
            
        Returns:
            Sorted list of eligible Rider objects
        """
        try:
            # Get pharmacy location from order
            pharmacy = None
            if order.order_lines.exists():
                first_line = order.order_lines.first()
                if first_line and first_line.inventory_item:
                    pharmacy = first_line.inventory_item.pharmacy
            
            if not pharmacy:
                logger.warning(f"❌ No pharmacy found for order {order.order_number}")
                return []
            
            # Base filter: online, verified, approved riders
            eligible_riders = Rider.objects.filter(
                activity_status=Rider.ActivityStatus.ONLINE,
                is_fully_verified=True,
                status=Rider.RiderStatus.APPROVED,
                user__status='active'
            )
            
            logger.info(f"🔍 Found {eligible_riders.count()} online riders")
            
            if not eligible_riders.exists():
                return []
            
            # Calculate priority score for each rider and sort
            riders_with_scores = []
            
            for rider in eligible_riders:
                score = cls._calculate_rider_priority_score(rider, pharmacy)
                riders_with_scores.append((rider, score))
            
            # Sort by score (lower is better)
            riders_with_scores.sort(key=lambda x: x[1])
            
            # Log top 3 riders
            for i, (rider, score) in enumerate(riders_with_scores[:3], 1):
                logger.debug(f"   {i}. {rider.full_name} (score: {score:.2f})")
            
            # Return sorted list of riders
            sorted_riders = [rider for rider, score in riders_with_scores]
            return sorted_riders
            
        except Exception as e:
            logger.error(f"❌ Error finding eligible riders: {str(e)}", exc_info=True)
            return []
    
    @classmethod
    def _calculate_rider_priority_score(cls, rider: Rider, pharmacy) -> float:
        """
        Calculate priority score for rider selection.
        Lower score = higher priority (selected first).
        
        Scoring:
        - Distance: 0-100 points (40% weight)
        - Acceptance Rate: 0-50 points (25% weight)
        - Rating: 0-25 points (12.5% weight)
        - Response Time: 0-25 points (12.5% weight)
        - Random factor: 0-10 points (10% weight, for fairness)
        
        Args:
            rider: Rider to score
            pharmacy: Pharmacy for pickup location
            
        Returns:
            Priority score (lower is better)
        """
        import random
        
        # Distance score (0-100 points)
        distance_score = 50.0  # Default if no location
        
        if rider.has_current_location() and pharmacy.latitude and pharmacy.longitude:
            try:
                distance_km = GoogleMapsService._haversine_distance(
                    float(rider.current_latitude),
                    float(rider.current_longitude),
                    float(pharmacy.latitude),
                    float(pharmacy.longitude)
                )
                # 0km = 0 points, 10km+ = 100 points
                distance_score = min(distance_km * 10, 100)
            except Exception:
                pass
        
        # Acceptance rate score (0-50 points, lower acceptance = higher score)
        acceptance_rate = float(rider.acceptance_rate)
        acceptance_score = (100 - acceptance_rate) / 2  # 100% = 0pts, 0% = 50pts
        
        # Rating score (0-25 points, lower rating = higher score)
        avg_rating = float(rider.average_rating) if rider.average_rating else 0
        rating_score = (5.0 - avg_rating) * 5  # 5.0 = 0pts, 0 = 25pts
        
        # Response time score (0-25 points, slower = higher score)
        avg_response = float(rider.average_response_time)
        response_score = min(avg_response / 2, 25)  # 0s = 0pts, 50s+ = 25pts
        
        # Random factor (0-10 points, for fair distribution)
        random_score = random.uniform(0, 10)
        
        # Total score
        total_score = (
            distance_score +
            acceptance_score +
            rating_score +
            response_score +
            random_score
        )
        
        logger.debug(
            f"   {rider.full_name}: "
            f"dist={distance_score:.1f}, acc={acceptance_score:.1f}, "
            f"rating={rating_score:.1f}, resp={response_score:.1f}, "
            f"random={random_score:.1f} → TOTAL={total_score:.1f}"
        )
        
        return total_score
    
    @classmethod
    def _calculate_pickup_distance(cls, rider: Rider, queue: DispatchQueue) -> Optional[Decimal]:
        """
        Calculate distance from rider's current location to pickup.
        
        Args:
            rider: Rider to calculate distance for
            queue: Queue containing order/batch
            
        Returns:
            Distance in km as Decimal, or None if can't calculate
        """
        if not rider.has_current_location():
            return None
        
        # Get pickup location (pharmacy)
        pharmacy = None
        
        if queue.is_batch and queue.batch_assignment:
            # Get pharmacy from first order in batch
            first_assignment = queue.batch_assignment.order_assignments.first()
            if first_assignment:
                order = first_assignment.order
                if order.order_lines.exists():
                    first_line = order.order_lines.first()
                    if first_line and first_line.inventory_item:
                        pharmacy = first_line.inventory_item.pharmacy
        elif queue.order:
            if queue.order.order_lines.exists():
                first_line = queue.order.order_lines.first()
                if first_line and first_line.inventory_item:
                    pharmacy = first_line.inventory_item.pharmacy
        
        if not pharmacy or not pharmacy.latitude or not pharmacy.longitude:
            return None
        
        try:
            distance = GoogleMapsService._haversine_distance(
                float(rider.current_latitude),
                float(rider.current_longitude),
                float(pharmacy.latitude),
                float(pharmacy.longitude)
            )
            return Decimal(str(distance))
        except Exception:
            return None
    
    @classmethod
    def _calculate_priority(cls, order: Order) -> int:
        """
        Calculate priority level for order dispatch.
        Lower number = higher priority.
        
        Args:
            order: Order to calculate priority for
            
        Returns:
            Priority level (1-10)
        """
        # Base priority
        priority = 5
        
        # Higher priority for older orders
        age_hours = (timezone.now() - order.created_at).total_seconds() / 3600
        if age_hours > 2:
            priority -= 2
        elif age_hours > 1:
            priority -= 1
        
        # Higher priority for high-value orders
        total_amount = float(order.total_amount) if order.total_amount else 0
        if total_amount > 1000:
            priority -= 1
        
        # Ensure priority is in valid range
        priority = max(1, min(priority, 10))
        
        return priority
    
    @classmethod
    @transaction.atomic
    def handle_rider_response(cls, offer_id: str, accepted: bool, rejection_reason: Optional[str] = None) -> dict:
        """
        Handle rider's response to a dispatch offer.
        Uses database locking to prevent race conditions.
        
        Args:
            offer_id: Unique offer ID
            accepted: True if rider accepted, False if rejected
            rejection_reason: Optional reason for rejection
            
        Returns:
            dict with success status and message
        """
        try:
            # Lock the offer for update (prevents race condition)
            offer = DispatchOffer.objects.select_for_update().get(offer_id=offer_id)
            
            # Check if offer is still active
            if offer.status != DispatchOffer.OfferStatus.PENDING:
                logger.warning(f"⚠️  Offer {offer_id} already processed (status: {offer.status})")
                return {
                    'success': False,
                    'message': f'Offer already {offer.status}',
                    'status': offer.status
                }
            
            # Check if offer has expired
            if offer.is_expired():
                logger.warning(f"⏱️  Offer {offer_id} has expired")
                offer.mark_timeout()
                
                # Try next rider
                queue = DispatchQueue.objects.get(current_offer=offer)
                eligible_riders = cls.find_eligible_riders(queue.order or queue.batch_assignment)
                cls._offer_to_next_rider(queue, eligible_riders)
                
                return {
                    'success': False,
                    'message': 'Offer has expired',
                    'status': 'timeout'
                }
            
            if accepted:
                # ACCEPT - Assign order(s) to rider
                logger.info(f"✅ Rider {offer.rider.full_name} ACCEPTED offer {offer_id}")
                
                offer.mark_accepted()
                
                # Assign order(s) to rider
                success = cls._assign_to_rider(offer)
                
                if success:
                    # Mark queue as completed
                    queue = DispatchQueue.objects.get(current_offer=offer)
                    queue.mark_assigned()
                    
                    # Cancel any other pending offers for same order(s)
                    cls._cancel_other_offers(offer)
                    
                    return {
                        'success': True,
                        'message': 'Order assigned successfully',
                        'assignment_id': offer.batch_assignment.assignment_id if offer.is_batch else None
                    }
                else:
                    return {
                        'success': False,
                        'message': 'Failed to create assignment'
                    }
            else:
                # REJECT - Offer to next rider with dynamic batching check
                logger.info(f"❌ Rider {offer.rider.full_name} REJECTED offer {offer_id}")
                
                offer.mark_rejected(rejection_reason)
                
                # Get queue and eligible riders
                queue = DispatchQueue.objects.get(current_offer=offer)
                eligible_riders = cls.find_eligible_riders(queue.order if queue.order else queue.batch_assignment.order_assignments.first().order)
                
                # Offer to next rider (will check for dynamic batching inside)
                next_offered = cls._offer_to_next_rider(queue, eligible_riders)
                
                if next_offered:
                    return {
                        'success': True,
                        'message': 'Offered to next rider'
                    }
                else:
                    return {
                        'success': False,
                        'message': 'No more riders available'
                    }
                
        except DispatchOffer.DoesNotExist:
            logger.error(f"❌ Offer {offer_id} not found")
            return {
                'success': False,
                'message': 'Offer not found'
            }
        except Exception as e:
            logger.error(f"❌ Error handling rider response: {str(e)}", exc_info=True)
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }
    
    @classmethod
    def _assign_to_rider(cls, offer: DispatchOffer) -> bool:
        """
        Actually assign order(s) to the rider who accepted.
        Uses atomic transaction to prevent double-assignment.
        
        Args:
            offer: Accepted DispatchOffer
            
        Returns:
            bool: True if assignment successful
        """
        try:
            with transaction.atomic():
                if offer.is_batch:
                    # Assign batch to rider
                    batch = offer.batch_assignment
                    batch.rider = offer.rider
                    batch.status = RiderAssignment.AssignmentStatus.ASSIGNED
                    batch.save()
                    
                    # Update all orders in batch
                    # Note: Order status stays as 'accepted' - the RiderAssignment marks it as assigned
                    # Status will change to 'ready_for_pickup' → 'picked_up' → 'delivered' as delivery progresses
                    for order_assignment in batch.order_assignments.all():
                        order = order_assignment.order
                        # Order status stays 'accepted' - assignment link shows it's assigned
                        pass
                    
                    logger.info(f"✅ Assigned batch {batch.assignment_id} to {offer.rider.full_name}")
                    
                else:
                    # Assign single order to rider
                    order = Order.objects.select_for_update().get(id=offer.order.id)
                    
                    # Double-check not already assigned (race condition prevention)
                    if order.is_assigned_to_rider():
                        logger.warning(f"⚠️  Order {order.order_number} already assigned!")
                        return False
                    
                    # Create assignment
                    assignment = RiderAssignment.objects.create(
                        rider=offer.rider,
                        assignment_type=RiderAssignment.AssignmentType.SINGLE,
                        batch_size=1,
                        max_batch_size=1,
                        total_delivery_fee=order.delivery_fee,
                        rider_earnings=order.delivery_fee * Decimal('0.8'),
                        status=RiderAssignment.AssignmentStatus.ASSIGNED,
                        estimated_completion=timezone.now() + timedelta(hours=1)
                    )
                    
                    # Link order to assignment
                    OrderRiderAssignment.objects.create(
                        order=order,
                        assignment=assignment,
                        pickup_sequence=1,
                        delivery_sequence=1
                    )
                    
                    # Note: Order status stays as 'accepted' - the RiderAssignment link marks it as assigned
                    # Status will progress: 'accepted' → 'ready_for_pickup' → 'picked_up' → 'delivered'
                    
                    logger.info(f"✅ Assigned order {order.order_number} to {offer.rider.full_name}")
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Error assigning to rider: {str(e)}", exc_info=True)
            return False
    
    @classmethod
    def _cancel_other_offers(cls, accepted_offer: DispatchOffer):
        """
        Cancel any other pending offers for the same order(s).
        Called when a rider accepts to prevent double-assignment.
        Also sends WebSocket notifications to affected riders.
        
        Args:
            accepted_offer: The offer that was accepted
        """
        try:
            # Find other pending offers
            other_offers = None
            
            if accepted_offer.is_batch:
                # Cancel offers for this batch
                other_offers = DispatchOffer.objects.filter(
                    batch_assignment=accepted_offer.batch_assignment,
                    status=DispatchOffer.OfferStatus.PENDING
                ).exclude(id=accepted_offer.id)
            else:
                # Cancel offers for this order
                other_offers = DispatchOffer.objects.filter(
                    order=accepted_offer.order,
                    status=DispatchOffer.OfferStatus.PENDING
                ).exclude(id=accepted_offer.id)
            
            if other_offers and other_offers.exists():
                # Send WebSocket cancellations before updating database
                for offer in other_offers:
                    cls.send_offer_cancellation(
                        rider_id=offer.rider.id,
                        offer_id=offer.offer_id,
                        reason='assigned_to_another_rider'
                    )
                
                # Update status in database
                other_offers.update(status=DispatchOffer.OfferStatus.CANCELLED)
                
                logger.info(f"✅ Cancelled {other_offers.count()} other pending offers")
            
        except Exception as e:
            logger.error(f"❌ Error cancelling offers: {str(e)}", exc_info=True)
    
    @classmethod
    def handle_offer_timeout(cls, offer_id: str) -> dict:
        """
        Handle when an offer times out (rider didn't respond in time).
        
        Args:
            offer_id: Offer that timed out
            
        Returns:
            dict with status
        """
        try:
            offer = DispatchOffer.objects.get(offer_id=offer_id)
            
            if offer.status != DispatchOffer.OfferStatus.PENDING:
                return {'success': False, 'message': 'Offer already processed'}
            
            logger.info(f"⏱️  Offer {offer_id} TIMED OUT (rider: {offer.rider.full_name})")
            
            # Mark as timeout
            offer.mark_timeout()
            
            # Try next rider
            queue = DispatchQueue.objects.get(current_offer=offer)
            eligible_riders = cls.find_eligible_riders(queue.order if queue.order else queue.batch_assignment.order_assignments.first().order)
            
            next_offered = cls._offer_to_next_rider(queue, eligible_riders)
            
            if next_offered:
                return {'success': True, 'message': 'Offered to next rider'}
            else:
                return {'success': False, 'message': 'No more riders available'}
                
        except DispatchOffer.DoesNotExist:
            return {'success': False, 'message': 'Offer not found'}
        except Exception as e:
            logger.error(f"❌ Error handling timeout: {str(e)}", exc_info=True)
            return {'success': False, 'message': str(e)}
    
    @classmethod
    def get_rider_current_offer(cls, rider: Rider) -> Optional[DispatchOffer]:
        """
        Get rider's current active dispatch offer (if any).
        
        Args:
            rider: Rider to check
            
        Returns:
            Active DispatchOffer or None
        """
        return DispatchOffer.objects.filter(
            rider=rider,
            status=DispatchOffer.OfferStatus.PENDING,
            expires_at__gt=timezone.now()
        ).order_by('-offered_at').first()
    
    @classmethod
    def cancel_dispatch(cls, order: Order) -> bool:
        """
        Cancel dispatch for an order (e.g., if order is cancelled by customer).
        
        Args:
            order: Order to cancel dispatch for
            
        Returns:
            bool: True if cancelled successfully
        """
        try:
            # Find active dispatch queue
            queue = DispatchQueue.objects.filter(
                order=order,
                status__in=[
                    DispatchQueue.QueueStatus.PENDING,
                    DispatchQueue.QueueStatus.DISPATCHING
                ]
            ).first()
            
            if queue:
                queue.cancel()
                logger.info(f"✅ Cancelled dispatch for order {order.order_number}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error cancelling dispatch: {str(e)}", exc_info=True)
            return False
    
    # ========== WebSocket Communication Methods ==========
    
    @classmethod
    def _send_offer_notification(cls, rider: Rider, offer: DispatchOffer):
        """
        Send dispatch offer to rider via WebSocket.
        
        Args:
            rider: Rider to send offer to
            offer: DispatchOffer instance
        """
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            
            if not channel_layer:
                logger.warning("⚠️  Channel layer not configured, skipping WebSocket notification")
                return
            
            # Prepare offer data
            offer_data = cls._serialize_offer_for_websocket(offer)
            
            # Send to rider's dispatch channel
            room_group_name = f'rider_dispatch_{rider.id}'
            
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'dispatch_offer',  # Maps to dispatch_offer() method in consumer
                    'offer_data': offer_data
                }
            )
            
            logger.info(f"📡 WebSocket offer sent to rider {rider.id} (channel: {room_group_name})")
            
        except Exception as e:
            logger.error(f"❌ Error sending WebSocket notification: {str(e)}", exc_info=True)
    
    @classmethod
    def _serialize_offer_for_websocket(cls, offer: DispatchOffer) -> dict:
        """
        Serialize dispatch offer for WebSocket transmission.
        
        Args:
            offer: DispatchOffer instance
            
        Returns:
            dict: Serialized offer data
        """
        try:
            timeout_seconds = int((offer.expires_at - timezone.now()).total_seconds())
            
            offer_data = {
                'offer_id': offer.offer_id,
                'is_batch': offer.is_batch,
                'orders_count': offer.orders_count,
                'total_earnings': float(offer.total_earnings),
                'pickup_distance_km': float(offer.pickup_distance_km) if offer.pickup_distance_km else None,
                'expires_at': offer.expires_at.isoformat(),
                'timeout_seconds': max(timeout_seconds, 0),
                'attempt_number': offer.attempt_number,
            }
            
            # Add order details
            if offer.is_batch and offer.batch_assignment:
                # Batch offer - include all orders
                orders_in_batch = []
                
                for order_assignment in offer.batch_assignment.order_assignments.all():
                    order = order_assignment.order
                    
                    # Get pharmacy
                    pharmacy = None
                    if order.order_lines.exists():
                        first_line = order.order_lines.first()
                        if first_line and first_line.inventory_item:
                            pharmacy = first_line.inventory_item.pharmacy
                    
                    orders_in_batch.append({
                        'order_number': order.order_number,
                        'customer_name': f"{order.customer.first_name} {order.customer.last_name}" if order.customer else 'Unknown',
                        'pharmacy': {
                            'name': pharmacy.pharmacy_name if pharmacy else 'Unknown Pharmacy',
                            'address': f"{pharmacy.barangay}, {pharmacy.city}" if pharmacy else '',
                        },
                        'delivery_address': f"{order.delivery_address.barangay}, {order.delivery_address.city}" if order.delivery_address else '',
                        'earnings': float(order.delivery_fee) * 0.8,
                    })
                
                offer_data['orders'] = orders_in_batch
                
            elif offer.order:
                # Single order
                order = offer.order
                
                # Get pharmacy
                pharmacy = None
                if order.order_lines.exists():
                    first_line = order.order_lines.first()
                    if first_line and first_line.inventory_item:
                        pharmacy = first_line.inventory_item.pharmacy
                
                offer_data['order'] = {
                    'order_number': order.order_number,
                    'customer_name': f"{order.customer.first_name} {order.customer.last_name}" if order.customer else 'Unknown',
                    'pharmacy': {
                        'name': pharmacy.pharmacy_name if pharmacy else 'Unknown Pharmacy',
                        'address': f"{pharmacy.street_address if pharmacy.street_address else pharmacy.barangay}, {pharmacy.city}" if pharmacy else '',
                    },
                    'delivery_address': f"{order.delivery_address.street_address if order.delivery_address.street_address else order.delivery_address.barangay}, {order.delivery_address.city}" if order.delivery_address else '',
                    'delivery_fee': float(order.delivery_fee),
                    'earnings': float(order.delivery_fee) * 0.8,
                }
            
            return offer_data
            
        except Exception as e:
            logger.error(f"❌ Error serializing offer: {str(e)}", exc_info=True)
            return {
                'offer_id': offer.offer_id,
                'error': 'Failed to load offer details'
            }
    
    @classmethod
    def send_offer_cancellation(cls, rider_id: int, offer_id: str, reason: str = 'assigned_to_another_rider'):
        """
        Send offer cancellation notification to rider via WebSocket.
        
        Args:
            rider_id: Rider ID
            offer_id: Offer ID to cancel
            reason: Reason for cancellation
        """
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            
            if not channel_layer:
                return
            
            room_group_name = f'rider_dispatch_{rider_id}'
            
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'offer_cancelled',
                    'offer_id': offer_id,
                    'reason': reason
                }
            )
            
            logger.info(f"📡 Sent cancellation notification to rider {rider_id} for offer {offer_id}")
            
        except Exception as e:
            logger.error(f"❌ Error sending cancellation: {str(e)}", exc_info=True)

