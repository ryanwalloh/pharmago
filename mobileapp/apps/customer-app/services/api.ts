// API service for customer app
// API configuration for different environments
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy initialization to avoid import-time crashes in production builds
let cachedApiBaseUrl: string | null = null;

const getApiBaseUrl = () => {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  console.log('🔍 Determining API base URL...');

  try {
    // Web (localhost)
    if (typeof window !== 'undefined' && window?.location?.hostname === 'localhost') {
      cachedApiBaseUrl = 'http://localhost:8000/api/v1';
      console.log('✅ Using localhost (web):', cachedApiBaseUrl);
      return cachedApiBaseUrl;
    }

    // Optional: EXPO_PUBLIC_API_BASE override (e.g., http://192.168.1.10:8000)
    const envBase: string | undefined = process.env.EXPO_PUBLIC_API_BASE;
    console.log('🔍 EXPO_PUBLIC_API_BASE:', envBase);
    if (envBase) {
      const normalized = envBase.endsWith('/') ? envBase.slice(0, -1) : envBase;
      cachedApiBaseUrl = `${normalized}/api/v1`;
      console.log('✅ Using env var:', cachedApiBaseUrl);
      return cachedApiBaseUrl;
    }

    // Try to derive host from Expo packager/SourceCode script URL
    // IMPORTANT: This is wrapped in try-catch because NativeModules access
    // can crash if called before React Native bridge is fully initialized
    try {
      // Use optional chaining and check if NativeModules is available first
      let expHostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri
        || (Constants as any)?.manifest?.debuggerHost;
      
      // Only access NativeModules if it's safe (not null/undefined)
      if (!expHostUri && NativeModules && typeof NativeModules === 'object') {
        try {
          expHostUri = (NativeModules as any)?.SourceCode?.scriptURL;
        } catch (nativeErr) {
          // Silently fail if native module access fails
          console.warn('⚠️ Could not access NativeModules.SourceCode - bridge may not be ready:', nativeErr);
        }
      }

      if (expHostUri) {
        // expHostUri examples:
        //  - '192.168.0.5:8081'
        //  - 'exp://192.168.0.5:8081'
        //  - 'http://192.168.0.5:8081/index.bundle?...'
        const withoutScheme = expHostUri.replace(/^\w+:\/\//, '');
        const host = withoutScheme.split(':')[0].split('/')[0];
        if (host && /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
          cachedApiBaseUrl = `http://${host}:8000/api/v1`;
          console.log('✅ Using derived IP:', cachedApiBaseUrl);
          return cachedApiBaseUrl;
        }
      }
    } catch (err) {
      // Catch any unexpected errors during URL derivation
      console.warn('⚠️ Error deriving API URL from native modules:', err);
    }
  } catch {}

  // Fallback: Use Railway backend for production/testing
  // For local development, set EXPO_PUBLIC_API_BASE environment variable
  cachedApiBaseUrl = 'https://pharmago-backend-production.up.railway.app/api/v1';
  console.log('✅ Using Railway fallback:', cachedApiBaseUrl);
  return cachedApiBaseUrl;
};

// Timeout helper for fetch requests
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

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
  private baseURL: string | null = null;
  private authToken: string | null = null;

  private getBaseURL(): string {
    if (!this.baseURL) {
      this.baseURL = getApiBaseUrl();
    }
    return this.baseURL;
  }

  public async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    suppressAuthLog: boolean = false
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.getBaseURL()}${endpoint}`;
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

      const response = await fetchWithTimeout(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
          ...options.headers,
        },
        ...options,
      }, 15000); // 15 second timeout

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
    const normalized = this.getBaseURL().replace(/\/$/, '');
    return normalized.replace('/api/v1', '/api');
  }

  // Make request against direct, auth-bypassing endpoints (per docs)
  public async makeDirectRequest<T>(
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

      const response = await fetchWithTimeout(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      }, 15000); // 15 second timeout

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
    // Use versioned registration endpoint per URL refactor
    return this.makeRequest('/users/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
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
    console.log('📍 Backend URL:', this.getBaseURL());
    
    try {
      // Use lightweight test endpoint instead of /users/register/
      const testUrl = `${this.getBaseURL().replace('/api/v1', '')}/api/test/`;
      console.log('🔗 Testing endpoint:', testUrl);
      
      const response = await fetchWithTimeout(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 5000); // 5 second timeout for lightweight endpoint

      console.log('🔗 Connection test response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        timestamp: new Date().toISOString()
      });

      // Check if we got a successful response
      if (response.ok || response.status === 200) {
        const data = await response.json();
        console.log('✅ Backend connection successful!', data);
        return {
          success: true,
          message: 'Backend connection successful',
          data: data
        };
      } else {
        console.log('⚠️ Backend responded with unexpected status:', response.status);
        return {
          success: false,
          error: `Unexpected response: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      
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

  // Search methods
  async searchMedicines(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    console.log('🔍 Searching medicines:', query);
    return this.makeDirectRequest(`/search-medicines/?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async searchPharmacies(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    console.log('🔍 Searching pharmacies:', query);
    return this.makeDirectRequest(`/search-pharmacies/?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getPharmaciesByMedicine(medicineName: string, dosage: string, form: string): Promise<ApiResponse<any[]>> {
    console.log('🔍 Getting pharmacies by medicine:', { medicineName, dosage, form });
    return this.makeDirectRequest(
      `/pharmacies-by-medicine/?medicine_name=${encodeURIComponent(medicineName)}&dosage=${encodeURIComponent(dosage)}&form=${encodeURIComponent(form)}`
    );
  }

  async calculateDistanceAndFee(
    pharmacyLat: number,
    pharmacyLng: number,
    customerLat: number,
    customerLng: number
  ): Promise<ApiResponse<any>> {
    console.log('📏 Calculating distance and delivery fee');
    return this.makeDirectRequest(
      `/calculate-distance-and-fee/?pharmacy_lat=${pharmacyLat}&pharmacy_lng=${pharmacyLng}&customer_lat=${customerLat}&customer_lng=${customerLng}`
    );
  }

  async searchPharmacyInventory(pharmacyId: number, query: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    console.log('🔍 Searching pharmacy inventory:', { pharmacyId, query });
    return this.makeDirectRequest(`/search-pharmacy-inventory/${pharmacyId}/?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Address Management Methods
  async createOrUpdateAddress(addressData: any): Promise<ApiResponse<any>> {
    console.log('📍 Creating/updating address:', addressData);
    return this.makeDirectRequest('/create-or-update-address/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData)
    });
  }

  async getCustomerAddresses(customerId: number): Promise<ApiResponse<any>> {
    console.log('📋 Getting customer addresses:', customerId);
    return this.makeDirectRequest(`/customer-addresses/${customerId}/`);
  }

  async createCartOrder(orderData: any): Promise<ApiResponse<any>> {
    console.log('🛒 Creating cart order:', orderData);
    return this.makeDirectRequest('/create-cart-order/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
  }

  async getDefaultAddress(customerId: number): Promise<ApiResponse<any>> {
    console.log('🏠 Getting default address:', customerId);
    return this.makeDirectRequest(`/default-address/${customerId}/`);
  }

  async updateAddress(addressId: number, addressData: any): Promise<ApiResponse<any>> {
    console.log('✏️ Updating address:', addressId, addressData);
    return this.makeDirectRequest(`/update-address/${addressId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData)
    });
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
      // Step 1: Upload to Cloudinary
      console.log('☁️ Uploading prescription to Cloudinary...');
      const { uploadPrescriptionImage } = await import('./cloudinaryService');
      
      const cloudinaryResult = await uploadPrescriptionImage(localUri);
      
      if (!cloudinaryResult.success || !cloudinaryResult.url) {
        console.error('❌ Cloudinary upload failed:', cloudinaryResult.error);
        return { 
          success: false, 
          error: cloudinaryResult.error || 'Failed to upload to cloud storage' 
        };
      }

      console.log('✅ Cloudinary upload successful:', cloudinaryResult.url);

      // Step 2: Send Cloudinary URL to backend
      const url = `${this.getDirectBaseUrl()}/upload-prescription-image/`;
      console.log('📤 Sending Cloudinary URL to backend...', { url, cloudinaryUrl: cloudinaryResult.url, orderId });

      const payload: any = {
        prescription_url: cloudinaryResult.url,
      };
      if (orderId) {
        payload.order_id = orderId;
      }

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, 15000); // 15 second timeout

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to save prescription URL', message: json.message };
      }

      return {
        success: true,
        data: {
          url: cloudinaryResult.url,
          order_updated: json.order_updated,
          order_id: json.order_id,
        },
      };
    } catch (error) {
      console.error('❌ Prescription upload error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload error' };
    }
  }

  // Rider driver's license methods
  async uploadDriverLicenseFile(
    localUri: string,
    userId?: number
  ): Promise<ApiResponse<{ url: string; document_id?: number }>> {
    try {
      // Step 1: Upload to Cloudinary
      console.log('☁️ Uploading driver license to Cloudinary...');
      const { uploadDriverLicenseImage } = await import('./cloudinaryService');
      
      const cloudinaryResult = await uploadDriverLicenseImage(localUri);
      
      if (!cloudinaryResult.success || !cloudinaryResult.url) {
        console.error('❌ Cloudinary upload failed:', cloudinaryResult.error);
        return { 
          success: false, 
          error: cloudinaryResult.error || 'Failed to upload to cloud storage' 
        };
      }

      console.log('✅ Cloudinary upload successful:', cloudinaryResult.url);

      // Step 2: Send Cloudinary URL to backend
      const url = `${this.getDirectBaseUrl()}/upload-driver-license/`;
      console.log('📤 Sending Cloudinary URL to backend...', { url, cloudinaryUrl: cloudinaryResult.url, userId });

      const payload: any = {
        license_url: cloudinaryResult.url,
      };
      if (userId) {
        payload.user_id = userId;
      }

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, 15000); // 15 second timeout

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, error: json.error || 'Failed to save license URL', message: json.message };
      }

      return {
        success: true,
        data: {
          url: cloudinaryResult.url,
          document_id: json.document_id,
        },
      };
    } catch (error) {
      console.error('❌ Driver license upload error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload error' };
    }
  }

  // Rider registration completion (direct endpoint)
  async completeRiderRegistration(payload: any): Promise<ApiResponse<any>> {
    return this.makeDirectRequest('/complete-rider-registration/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Get available orders count for riders (direct endpoint)
  async getAvailableOrdersCount(): Promise<ApiResponse<{count: number}>> {
    return this.makeDirectRequest('/available-orders-count/', {
      method: 'GET',
    });
  }

  // Get available orders for riders (direct endpoint)
  async getAvailableOrders(): Promise<ApiResponse<{count: number, orders: any[]}>> {
    return this.makeDirectRequest('/available-orders/', {
      method: 'GET',
    });
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

  async cancelOrder(orderId: number, data: { customer_id: number; reason: string }): Promise<ApiResponse<any>> {
    console.log('🚫 Cancelling order:', orderId, data);
    return this.makeRequest(`/cancel/${orderId}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
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
    // Customer app: Use public endpoint directly (no auth needed)
    // Skipping secure endpoint to avoid 403 errors and latency
    const direct = await this.makeDirectRequest('/order-chat-room/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId, pharmacy_id: pharmacyId })
    });
    if (direct && (direct as any).data && ((direct as any).data as any).room_id) {
      const d: any = (direct as any).data;
      return { success: true, data: { room: { id: d.room_id, room_id: d.room_key } } };
    }
    return direct;
  }

  async getOrderChatMessages(roomId: number, limit: number = 100): Promise<ApiResponse<any>> {
    // Customer app: Use public endpoint directly (no auth needed)
    // Skipping secure endpoint to avoid 403 errors and latency
    return this.makeDirectRequest(`/order-chat-messages/?room_id=${roomId}&limit=${limit}`);
  }

  async sendOrderChatMessage(roomId: number, content: string): Promise<ApiResponse<any>> {
    // Customer app: Use public endpoint directly (no auth needed)
    // Skipping secure endpoint to avoid 403 errors and latency
    return this.makeDirectRequest('/order-chat-send-customer/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, content })
    });
  }

  async markOrderChatRead(roomId: number, pharmacyId?: number): Promise<ApiResponse<any>> {
    // Customer app: Use public endpoint directly (no auth needed)
    // Skipping secure endpoint to avoid 403 errors and latency
    return this.makeDirectRequest('/order-chat-mark-read/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pharmacyId ? { room_id: roomId, pharmacy_id: pharmacyId } : { room_id: roomId })
    });
  }

  async setOrderChatTyping(roomId: number, isTyping: boolean, pharmacyId?: number): Promise<ApiResponse<any>> {
    // Customer app: Use public endpoint directly (no auth needed)
    // Skipping secure endpoint to avoid 403 errors and latency
    return this.makeDirectRequest('/order-chat-typing/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pharmacyId ? { room_id: roomId, pharmacy_id: pharmacyId, is_typing: isTyping } : { room_id: roomId, is_typing: isTyping })
    });
  }

  async getOrderChatTypingStatus(roomId: number): Promise<ApiResponse<any>> {
    // Customer app: Use public endpoint directly (no auth needed)
    // Skipping secure endpoint to avoid 403 errors and latency
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

  // Stripe payment methods
  async createStripePaymentIntent(orderId: number): Promise<ApiResponse<any>> {
    console.log('💳 Creating Stripe payment intent for order:', orderId);
    return this.makeDirectRequest('/stripe/create-payment-intent/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_id: orderId }),
    });
  }

  async confirmStripePayment(orderId: number, paymentIntentId: string): Promise<ApiResponse<any>> {
    console.log('💳 Confirming Stripe payment:', { orderId, paymentIntentId });
    return this.makeDirectRequest('/stripe/confirm-payment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        order_id: orderId,
        payment_intent_id: paymentIntentId 
      }),
    });
  }

  // Customer orders
  async getCustomerOrders(customerId: number): Promise<ApiResponse<any>> {
    console.log('📋 Fetching orders for customer:', customerId);
    return this.makeDirectRequest(`/customer-orders/${customerId}/`);
  }
}

// Lazy singleton - only create instance when first accessed
let apiServiceInstance: ApiService | null = null;

export const apiService = new Proxy({} as ApiService, {
  get(target, prop) {
    if (!apiServiceInstance) {
      apiServiceInstance = new ApiService();
    }
    const value = (apiServiceInstance as any)[prop];
    return typeof value === 'function' ? value.bind(apiServiceInstance) : value;
  }
});

export default apiService;
