/**
 * Dispatch Service for Rider App
 * Handles dispatch offer responses and WebSocket connections
 */

import { apiService } from './api';

export interface DispatchOffer {
  offer_id: string;
  is_batch: boolean;
  orders_count: number;
  total_earnings: number;
  pickup_distance_km: number | null;
  expires_at: string;
  timeout_seconds: number;
  attempt_number: number;
  order?: {
    order_number: string;
    customer_name: string;
    pharmacy: {
      name: string;
      address: string;
    };
    delivery_address: string;
    delivery_fee: number;
    earnings: number;
  };
  orders?: Array<{
    order_number: string;
    customer_name: string;
    pharmacy_name: string;
    pharmacy_address: string;
    delivery_address: string;
    earnings: number;
  }>;
}

class DispatchService {
  private wsConnection: WebSocket | null = null;
  private riderId: number | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onOfferCallback: ((offer: DispatchOffer) => void) | null = null;
  private onCancelCallback: ((offerId: string) => void) | null = null;

  /**
   * Connect to rider's dispatch WebSocket channel
   */
  connectToDispatchChannel(
    riderId: number,
    onOffer: (offer: DispatchOffer) => void,
    onCancel: (offerId: string) => void
  ) {
    this.riderId = riderId;
    this.onOfferCallback = onOffer;
    this.onCancelCallback = onCancel;

    const wsUrl = this.getWebSocketUrl(riderId);
    
    console.log(`🔌 Connecting to dispatch WebSocket: ${wsUrl}`);

    try {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('✅ Dispatch WebSocket connected');
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Dispatch message received:', data.type);

          if (data.type === 'dispatch_offer' && data.offer) {
            console.log('🚨 NEW DISPATCH OFFER!', data.offer);
            if (this.onOfferCallback) {
              this.onOfferCallback(data.offer);
            }
          } else if (data.type === 'offer_cancelled') {
            console.log('🚫 Offer cancelled:', data.offer_id);
            if (this.onCancelCallback) {
              this.onCancelCallback(data.offer_id);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing dispatch message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ Dispatch WebSocket error:', error);
      };

      this.wsConnection.onclose = () => {
        console.log('🔌 Dispatch WebSocket disconnected');
        this.wsConnection = null;

        // Auto-reconnect after 5 seconds if rider is online
        if (this.riderId) {
          this.reconnectTimeout = setTimeout(() => {
            console.log('🔄 Reconnecting to dispatch WebSocket...');
            this.connectToDispatchChannel(
              this.riderId!,
              this.onOfferCallback!,
              this.onCancelCallback!
            );
          }, 5000) as any;
        }
      };
    } catch (error) {
      console.error('❌ Failed to connect to dispatch WebSocket:', error);
    }
  }

  /**
   * Disconnect from dispatch WebSocket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    this.riderId = null;
    this.onOfferCallback = null;
    this.onCancelCallback = null;

    console.log('🔌 Dispatch WebSocket disconnected');
  }

  /**
   * Get WebSocket URL for rider dispatch channel
   */
  private getWebSocketUrl(riderId: number): string {
    // Check for environment variable
    if (process.env.EXPO_PUBLIC_WS_DISPATCH_URL) {
      return process.env.EXPO_PUBLIC_WS_DISPATCH_URL.replace('{rider_id}', String(riderId));
    }

    // Derive from API base URL
    const envBase = process.env.EXPO_PUBLIC_API_BASE;
    if (envBase) {
      const wsProtocol = envBase.startsWith('https') ? 'wss' : 'ws';
      const host = envBase.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return `${wsProtocol}://${host}/ws/rider/dispatch/${riderId}/`;
    }

    // Fallback to localhost
    return `ws://localhost:8000/ws/rider/dispatch/${riderId}/`;
  }

  /**
   * Accept a dispatch offer
   */
  async acceptOffer(offerId: string, riderId: number): Promise<{success: boolean; message?: string; assignment_id?: number}> {
    try {
      const response = await apiService.makeDirectRequest('/rider/accept-offer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offerId,
          rider_id: riderId
        })
      });

      // Extract assignment_id from nested response
      const responseData = response as any;
      const backendData = responseData.data || {};
      
      console.log('✅ Accept offer response:', {
        success: responseData.success,
        assignment_id: backendData.assignment_id,
        message: backendData.message
      });
      
      return {
        success: responseData.success,
        message: backendData.message || responseData.message,
        assignment_id: backendData.assignment_id
      };
    } catch (error) {
      console.error('❌ Error accepting offer:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Reject a dispatch offer
   */
  async rejectOffer(
    offerId: string,
    riderId: number,
    reason?: string
  ): Promise<{success: boolean; message?: string}> {
    try {
      const response = await apiService.makeDirectRequest('/rider/reject-offer/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offerId,
          rider_id: riderId,
          reason: reason || 'not_specified'
        })
      });

      return response as any;
    } catch (error) {
      console.error('❌ Error rejecting offer:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Update rider online/offline status
   */
  async updateRiderStatus(riderId: number, status: 'online' | 'offline' | 'busy' | 'break'): Promise<{success: boolean}> {
    try {
      const response = await apiService.makeDirectRequest('/rider/update-status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: riderId,
          status: status
        })
      });

      return response as any;
    } catch (error) {
      console.error('❌ Error updating rider status:', error);
      return { success: false };
    }
  }

  /**
   * Update rider's current location
   */
  async updateRiderLocation(riderId: number, latitude: number, longitude: number): Promise<{success: boolean}> {
    try {
      const response = await apiService.makeDirectRequest('/rider/update-location/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rider_id: riderId,
          latitude: latitude,
          longitude: longitude
        })
      });

      return response as any;
    } catch (error) {
      console.error('❌ Error updating location:', error);
      return { success: false };
    }
  }

  /**
   * Get current active dispatch offer for rider
   */
  async getCurrentOffer(riderId: number): Promise<{success: boolean; has_offer: boolean; offer?: DispatchOffer}> {
    try {
      const response = await apiService.makeDirectRequest(`/rider/current-offer/?rider_id=${riderId}`, {
        method: 'GET'
      });

      return response as any;
    } catch (error) {
      console.error('❌ Error getting current offer:', error);
      return { success: false, has_offer: false };
    }
  }
}

export const dispatchService = new DispatchService();

