"""
Google Maps service for distance and route calculations.
Provides driving distance calculations for order batching.
"""
import logging
from typing import Optional, Tuple, List, Dict
from django.conf import settings
import googlemaps
from googlemaps.exceptions import ApiError, TransportError, Timeout

logger = logging.getLogger(__name__)


class GoogleMapsService:
    """Service class for Google Maps API interactions."""
    
    _client = None
    
    @classmethod
    def get_client(cls):
        """Get or create Google Maps client instance."""
        if cls._client is None:
            api_key = settings.GOOGLE_MAPS_API_KEY
            if not api_key:
                logger.warning("⚠️ Google Maps API key not configured. Distance calculations will use Haversine fallback.")
                return None
            
            try:
                cls._client = googlemaps.Client(key=api_key)
                logger.info("✅ Google Maps client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Google Maps client: {str(e)}")
                return None
        
        return cls._client
    
    @classmethod
    def get_driving_distance(
        cls,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        fallback_to_haversine: bool = True
    ) -> Optional[Tuple[float, float]]:
        """
        Calculate driving distance and duration between two points.
        
        Args:
            origin_lat: Origin latitude
            origin_lng: Origin longitude
            dest_lat: Destination latitude
            dest_lng: Destination longitude
            fallback_to_haversine: If True, use Haversine formula on API failure
            
        Returns:
            Tuple of (distance_km, duration_minutes) or None if failed
        """
        client = cls.get_client()
        
        if client is None:
            if fallback_to_haversine:
                logger.debug("🔄 Using Haversine fallback for distance calculation")
                return cls._haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng), None
            return None
        
        try:
            # Call Distance Matrix API
            result = client.distance_matrix(
                origins=[(origin_lat, origin_lng)],
                destinations=[(dest_lat, dest_lng)],
                mode='driving',
                units='metric',
                departure_time='now'  # Consider current traffic
            )
            
            # Extract distance and duration
            if result['status'] == 'OK':
                element = result['rows'][0]['elements'][0]
                
                if element['status'] == 'OK':
                    distance_meters = element['distance']['value']
                    duration_seconds = element['duration']['value']
                    
                    distance_km = distance_meters / 1000.0
                    duration_minutes = duration_seconds / 60.0
                    
                    logger.debug(f"📍 Driving distance: {distance_km:.2f} km, Duration: {duration_minutes:.1f} min")
                    return distance_km, duration_minutes
                else:
                    logger.warning(f"⚠️ Google Maps element error: {element.get('status')}")
            else:
                logger.warning(f"⚠️ Google Maps API error: {result.get('status')}")
        
        except (ApiError, TransportError, Timeout) as e:
            logger.error(f"❌ Google Maps API error: {str(e)}")
        except Exception as e:
            logger.error(f"❌ Unexpected error in distance calculation: {str(e)}")
        
        # Fallback to Haversine if enabled
        if fallback_to_haversine:
            logger.debug("🔄 Falling back to Haversine distance calculation")
            return cls._haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng), None
        
        return None
    
    @classmethod
    def get_batch_distances(
        cls,
        coordinates: List[Tuple[float, float]],
        fallback_to_haversine: bool = True
    ) -> Dict[Tuple[int, int], Tuple[Optional[float], Optional[float]]]:
        """
        Calculate driving distances between multiple points (for batch optimization).
        
        Args:
            coordinates: List of (latitude, longitude) tuples
            fallback_to_haversine: If True, use Haversine formula on API failure
            
        Returns:
            Dictionary mapping (index_i, index_j) to (distance_km, duration_minutes)
        """
        if len(coordinates) < 2:
            return {}
        
        client = cls.get_client()
        distances = {}
        
        if client is None:
            if fallback_to_haversine:
                logger.debug("🔄 Using Haversine fallback for batch distance calculation")
                for i in range(len(coordinates)):
                    for j in range(i + 1, len(coordinates)):
                        lat1, lng1 = coordinates[i]
                        lat2, lng2 = coordinates[j]
                        dist = cls._haversine_distance(lat1, lng1, lat2, lng2)
                        distances[(i, j)] = (dist, None)
                        distances[(j, i)] = (dist, None)  # Symmetric
            return distances
        
        try:
            # Call Distance Matrix API with all coordinates
            result = client.distance_matrix(
                origins=coordinates,
                destinations=coordinates,
                mode='driving',
                units='metric',
                departure_time='now'
            )
            
            if result['status'] == 'OK':
                for i, row in enumerate(result['rows']):
                    for j, element in enumerate(row['elements']):
                        if i != j and element['status'] == 'OK':
                            distance_meters = element['distance']['value']
                            duration_seconds = element['duration']['value']
                            
                            distance_km = distance_meters / 1000.0
                            duration_minutes = duration_seconds / 60.0
                            
                            distances[(i, j)] = (distance_km, duration_minutes)
                
                logger.info(f"📊 Calculated {len(distances)} driving distances for {len(coordinates)} locations")
            else:
                logger.warning(f"⚠️ Google Maps batch API error: {result.get('status')}")
                if fallback_to_haversine:
                    return cls._haversine_batch_distances(coordinates)
        
        except (ApiError, TransportError, Timeout) as e:
            logger.error(f"❌ Google Maps batch API error: {str(e)}")
            if fallback_to_haversine:
                return cls._haversine_batch_distances(coordinates)
        except Exception as e:
            logger.error(f"❌ Unexpected error in batch distance calculation: {str(e)}")
            if fallback_to_haversine:
                return cls._haversine_batch_distances(coordinates)
        
        return distances
    
    @staticmethod
    def _haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate straight-line distance using Haversine formula.
        Fallback method when Google Maps API is unavailable.
        
        Returns:
            Distance in kilometers
        """
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth's radius in kilometers
        r = 6371
        
        return c * r
    
    @classmethod
    def _haversine_batch_distances(
        cls,
        coordinates: List[Tuple[float, float]]
    ) -> Dict[Tuple[int, int], Tuple[float, None]]:
        """Calculate Haversine distances for batch of coordinates."""
        distances = {}
        
        for i in range(len(coordinates)):
            for j in range(i + 1, len(coordinates)):
                lat1, lng1 = coordinates[i]
                lat2, lng2 = coordinates[j]
                dist = cls._haversine_distance(lat1, lng1, lat2, lng2)
                distances[(i, j)] = (dist, None)
                distances[(j, i)] = (dist, None)  # Symmetric
        
        return distances


# Convenience function for backward compatibility
def get_driving_distance(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float
) -> Optional[float]:
    """
    Get driving distance between two points.
    Returns only distance in km (for backward compatibility).
    """
    result = GoogleMapsService.get_driving_distance(
        origin_lat, origin_lng, dest_lat, dest_lng
    )
    if result:
        return result[0]  # Return only distance, not duration
    return None

