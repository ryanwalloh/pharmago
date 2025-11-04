/**
 * WebSocket service for real-time chat functionality.
 * 
 * Features:
 * - Real-time message sending/receiving
 * - Typing indicators
 * - Read receipts
 * - Automatic reconnection
 * - Connection state management
 */

type MessageHandler = (data: any) => void;

interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  content: string;
  message_type: string;
  timestamp: string;
  is_system_message: boolean;
}

class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private roomId: number | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isConnecting = false;

  constructor() {
    // Initialization
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(roomId: number): string {
    // Check if running on localhost (web only - React Native doesn't have window.location)
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      return `ws://localhost:8000/ws/chat/${roomId}/`;
    }

    // Production: Use Railway WebSocket URL (wss:// for https://)
    return `wss://pharmago-backend-production.up.railway.app/ws/chat/${roomId}/`;
  }

  /**
   * Connect to chat WebSocket for a specific room
   */
  connect(roomId: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomId === roomId) {
      console.log('✅ Already connected to chat room', roomId);
      return;
    }

    // Close existing connection if switching rooms
    if (this.ws && this.roomId !== roomId) {
      this.disconnect();
    }

    this.roomId = roomId;
    this.isConnecting = true;
    const wsUrl = this.getWebSocketUrl(roomId);
    
    try {
      console.log(`🔌 Connecting to chat room ${roomId}...`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`✅ Connected to chat room ${roomId}`);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
        
        // Trigger connection handler
        this.triggerHandler('connection_established', { roomId });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const messageType = data.type;

          console.log(`📨 Chat message received:`, messageType);

          // Trigger appropriate handler based on message type
          this.triggerHandler(messageType, data);
        } catch (error) {
          console.error('❌ Error parsing chat WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Chat WebSocket error:', error);
        this.isConnecting = false;
        this.triggerHandler('error', { error });
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 Chat WebSocket closed (code: ${event.code})`);
        this.isConnecting = false;
        this.stopPingInterval();
        
        this.triggerHandler('disconnected', { code: event.code });

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Failed to create chat WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from chat WebSocket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.roomId = null;
    this.reconnectAttempts = 0;
    console.log('🔌 Disconnected from chat WebSocket');
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string, senderId: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot send message - WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        content,
        sender_id: senderId
      }));
      
      console.log('✅ Chat message sent via WebSocket');
      return true;
    } catch (error) {
      console.error('❌ Failed to send chat message:', error);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  setTyping(isTyping: boolean, senderId: number, senderName: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
        sender_id: senderId,
        sender_name: senderName
      }));
    } catch (error) {
      console.error('❌ Failed to send typing indicator:', error);
    }
  }

  /**
   * Mark messages as read
   */
  markMessagesRead(messageIds: number[], readerId: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'mark_read',
        message_ids: messageIds,
        reader_id: readerId
      }));
    } catch (error) {
      console.error('❌ Failed to mark messages as read:', error);
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
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }

  /**
   * Trigger event handlers
   */
  private triggerHandler(event: string, data: any) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval() {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('❌ Failed to send ping:', error);
        }
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
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout || !this.roomId) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`🔄 Scheduling chat reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.roomId) {
        this.connect(this.roomId);
      }
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId(): number | null {
    return this.roomId;
  }
}

// Export singleton instance
export const chatWebSocket = new ChatWebSocketService();

