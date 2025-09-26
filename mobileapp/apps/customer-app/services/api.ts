// API service for customer app
// API configuration for different environments
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiBaseUrl = () => {
  // Web (localhost)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api/v1';
  }

  // Optional: EXPO_PUBLIC_API_BASE override (e.g., http://192.168.1.10:8000)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const envBase: string | undefined = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) {
    const normalized = envBase.endsWith('/') ? envBase.slice(0, -1) : envBase;
    return `${normalized}/api/v1`;
  }

  // Try to derive host from Expo packager/SourceCode script URL
  try {
    const expHostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri
      || (Constants as any)?.manifest?.debuggerHost
      || (NativeModules as any)?.SourceCode?.scriptURL;

    if (expHostUri) {
      // expHostUri examples:
      //  - '192.168.0.5:8081'
      //  - 'exp://192.168.0.5:8081'
      //  - 'http://192.168.0.5:8081/index.bundle?...'
      const withoutScheme = expHostUri.replace(/^\w+:\/\//, '');
      const host = withoutScheme.split(':')[0].split('/')[0];
      if (host && /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        return `http://${host}:8000/api/v1`;
      }
    }
  } catch {}

  // Fallback (update if needed)
  return 'http://192.168.254.103:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export interface UserRegistrationData {
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  password_confirm: string;
  role: 'customer';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    console.log('🔧 API Service initialized with base URL:', this.baseURL);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    suppressAuthLog: boolean = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      // Attach auth token if present (lazy-load from storage once)
      try {
        if (!this.authToken) {
          const stored = await AsyncStorage.getItem('auth_token');
          if (stored) this.authToken = stored;
        }
      } catch {}
      
      // Debug logging
      console.log('🚀 API Request:', {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? JSON.parse(options.body as string) : null,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
          ...options.headers,
        },
        ...options,
      });

      console.log('📡 API Response Status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString()
      });

      const data = await response.json();
      
      console.log('📄 API Response Data:', {
        data,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        const isAuthError = response.status === 401 || response.status === 403;
        if (!(suppressAuthLog && isAuthError)) {
          console.error('❌ API Request Failed:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error || data.details || 'Request failed',
            message: data.message,
            timestamp: new Date().toISOString()
          });
        }
        
        return {
          success: false,
          error: data.error || data.details || 'Request failed',
          message: data.message,
        };
      }

      console.log('✅ API Request Successful:', {
        success: true,
        message: data.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: data,
        message: data.message,
      };
    } catch (error) {
      console.error('💥 API Network Error:', {
        error: error instanceof Error ? error.message : 'Network error',
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Build base URL for direct endpoints under /api (not /api/v1)
  private getDirectBaseUrl(): string {
    const normalized = this.baseURL.replace(/\/$/, '');
    return normalized.replace('/api/v1', '/api');
  }

  // Make request against direct, auth-bypassing endpoints (per docs)
  private async makeDirectRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.getDirectBaseUrl()}${endpoint}`;

      console.log('🚀 API Direct Request:', {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? JSON.parse(options.body as string) : null,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('📡 API Direct Response Status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString()
      });

      const data = await response.json();

      console.log('📄 API Direct Response Data:', {
        data,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        return {
          success: false,
          error: (data && (data.error || data.details)) || 'Request failed',
          message: data && data.message,
        };
      }

      return {
        success: true,
        data: data,
        message: data && data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async registerUser(userData: UserRegistrationData): Promise<ApiResponse<any>> {
    // Use the direct registration endpoint that bypasses CSRF
    const directUrl = this.baseURL.replace('/api/v1', '') + '/api/user-register/';
    
    try {
      console.log('🚀 Direct API Request:', {
        url: directUrl,
        method: 'POST',
        body: userData,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(directUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('📡 Direct API Response Status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString(),
      });

      const data = await response.json();
      console.log('📄 Direct API Response Data:', {
        data,
        timestamp: new Date().toISOString(),
      });

      if (response.ok) {
        console.log('✅ Direct API Request Successful:', {
          message: data.message || 'Success',
          success: true,
          timestamp: new Date().toISOString(),
        });
        return {
          success: true,
          data,
          message: data.message || 'Registration successful',
        };
      } else {
        console.log('❌ Direct API Request Failed:', {
          error: data.error || data.details || 'Unknown error',
          success: false,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          error: data.error || data.details || 'Registration failed',
          data,
        };
      }
    } catch (error) {
      console.log('💥 Direct API Network Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed',
      };
    }
  }

  async loginUser(email: string, password: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/users/login/', {
      method: 'POST',
      body: JSON.stringify({
        username: email, // Backend expects username field
        password: password,
      }),
    });
  }

  async testConnection(): Promise<ApiResponse<any>> {
    console.log('🔍 Testing connection to backend...');
    console.log('📍 Backend URL:', this.baseURL);
    
    try {
      // Try to make a simple GET request to a known endpoint
      const response = await fetch(`${this.baseURL}/users/register/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔗 Connection test response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString()
      });

      // Even if we get a 405 (Method Not Allowed), it means the server is reachable
      if (response.status === 405 || response.status === 200) {
        console.log('✅ Backend connection successful!');
        return {
          success: true,
          message: 'Backend connection successful',
          data: { status: response.status, statusText: response.statusText }
        };
      } else {
        console.log('⚠️ Backend responded with unexpected status:', response.status);
        return {
          success: false,
          error: `Unexpected response: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Pharmacy methods
  async getPharmacies(): Promise<ApiResponse<any[]>> {
    console.log('🏥 Fetching pharmacies...');
    // Use the direct approved & active endpoint (bypasses auth per guide)
    // backend/pharmago/urls.py → path('api/active-pharmacies/', direct_active_pharmacies)
    return this.makeDirectRequest('/active-pharmacies/');
  }

  async getPendingPharmacies(): Promise<ApiResponse<any[]>> {
    console.log('🏥 Fetching pending pharmacies (fallback)...');
    return this.makeDirectRequest('/pending-pharmacies/');
  }

  async getPharmacyById(id: string): Promise<ApiResponse<any>> {
    console.log('🏥 Fetching pharmacy by ID:', id);
    return this.makeRequest(`/pharmacies/${id}/`);
  }

  // Order methods
  async createOrder(orderData: any): Promise<ApiResponse<any>> {
    console.log('📦 Creating order...');
    return this.makeRequest('/orders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
  }

  async getOrders(): Promise<ApiResponse<any[]>> {
    console.log('📦 Fetching orders...');
    return this.makeRequest('/orders/');
  }

  async getOrderById(id: string): Promise<ApiResponse<any>> {
    console.log('📦 Fetching order by ID:', id);
    return this.makeRequest(`/orders/${id}/`);
  }

  // Prescription methods
  async uploadPrescriptionFile(
    localUri: string,
    orderId?: number
  ): Promise<ApiResponse<{ url: string; order_updated?: boolean; order_id?: number }>> {
    try {
      const url = `${this.getDirectBaseUrl()}/upload-prescription-image/`;
      console.log('📸 Uploading prescription image (multipart)...', { url, localUri, orderId });

      const form = new FormData();
      form.append('file', {
        uri: localUri,
        name: 'prescription.jpg',
        type: 'image/jpeg',
      } as any);
      if (orderId) {
        form.append('order_id', String(orderId));
      }

      const response = await fetch(url, {
        method: 'POST',
        // Do NOT set Content-Type; let fetch/RN set correct boundary for multipart
        body: form,
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, error: json.error || 'Upload failed', message: json.message };
      }

      return {
        success: true,
        data: {
          url: json.url,
          order_updated: json.order_updated,
          order_id: json.order_id,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Upload error' };
    }
  }

  // Prescription order methods
  async createPrescriptionOrder(orderData: any): Promise<ApiResponse<any>> {
    console.log('📦 Creating prescription order...');
    return this.makeDirectRequest('/create-prescription-order/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });
  }

  async getOrderStatus(orderId: string): Promise<ApiResponse<any>> {
    console.log('📦 Getting order status for ID:', orderId);
    return this.makeDirectRequest(`/order-status/${orderId}/`);
  }

  async approvePricing(orderId: number, approve: boolean = true, notes?: string): Promise<ApiResponse<any>> {
    try {
      const body: any = { order_id: orderId, approve };
      if (notes && notes.trim().length > 0) body.notes = notes.trim();
      return await this.makeDirectRequest('/customer-approve-pricing/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Approval failed' };
    }
  }

  // Chat (dev direct endpoints)
  async getOrCreateOrderChatRoom(orderId: number, pharmacyId?: number): Promise<ApiResponse<any>> {
    // Try secure route first
    const secure = await this.makeRequest(`/chat-rooms/get-or-create-by-order/`, {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId })
    }, true);
    if (secure.success) {
      // Normalize to { room }
      const roomObj = (secure.data as any) || {};
      return { success: true, data: { room: roomObj } };
    }
    // Fallback to dev route
    return this.makeDirectRequest('/order-chat-room/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId, pharmacy_id: pharmacyId })
    });
  }

  async getOrderChatMessages(roomId: number, limit: number = 100): Promise<ApiResponse<any>> {
    // Secure
    const secure = await this.makeRequest(`/chat-rooms/${roomId}/messages/`, {}, true);
    if (secure.success) {
      // DRF returns a list or paginated results; normalize to { messages, count }
      const payload: any = secure.data;
      const messages = Array.isArray(payload) ? payload : (Array.isArray(payload?.results) ? payload.results : []);
      return { success: true, data: { room: { id: roomId }, messages, count: messages.length } };
    }
    // Fallback
    return this.makeDirectRequest(`/order-chat-messages/?room_id=${roomId}&limit=${limit}`);
  }

  async sendOrderChatMessage(roomId: number, content: string): Promise<ApiResponse<any>> {
    // Secure
    const secure = await this.makeRequest(`/chat-rooms/${roomId}/send/`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }, true);
    if (secure.success) return secure;
    // Fallback (dev)
    return this.makeDirectRequest('/order-chat-send-customer/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, content })
    });
  }

  async markOrderChatRead(roomId: number, pharmacyId?: number): Promise<ApiResponse<any>> {
    // Secure
    const secure = await this.makeRequest(`/chat-rooms/${roomId}/mark-read/`, { method: 'POST' }, true);
    if (secure.success) return secure;
    // Fallback
    return this.makeDirectRequest('/order-chat-mark-read/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pharmacyId ? { room_id: roomId, pharmacy_id: pharmacyId } : { room_id: roomId })
    });
  }

  async setOrderChatTyping(roomId: number, isTyping: boolean, pharmacyId?: number): Promise<ApiResponse<any>> {
    // Secure
    const secure = await this.makeRequest(`/chat-rooms/${roomId}/typing/`, {
      method: 'POST',
      body: JSON.stringify({ is_typing: isTyping })
    }, true);
    if (secure.success) return secure;
    // Fallback
    return this.makeDirectRequest('/order-chat-typing/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pharmacyId ? { room_id: roomId, pharmacy_id: pharmacyId, is_typing: isTyping } : { room_id: roomId, is_typing: isTyping })
    });
  }

  async getOrderChatTypingStatus(roomId: number): Promise<ApiResponse<any>> {
    const secure = await this.makeRequest(`/chat-rooms/${roomId}/typing-status/`, {}, true);
    if (secure.success) return secure;
    return this.makeDirectRequest(`/order-chat-typing-status/?room_id=${roomId}`);
  }

  // Allow app to set or clear the auth token used for secure endpoints
  setAuthToken(token: string | null) {
    this.authToken = token;
    try {
      if (token) AsyncStorage.setItem('auth_token', token);
      else AsyncStorage.removeItem('auth_token');
    } catch {}
  }
}

export const apiService = new ApiService();
export default apiService;
