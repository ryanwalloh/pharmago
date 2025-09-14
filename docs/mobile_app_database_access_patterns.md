# Mobile App Database Access Patterns & Hybrid Development Approach

## Overview

This document outlines the database access patterns for the PharmaGo mobile application and the hybrid development approach we've implemented to enable seamless development across web and mobile platforms.

## Hybrid Development Approach

### What is the Hybrid Approach?

The hybrid approach allows developers to work on both web frontend and mobile applications simultaneously while sharing the same Django backend API. This approach provides:

- **Shared Backend**: Single Django API serves both web and mobile applications
- **Unified Development**: Developers can work on web and mobile features simultaneously
- **Consistent Data**: Both platforms access the same database and business logic
- **Rapid Prototyping**: Changes to backend immediately available to both platforms

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  Mobile Apps    │    │  Django Backend │
│   (React)       │    │  (React Native) │    │  (API Server)   │
│                 │    │                 │    │                 │
│  localhost:3000 │    │  Expo Dev       │    │  0.0.0.0:8000   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL     │
                    │   Database       │
                    │   localhost:5433 │
                    └─────────────────┘
```

## Mobile App Database Access Patterns

### 1. API Service Architecture

The mobile app uses a centralized API service to handle all database operations through the Django backend:

```typescript
// mobileapp/apps/customer-app/services/api.ts
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
    // Centralized request handling with error management
  }
}
```

### 2. Dynamic URL Configuration

The mobile app dynamically determines the backend URL based on the environment:

```typescript
const getApiBaseUrl = () => {
  // Check if running on web (localhost works)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api/v1';
  }
  
  // For mobile devices, use the computer's IP address
  return 'http://192.168.254.103:8000/api/v1';
};
```

### 3. Direct Endpoint Pattern

For operations that need to bypass Django's authentication middleware (like registration), we use direct endpoints:

```python
# backend/pharmago/urls.py
@csrf_exempt
def direct_user_registration(request):
    """Direct user registration endpoint that bypasses all authentication"""
    # Handles mobile app registration without CSRF issues
```

## Database Access Patterns

### 1. User Registration Pattern

**Mobile App Flow:**
```typescript
// 1. Prepare registration data
const userData = {
  username: 'mobiletest',
  email: 'mobile@example.com',
  password: 'password123',
  password_confirm: 'password123',
  first_name: 'Mobile',
  last_name: 'User',
  phone: '639123456789',
  role: 'customer'
};

// 2. Call direct registration endpoint
const response = await apiService.registerUser(userData);

// 3. Handle response and redirect to onboarding
if (response.success) {
  setShowOnboarding(true);
}
```

**Backend Processing:**
```python
# 1. Parse and validate request data
data = json.loads(request.body)
username = data.get('username', '').strip()
email = data.get('email', '').strip()
# ... other fields

# 2. Create user with automatic profile creation
user = User.objects.create_user(
    username=username,
    email=email,
    password=password,
    first_name=first_name,
    last_name=last_name,
    phone_number=phone,
    role=role,
    status='active'
)

# 3. Signal handler automatically creates Customer profile
# 4. Return success response
```

### 2. Profile Management Pattern

**Mobile App:**
```typescript
// Get user profile
const profile = await apiService.getUserProfile();

// Update profile
const updatedProfile = await apiService.updateProfile(profileData);
```

**Backend:**
```python
# Signal handler automatically creates profiles
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # All users get a Customer profile
        Customer.objects.create(
            user=instance,
            first_name=instance.first_name or '',
            last_name=instance.last_name or ''
        )
        
        # Create role-specific profiles
        if instance.role == User.UserRole.PHARMACY:
            Pharmacy.objects.create(user=instance)
        elif instance.role == User.UserRole.RIDER:
            Rider.objects.create(user=instance)
```

### 3. Authentication Pattern

**Mobile App:**
```typescript
// Login
const loginResponse = await apiService.loginUser(email, password);

