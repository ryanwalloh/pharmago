/**
 * Order Count Service for Rider App
 * Handles real-time order count updates via WebSocket
 * 
 * This service replaces polling with WebSocket connections to receive
 * instant updates when available order count changes.
 */

export interface OrderCountUpdate {
  count: number;
}

class OrderCountService {
  private wsConnection: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onCountUpdateCallback: ((count: number) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;
  private onDisconnectedCallback: (() => void) | null = null;
  private isManualDisconnect: boolean = false;

  /**
   * Connect to order count WebSocket channel
   */
  connectToOrderCount(
    onCountUpdate: (count: number) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) {
    this.onCountUpdateCallback = onCountUpdate;
    this.onConnectedCallback = onConnected || null;
    this.onDisconnectedCallback = onDisconnected || null;
    this.isManualDisconnect = false;

    const wsUrl = this.getWebSocketUrl();
    
    console.log(`🔌 Connecting to order count WebSocket: ${wsUrl}`);

    try {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('✅ Order count WebSocket connected');
        if (this.onConnectedCallback) {
          this.onConnectedCallback();
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Order count message received:', data.type);

          if (data.type === 'connection_established') {
            console.log('🎉 Order count WebSocket connection established');
            // Initial count from connection
            if (data.count !== undefined && this.onCountUpdateCallback) {
              this.onCountUpdateCallback(data.count);
            }
          } else if (data.type === 'order_count_update') {
            console.log('📊 Order count update:', data.count);
            if (this.onCountUpdateCallback) {
              this.onCountUpdateCallback(data.count);
            }
          } else if (data.type === 'pong') {
            // Ping response (for keep-alive)
            console.log('🏓 Pong received');
            if (data.count !== undefined && this.onCountUpdateCallback) {
              this.onCountUpdateCallback(data.count);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing order count message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ Order count WebSocket error:', error);
      };

      this.wsConnection.onclose = () => {
        console.log('🔌 Order count WebSocket disconnected');
        this.wsConnection = null;

        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }

        // Auto-reconnect after 5 seconds if not manually disconnected
        if (!this.isManualDisconnect && this.onCountUpdateCallback) {
          this.reconnectTimeout = setTimeout(() => {
            console.log('🔄 Reconnecting to order count WebSocket...');
            this.connectToOrderCount(
              this.onCountUpdateCallback!,
              this.onConnectedCallback!,
              this.onDisconnectedCallback!
            );
          }, 5000) as any;
        }
      };
    } catch (error) {
      console.error('❌ Failed to connect to order count WebSocket:', error);
    }
  }

  /**
   * Disconnect from order count WebSocket
   */
  disconnect() {
    this.isManualDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    this.onCountUpdateCallback = null;
    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;

    console.log('🔌 Order count WebSocket disconnected (manual)');
  }

  /**
   * Send a ping to keep connection alive and get current count
   */
  ping() {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({ type: 'ping' }));
    }
  }

  /**
   * Request current count manually
   */
  requestCount() {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({ type: 'request_count' }));
    }
  }

  /**
   * Get WebSocket URL for order count channel
   */
  private getWebSocketUrl(): string {
    if (process.env.EXPO_PUBLIC_WS_ORDER_COUNT_URL) {
      return process.env.EXPO_PUBLIC_WS_ORDER_COUNT_URL;
    }

    const base =
      (process.env.EXPO_PUBLIC_API_BASE && process.env.EXPO_PUBLIC_API_BASE.trim()) ||
      'https://pharmago-backend-production.up.railway.app';

    try {
      const parsed = new URL(base);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}/ws/rider/order-count/`;
    } catch (error) {
      console.warn('⚠️ Unable to parse API base for order count WebSocket, using fallback hostname', {
        base,
        error,
      });
      const host = base.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return `wss://${host}/ws/rider/order-count/`;
    }
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.wsConnection !== null && this.wsConnection.readyState === WebSocket.OPEN;
  }
}

export const orderCountService = new OrderCountService();

