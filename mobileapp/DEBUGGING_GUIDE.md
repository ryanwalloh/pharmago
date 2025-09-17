# Mobile App Debugging Guide

## 🔍 How to Debug the Mobile App

### 1. **Open Developer Tools**

#### For React Native (Expo):
1. Open your terminal where the mobile app is running
2. Press `j` to open the debugger
3. Or press `m` to open the developer menu
4. Select "Debug Remote JS" to open Chrome DevTools

#### For Web (if running on web):
1. Right-click in the browser
2. Select "Inspect" or "Developer Tools"
3. Go to the "Console" tab

### 2. **What You'll See in the Console**

When you open the Create Account page, you'll see:

```
📱 CreateAccountPage mounted
🔧 API Configuration: { baseURL: "http://localhost:8000/api/v1", timestamp: "..." }
📋 Available API methods: { registerUser: "POST /users/register/", ... }
```

### 3. **Test Backend Connection**

1. Click the **"Test Backend Connection"** button (blue button)
2. Watch the console for:

```
🧪 Testing backend connection...
🔍 Testing connection to backend...
📍 Backend URL: http://localhost:8000/api/v1
🔗 Connection test response: { status: 405, statusText: "Method Not Allowed", ... }
✅ Backend connection successful!
```

**Expected Results:**
- ✅ **Status 405**: Backend is reachable (Method Not Allowed is expected for GET request)
- ❌ **Network Error**: Backend is not running or not accessible
- ❌ **Status 500**: Backend is running but has internal errors

### 4. **Debug Registration Process**

When you fill out the form and click "Sign Up", you'll see:

```
🎯 Starting user registration process...
✅ Form validation passed
📝 Prepared user data for registration: { userData: {...}, timestamp: "..." }
🌐 Calling API service to register user...
🚀 API Request: { url: "http://localhost:8000/api/v1/users/register/", method: "POST", ... }
📡 API Response Status: { status: 201, statusText: "Created", ok: true, ... }
📄 API Response Data: { data: {...}, timestamp: "..." }
✅ API Request Successful: { success: true, message: "User registered successfully", ... }
🎉 Registration successful!
🏁 Registration process completed
```

### 5. **Common Issues & Solutions**

#### ❌ **"CORS policy" Error**
```
Access to fetch at 'http://localhost:8000/api/v1/users/register/' from origin 'http://localhost:8081' has been blocked by CORS policy
```
**Solution**: 
- Backend CORS settings need to include `http://localhost:8081`
- Restart the Django backend after CORS changes
- Check `backend/pharmago/settings.py` for `CORS_ALLOWED_ORIGINS`

#### ❌ **"Network error"**
- Check if backend is running: `docker-compose -f docker-compose.services.yml ps`
- Check if backend is accessible: `curl http://localhost:8000/api/v1/users/register/`

#### ❌ **"500 Internal Server Error"**
- Backend is running but has database/configuration issues
- Check backend logs: `docker logs pharmago_backend`

#### ❌ **"Connection refused"**
- Backend is not running on port 8000
- Start backend locally or check if it's running

### 6. **Log Levels**

The app uses emoji prefixes for easy filtering:
- 🚀 **API Request**: Outgoing requests
- 📡 **API Response**: Response status
- 📄 **API Response Data**: Response body
- ✅ **Success**: Successful operations
- ❌ **Error**: Failed operations
- 💥 **Exception**: Caught errors
- 🧪 **Test**: Connection tests
- 📱 **Component**: Component lifecycle
- 🔧 **Config**: Configuration info

### 7. **Filtering Logs**

In Chrome DevTools Console:
- Type `🚀` to see only API requests
- Type `❌` to see only errors
- Type `✅` to see only successes

### 8. **Network Tab**

In Chrome DevTools:
1. Go to "Network" tab
2. Try registration
3. Look for requests to `localhost:8000`
4. Check request/response details

## 🎯 Quick Debug Checklist

- [ ] Backend running locally on port 8000?
- [ ] PostgreSQL running in Docker on port 5433?
- [ ] Mobile app shows "CreateAccountPage mounted" in console?
- [ ] "Test Backend Connection" button works?
- [ ] Registration shows detailed logs in console?

## 📞 Need Help?

If you see unexpected logs or errors, share:
1. The console output (copy/paste)
2. The network requests (from Network tab)
3. Backend status (`docker-compose -f docker-compose.services.yml ps`)
