# Middleware Integration Guide

This guide shows you how to use the custom middleware that has been added to your Django project.

## What We've Added

docker-compose up backend

http://localhost:8000/api/health/
http://localhost:8000/api/middleware-test/
### 1. APILoggingMiddleware
- Logs all API requests and responses with timing information
- Captures request details (method, path, user, IP, body)
- Captures response details (status code, duration, content preview)
- Handles exceptions and logs them with context

### 2. SimpleResponseMiddleware
- Adds custom headers to all responses
- Demonstrates middleware chaining
- Adds timestamps and request information to headers

## How to Test

### Option 1: Using the Test Script (Recommended)
1. Make sure your Django server is running
2. Run the test script:
   ```bash
   cd backend
   python test_middleware.py
   ```

### Option 2: Manual Testing with curl
```bash
# Test GET request
curl -v http://localhost:8000/api/middleware-test/

# Test POST request
curl -v -X POST http://localhost:8000/api/middleware-test/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello middleware!"}'

# Test health check
curl -v http://localhost:8000/api/health/

# Test exception handling
curl -v -X POST http://localhost:8000/api/test-exception/ \
  -H "Content-Type: application/json" \
  -d '{"raise_error": true}'
```

### Option 3: Using a Web Browser
- Navigate to `http://localhost:8000/api/health/`
- Check the Network tab in Developer Tools to see the custom headers

## What You'll See

### In the Response Headers:
- `X-Middleware-Test`: Confirms middleware processed the request
- `X-Request-Path`: Shows the request path
- `X-Request-Method`: Shows the HTTP method
- `X-Processed-At`: Timestamp when middleware processed the request

### In Django Console/Logs:
- Detailed request logging with timing
- Response logging with performance metrics
- Exception logging with context

## Middleware Order
The middleware is configured in this order:
1. CORS middleware
2. Security middleware
3. Session middleware
4. Common middleware
5. CSRF middleware
6. Authentication middleware
7. Message middleware
8. Clickjacking middleware
9. **APILoggingMiddleware** (our custom middleware)
10. **SimpleResponseMiddleware** (our custom middleware)

## Customization

### Adding More Middleware
To add more middleware, simply:
1. Create new middleware classes in `api/middleware.py`
2. Add them to the `MIDDLEWARE` list in `settings.py`

### Modifying Existing Middleware
Edit the middleware classes in `api/middleware.py`:
- `APILoggingMiddleware`: Modify logging behavior
- `SimpleResponseMiddleware`: Change or add custom headers

## Common Use Cases

### Logging and Monitoring
- API performance tracking
- Request/response auditing
- Error monitoring

### Security
- Request validation
- Rate limiting
- IP filtering

### Business Logic
- User tracking
- Analytics
- Custom authentication

## Troubleshooting

### Middleware Not Working?
1. Check that middleware is added to `MIDDLEWARE` list in `settings.py`
2. Restart your Django server
3. Check for syntax errors in `middleware.py`

### No Logs Appearing?
1. Ensure Django logging is configured properly
2. Check console output for errors
3. Verify middleware order in settings

### Headers Not Showing?
1. Check browser Developer Tools Network tab
2. Use `curl -v` to see all headers
3. Verify middleware is in the correct order

## Next Steps

This is a basic middleware setup. You can extend it by:
- Adding database logging
- Implementing rate limiting
- Adding authentication middleware
- Creating custom error handling
- Adding performance monitoring

The middleware is now ready to use and test!
