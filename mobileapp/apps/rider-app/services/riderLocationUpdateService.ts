import { apiService } from '../../customer-app/services/api';
import { Coordinate } from './locationUtils';

export interface LocationUpdateRequest {
  riderId: number;
  coordinate: Coordinate;
  locationTimestamp: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  reason?: 'initial' | 'movement' | 'heartbeat';
  distanceFromLast?: number;
}

export interface LocationUpdateResult {
  success: boolean;
  error?: string;
}

const ENDPOINT = '/rider/update-location/';

export async function sendRiderLocationUpdate(
  request: LocationUpdateRequest,
): Promise<LocationUpdateResult> {
  try {
    const payload = {
      rider_id: request.riderId,
      latitude: request.coordinate.latitude,
      longitude: request.coordinate.longitude,
      heading:
        request.heading !== undefined && request.heading !== null
          ? Number(request.heading)
          : undefined,
      speed:
        request.speed !== undefined && request.speed !== null
          ? Number(request.speed)
          : undefined,
      accuracy:
        request.accuracy !== undefined && request.accuracy !== null
          ? Number(request.accuracy)
          : undefined,
      timestamp: new Date(request.locationTimestamp).toISOString(),
      reason: request.reason,
      distance_moved: request.distanceFromLast,
    };

    console.log('🚚 Sending rider location update', payload);

    const response = await apiService.makeDirectRequest(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.success) {
      console.warn('⚠️ Rider location update failed', response.error);
      return {
        success: false,
        error: response.error || 'Unknown error',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Rider location update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}