// Store tokens for subsequent requests
if (loginResponse.success) {
  // Handle token storage and navigation
}
```

**Backend:**
```python
# JWT-based authentication
def jwt_login(request):
    # Authenticate user
    user = authenticate(username=username, password=password)
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    })
```

## Network Configuration

### 1. Django Server Configuration

**Settings (backend/pharmago/settings.py):**
```python
# Allow connections from mobile devices
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'testserver', '192.168.254.103']

# CORS configuration for mobile development
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allow all origins in development
CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

**Server Startup:**
```bash
# Start server on all interfaces for mobile access
python manage.py runserver 0.0.0.0:8000
```

### 2. Mobile App Network Configuration

**Environment Detection:**
```typescript
// Automatically detect environment and set appropriate base URL
const API_BASE_URL = getApiBaseUrl();

// Web development: http://localhost:8000/api/v1
// Mobile development: http://192.168.254.103:8000/api/v1
```

## Error Handling Patterns

### 1. Network Error Handling

```typescript
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    return {
      success: false,
      error: data.error || data.details || 'Request failed',
      message: data.message,
    };
  }
  
  return {
    success: true,
    data: data,
    message: data.message,
  };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Network error',
  };
}
```

### 2. Backend Error Handling

```python
try:
    # Database operations
    user = User.objects.create_user(...)
    
    return JsonResponse({
        'success': True,
        'message': 'User registered successfully',
        'user': UserSerializer(user).data
    })
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    return JsonResponse({
        'error': 'Registration failed',
        'message': f'Failed to create user account: {str(e)}'
    }, status=500)
```

## Development Workflow

### 1. Starting the Development Environment

```bash
# Terminal 1: Start Django backend
cd backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Start web frontend
cd web-frontend
npm start

# Terminal 3: Start mobile app
cd mobileapp
npm start
```

### 2. Testing Across Platforms

1. **Web Testing**: Access `http://localhost:3000`
2. **Mobile Testing**: Scan QR code with Expo Go app
3. **API Testing**: Use `http://192.168.254.103:8000/api/` for mobile, `http://localhost:8000/api/` for web

### 3. Database Access

- **Web App**: Direct API calls to Django backend
- **Mobile App**: API calls through Expo development server
- **Database**: PostgreSQL accessible via `localhost:5433`

## Troubleshooting Common Issues

### 1. Network Connection Issues

**Problem**: Mobile device can't connect to backend
**Solution**: 
- Ensure Django server runs on `0.0.0.0:8000`
- Add mobile device IP to `ALLOWED_HOSTS`
- Check firewall settings

### 2. CSRF Token Issues

**Problem**: Mobile app gets CSRF errors
**Solution**: Use direct endpoints with `@csrf_exempt` decorator

### 3. CORS Issues

**Problem**: Cross-origin requests blocked
**Solution**: Configure CORS settings in Django settings

### 4. JSON Parse Errors

**Problem**: Mobile app receives HTML instead of JSON
**Solution**: Check Django error handling and ensure proper JSON responses

## Best Practices

### 1. API Design

- Use consistent response formats
- Implement proper error handling
- Add comprehensive logging
- Use appropriate HTTP status codes

### 2. Mobile App Development

- Implement offline-first patterns where possible
- Use proper loading states
- Handle network errors gracefully
- Implement retry mechanisms

### 3. Database Operations

- Use transactions for multi-step operations
- Implement proper validation
- Use signals for automatic profile creation
- Handle duplicate key constraints

### 4. Security

- Validate all input data
- Use proper authentication
- Implement rate limiting
- Sanitize user inputs

## Future Enhancements

### 1. Real-time Features

- WebSocket integration for real-time updates
- Push notifications for mobile apps
- Live order tracking

### 2. Offline Support

- Implement offline data caching
- Sync mechanisms for offline changes
- Conflict resolution strategies

### 3. Performance Optimization

- API response caching
- Database query optimization
- Image optimization and CDN integration

## Conclusion

The hybrid development approach enables efficient development of both web and mobile applications while maintaining data consistency and code reusability. The patterns outlined in this document provide a solid foundation for building scalable, maintainable applications across multiple platforms.

For questions or issues related to mobile app database access patterns, refer to the troubleshooting section or consult the development team.
