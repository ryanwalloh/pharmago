export interface RiderLocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  updated_at?: string;
}

export type RiderLocationConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected';

interface ConnectOptions {
  onUpdate: (update: RiderLocationUpdate) => void;
  onStatusChange?: (status: RiderLocationConnectionStatus) => void;
  onError?: (error: Error) => void;
}

class RiderLocationSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private riderId: number | null = null;
  private options: ConnectOptions | null = null;
  private status: RiderLocationConnectionStatus = 'idle';

  connect(riderId: number, options: ConnectOptions) {
    this.riderId = riderId;
    this.options = options;

    this.clearReconnect();
    this.openConnection();

    return () => {
      this.disconnect();
    };
  }

  disconnect() {
    this.clearReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.riderId = null;
    this.options = null;
    this.updateStatus('disconnected');
  }

  private openConnection() {
    if (!this.riderId || !this.options) {
      return;
    }

    const url = this.buildWebSocketUrl(this.riderId);
    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(url);
    } catch (error) {
      console.error('❌ Failed to initialise rider location WebSocket:', error);
      this.handleError(error instanceof Error ? error : new Error('WebSocket init error'));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.updateStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const location = this.parseLocation(payload);
        if (location) {
          this.options?.onUpdate(location);
        }
      } catch (error) {
        console.error('❌ Failed to parse rider location message:', error);
        this.handleError(error instanceof Error ? error : new Error('Parse error'));
      }
    };

    this.ws.onerror = () => {
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onclose = () => {
      this.updateStatus('disconnected');
      this.ws = null;
      if (this.riderId) {
        this.scheduleReconnect();
      }
    };
  }

  private parseLocation(payload: any): RiderLocationUpdate | null {
    const data = payload?.data ?? payload;
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const update: RiderLocationUpdate = {
      latitude,
      longitude,
    };

    if (data?.heading !== undefined) {
      update.heading = Number(data.heading);
    }

    if (data?.speed !== undefined) {
      update.speed = Number(data.speed);
    }

    if (data?.accuracy !== undefined) {
      update.accuracy = Number(data.accuracy);
    }

    if (data?.timestamp || data?.updated_at) {
      update.updated_at = data.timestamp ?? data.updated_at;
    }

    return update;
  }

  private scheduleReconnect() {
    this.clearReconnect();

    if (!this.riderId || !this.options) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.openConnection();
    }, 5000);
  }

  private clearReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private buildWebSocketUrl(riderId: number) {
    if (process.env.EXPO_PUBLIC_WS_RIDER_LOCATION_URL) {
      return process.env.EXPO_PUBLIC_WS_RIDER_LOCATION_URL.replace(
        '{rider_id}',
        String(riderId)
      );
    }

    const apiBase = process.env.EXPO_PUBLIC_API_BASE;
    if (apiBase) {
      const wsProtocol = apiBase.startsWith('https') ? 'wss' : 'ws';
      const host = apiBase.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return `${wsProtocol}://${host}/ws/rider/location/${riderId}/`;
    }

    return `ws://localhost:8000/ws/rider/location/${riderId}/`;
  }

  private updateStatus(status: RiderLocationConnectionStatus) {
    this.status = status;
    this.options?.onStatusChange?.(status);
  }

  private handleError(error: Error) {
    this.updateStatus('error');
    this.options?.onError?.(error);
  }
}

export const riderLocationSocket = new RiderLocationSocket();


