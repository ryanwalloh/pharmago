/**
 * WebSocket service for real-time order tracking
 * Provides instant updates without polling lag
 */

type MessageHandler = (data: any) => void;

class OrderTrackingWebSocketService {
  private ws: WebSocket | null = null;
  private orderId: string | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;

  constructor() {
    // Removed console.log to prevent import-time crashes in production builds
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(orderId: string): string {
    // Check if running on localhost
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `ws://localhost:8000/ws/order/tracking/${orderId}/`;
    }

    // Production: Use Railway WebSocket URL (wss:// for https://)
    return `wss://pharmago-backend-production.up.railway.app/ws/order/tracking/${orderId}/`;
  }

  /**
   * Connect to order tracking WebSocket
   */
  connect(orderId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.orderId === orderId) {
      console.log('✅ Already connected to order', orderId);
      return;
    }

    // Close existing connection if switching orders
    if (this.ws) {
      this.disconnect();
    }

    this.orderId = orderId;
    const wsUrl = this.getWebSocketUrl(orderId);
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected for order', orderId);
        this.reconnectAttempts = 0;
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
        
        // Notify handlers
        this.emit('connected', { orderId });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type);
          
          // Emit to registered handlers
          this.emit(data.type, data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.stopPingInterval();
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (this.orderId) {
              this.connect(this.orderId);
            }
          }, delay);
        }
        
        this.emit('disconnected', { code: event.code, reason: event.reason });
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.stopPingInterval();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      console.log('🔌 Disconnecting WebSocket');
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.orderId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval() {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send message to WebSocket
   */
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }

  /**
   * Register event handler
   */
  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
// Lazy singleton - only create instance when first accessed
let orderTrackingWSInstance: OrderTrackingWebSocketService | null = null;

export const orderTrackingWS = new Proxy({} as OrderTrackingWebSocketService, {
  get(target, prop) {
    if (!orderTrackingWSInstance) {
      orderTrackingWSInstance = new OrderTrackingWebSocketService();
    }
    const value = (orderTrackingWSInstance as any)[prop];
    return typeof value === 'function' ? value.bind(orderTrackingWSInstance) : value;
  }
});

