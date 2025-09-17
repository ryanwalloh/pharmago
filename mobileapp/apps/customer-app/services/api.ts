// API service for customer app
// API configuration for different environments
const getApiBaseUrl = () => {
  // Check if running on web (localhost works)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api/v1';
  }
  
  // For mobile devices, use the computer's IP address
  // Update this IP address to match your development machine's IP
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

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    console.log('🔧 API Service initialized with base URL:', this.baseURL);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
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
        console.error('❌ API Request Failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error || data.details || 'Request failed',
          message: data.message,
          timestamp: new Date().toISOString()
        });
        
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
}

export const apiService = new ApiService();
export default apiService;
