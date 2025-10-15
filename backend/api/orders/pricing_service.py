"""
Dynamic Delivery Fee Pricing Service
Calculates delivery fees based on distance between pharmacy and customer.
"""
import logging
from decimal import Decimal
from typing import Optional, Tuple
from api.utils.google_maps_service import GoogleMapsService

logger = logging.getLogger(__name__)


class DeliveryPricingService:
    """
    Service for calculating distance-based delivery fees.
    
    Pricing Formula:
    - Base fee: ₱29.00 (for distances up to 3km)
    - Threshold: 3km
    - Rate per km over threshold: ₱8.00
    
    Examples:
    - 2km: ₱29.00 (within threshold)
    - 3km: ₱29.00 (at threshold)
    - 5km: ₱29.00 + (2 × ₱8.00) = ₱45.00
    - 7.5km: ₱29.00 + (4.5 × ₱8.00) = ₱65.00
    - 10km: ₱29.00 + (7 × ₱8.00) = ₱85.00
    """
    
    # Pricing configuration
    BASE_FEE = Decimal('29.00')
    THRESHOLD_KM = Decimal('3.0')  # Updated from 5.0 to 3.0 for fairer rider compensation
    RATE_PER_KM = Decimal('8.00')
    
    @classmethod
    def calculate_delivery_fee(
        cls,
        pharmacy_lat: float,
        pharmacy_lng: float,
        customer_lat: float,
        customer_lng: float,
        use_google_maps: bool = True
    ) -> Tuple[Decimal, Optional[float]]:
        """
        Calculate delivery fee based on distance between pharmacy and customer.
        
        Args:
            pharmacy_lat: Pharmacy latitude
            pharmacy_lng: Pharmacy longitude
            customer_lat: Customer latitude
            customer_lng: Customer longitude
            use_google_maps: If True, use Google Maps driving distance; else Haversine
            
        Returns:
            Tuple of (delivery_fee, distance_km)
            - delivery_fee: Calculated fee in Decimal
            - distance_km: Actual distance in kilometers (None if calculation failed)
        """
        distance_km = None
        
        try:
            if use_google_maps:
                # Get driving distance from Google Maps
                result = GoogleMapsService.get_driving_distance(
                    pharmacy_lat, pharmacy_lng,
                    customer_lat, customer_lng,
                    fallback_to_haversine=True
                )
                
                if result:
                    distance_km = result[0]  # Distance in km
                    duration_min = result[1]  # Duration in minutes (for logging)
                    
                    if duration_min:
                        logger.info(f"📍 Distance: {distance_km:.2f}km, Duration: {duration_min:.1f} min")
                    else:
                        logger.info(f"📍 Distance: {distance_km:.2f}km (Haversine fallback)")
            else:
                # Use Haversine distance
                distance_km = GoogleMapsService._haversine_distance(
                    pharmacy_lat, pharmacy_lng,
                    customer_lat, customer_lng
                )
                logger.info(f"📍 Distance (Haversine): {distance_km:.2f}km")
            
            if distance_km is None:
                logger.warning("⚠️ Distance calculation failed, using base fee")
                return cls.BASE_FEE, None
            
            # Calculate fee based on distance
            delivery_fee = cls._calculate_fee_from_distance(distance_km)
            
            logger.info(
                f"💰 Delivery Fee Calculation: "
                f"{distance_km:.2f}km → ₱{delivery_fee:.2f}"
            )
            
            return delivery_fee, distance_km
            
        except Exception as e:
            logger.error(f"❌ Error calculating delivery fee: {str(e)}")
            return cls.BASE_FEE, None
    
    @classmethod
    def _calculate_fee_from_distance(cls, distance_km: float) -> Decimal:
        """
        Apply pricing formula based on distance.
        
        Args:
            distance_km: Distance in kilometers
            
        Returns:
            Calculated delivery fee
        """
        distance = Decimal(str(distance_km))
        
        # If within threshold, return base fee
        if distance <= cls.THRESHOLD_KM:
            return cls.BASE_FEE
        
        # Calculate exceeding distance
        exceeds_by = distance - cls.THRESHOLD_KM
        
        # Calculate additional fee
        additional_fee = exceeds_by * cls.RATE_PER_KM
        
        # Total fee
        total_fee = cls.BASE_FEE + additional_fee
        
        logger.debug(
            f"📊 Distance {distance:.2f}km exceeds threshold by {exceeds_by:.2f}km → "
            f"Additional ₱{additional_fee:.2f} → Total ₱{total_fee:.2f}"
        )
        
        return total_fee.quantize(Decimal('0.01'))  # Round to 2 decimal places
    
    @classmethod
    def get_pricing_breakdown(
        cls,
        distance_km: float
    ) -> dict:
        """
        Get detailed pricing breakdown for display/logging.
        
        Args:
            distance_km: Distance in kilometers
            
        Returns:
            Dictionary with pricing breakdown
        """
        distance = Decimal(str(distance_km))
        within_threshold = distance <= cls.THRESHOLD_KM
        
        if within_threshold:
            return {
                'distance_km': float(distance),
                'base_fee': float(cls.BASE_FEE),
                'threshold_km': float(cls.THRESHOLD_KM),
                'within_threshold': True,
                'exceeds_by_km': 0.0,
                'rate_per_km': float(cls.RATE_PER_KM),
                'additional_fee': 0.0,
                'total_fee': float(cls.BASE_FEE)
            }
        
        exceeds_by = distance - cls.THRESHOLD_KM
        additional_fee = exceeds_by * cls.RATE_PER_KM
        total_fee = cls.BASE_FEE + additional_fee
        
        return {
            'distance_km': float(distance),
            'base_fee': float(cls.BASE_FEE),
            'threshold_km': float(cls.THRESHOLD_KM),
            'within_threshold': False,
            'exceeds_by_km': float(exceeds_by),
            'rate_per_km': float(cls.RATE_PER_KM),
            'additional_fee': float(additional_fee),
            'total_fee': float(total_fee)
        }
    
    @classmethod
    def update_configuration(
        cls,
        base_fee: Optional[Decimal] = None,
        threshold_km: Optional[Decimal] = None,
        rate_per_km: Optional[Decimal] = None
    ):
        """
        Update pricing configuration (for future admin panel).
        
        Args:
            base_fee: New base delivery fee
            threshold_km: New distance threshold
            rate_per_km: New rate per km over threshold
        """
        if base_fee is not None:
            cls.BASE_FEE = base_fee
            logger.info(f"✅ Updated base fee to ₱{base_fee}")
        
        if threshold_km is not None:
            cls.THRESHOLD_KM = threshold_km
            logger.info(f"✅ Updated threshold to {threshold_km}km")
        
        if rate_per_km is not None:
            cls.RATE_PER_KM = rate_per_km
            logger.info(f"✅ Updated rate per km to ₱{rate_per_km}")


# Convenience function for quick calculations
def calculate_delivery_fee(
    pharmacy_lat: float,
    pharmacy_lng: float,
    customer_lat: float,
    customer_lng: float
) -> Decimal:
    """
    Quick helper to calculate delivery fee.
    
    Returns:
        Delivery fee as Decimal
    """
    fee, _ = DeliveryPricingService.calculate_delivery_fee(
        pharmacy_lat, pharmacy_lng,
        customer_lat, customer_lng
    )
    return fee

