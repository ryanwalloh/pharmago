# Mobile App User Session Management Guide

## Overview
This guide provides comprehensive documentation on how user sessions are managed in the PharmaGo mobile application, including authentication flow, session persistence, and current user data handling.

## Table of Contents
1. [Authentication Flow](#authentication-flow)
2. [Session Management](#session-management)
3. [Current User Data](#current-user-data)
4. [Implementation Details](#implementation-details)
5. [Testing and Debugging](#testing-and-debugging)

## Authentication Flow

### 1. Login Process
```typescript
// LoginPage.tsx - User login flow
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await apiService.loginUser(email, password);
    if (response.success && response.data) {
      // Store user data in context and AsyncStorage
      await login(response.data);
      // Redirect to main page
      router.replace('/main');
    }
  } catch (error) {
    // Handle login errors
  }
};
```

### 2. Session Restoration
```typescript
// AuthContext.tsx - App startup session check
useEffect(() => {
  const checkStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking stored user:', error);
    }
  };
  
  checkStoredUser();
}, []);
```

## Session Management

### AuthContext Implementation
**Location**: `mobileapp/apps/customer-app/contexts/AuthContext.tsx`

#### Key Functions:
- **`login(userData)`**: Stores user data and sets authentication state
- **`logout()`**: Clears user data and resets authentication state
- **`checkStoredUser()`**: Restores session from AsyncStorage on app startup

#### State Variables:
- **`user`**: Current user data object
- **`isLoggedIn`**: Boolean authentication status
- **`loading`**: Loading state for authentication operations

### AsyncStorage Integration
```typescript
// User data persistence
const login = async (userData: User) => {
  try {
    // Store in AsyncStorage for persistence
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    // Update context state
    setUser(userData);
    setIsLoggedIn(true);
  } catch (error) {
    console.error('Error storing user data:', error);
  }
};

const logout = async () => {
  try {
    // Clear AsyncStorage
    await AsyncStorage.removeItem('user');
    
    // Reset context state
    setUser(null);
    setIsLoggedIn(false);
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};
```

## Current User Data

### User Data Structure
```typescript
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  // Additional fields from backend
}
```

### Accessing Current User
```typescript
// In any component
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isLoggedIn } = useAuth();
  
  if (isLoggedIn && user) {
    console.log('Current user:', user);
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
  }
  
  return (
    // Component JSX
  );
};
```

### User Data Logging (MainPage.tsx)
```typescript
// MainPage.tsx - Current user details logging
useEffect(() => {
  if (user) {
    console.log('👤 Current logged-in user details:');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', `${user.first_name} ${user.last_name}`);
    console.log('Full user object:', user);
  }
}, [user]);
```

## Implementation Details

### 1. Context Provider Setup
```typescript
// App root level
<AuthProvider>
  <YourAppComponents />
</AuthProvider>
```

### 2. Protected Routes
```typescript
// Route protection example
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  
  if (!isLoggedIn) {
    return <LoginPage />;
  }
  
  return children;
};
```

### 3. Backend Connectivity Testing
```typescript
// MainPage.tsx - Backend connection test
const testBackendConnection = async () => {
  try {
    const response = await apiService.testConnection();
    console.log('✅ Backend connection test result:', response);
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
  }
};
```

## Testing and Debugging

### Console Logging
The app includes comprehensive logging for user session management:

```typescript
// Login success
console.log('✅ User logged in successfully:', userData);

// Session restoration
console.log('🔄 Restoring user session from storage');

// Logout
console.log('👋 User logged out successfully');

// Backend connectivity
console.log('🔗 Backend connection test result:', response);
```

### Debug Information
- **User Details**: Full user object logged on main page
- **Session State**: Authentication status tracked
- **Backend Status**: Connection test results logged
- **Storage Operations**: AsyncStorage operations logged

### Common Debug Scenarios

#### 1. User Not Persisting
```typescript
// Check AsyncStorage
const checkStorage = async () => {
  const stored = await AsyncStorage.getItem('user');
  console.log('Stored user data:', stored);
};
```

#### 2. Authentication State Issues
```typescript
// Monitor auth state changes
useEffect(() => {
  console.log('Auth state changed:', { user, isLoggedIn });
}, [user, isLoggedIn]);
```

#### 3. Backend Connection Issues
```typescript
// Test API endpoints
const testAPI = async () => {
  try {
    const response = await fetch('http://your-backend-url/api/v1/users/register/');
    console.log('API Response:', response);
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

## Security Considerations

### 1. Token Management
- Store authentication tokens securely
- Implement token refresh mechanism
- Clear tokens on logout

### 2. Data Validation
- Validate user data from backend
- Sanitize user input
- Handle malformed data gracefully

### 3. Session Security
- Implement session timeout
- Clear sensitive data on app background
- Use secure storage for sensitive information

## Best Practices

### 1. Session Handling
- Always check authentication state before protected operations
- Implement proper error handling for authentication failures
- Provide user feedback for authentication operations

### 2. Data Management
- Use TypeScript interfaces for user data
- Implement proper null checks
- Handle edge cases (network failures, corrupted data)

### 3. Performance
- Minimize AsyncStorage operations
- Implement proper loading states
- Cache user data appropriately

## Troubleshooting

### Common Issues

#### 1. User Data Not Loading
- Check AsyncStorage permissions
- Verify JSON parsing
- Check for corrupted stored data

#### 2. Authentication State Inconsistency
- Verify context provider setup
- Check for multiple context instances
- Ensure proper state updates

#### 3. Backend Connection Failures
- Verify API endpoints
- Check network connectivity
- Validate request/response formats

### Debug Commands
```typescript
// Clear all stored data
await AsyncStorage.clear();

// Check stored keys
const keys = await AsyncStorage.getAllKeys();
console.log('Stored keys:', keys);

// Get specific data
const userData = await AsyncStorage.getItem('user');
console.log('User data:', userData);
```

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: Development Team
