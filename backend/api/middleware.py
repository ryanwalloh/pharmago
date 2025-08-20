import time
import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

# Set up logging
logger = logging.getLogger(__name__)

class APILoggingMiddleware(MiddlewareMixin):
    """
    Simple middleware to log API requests and responses with timing information.
    This is perfect for testing middleware integration quickly.
    """
    
    def process_request(self, request):
        """Log the incoming request and start timing."""
        request.start_time = time.time()
        
        # Log request details
        log_data = {
            'method': request.method,
            'path': request.path,
            'user': str(request.user),
            'ip': self._get_client_ip(request),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        }
        
        # Log request body for POST/PUT requests
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if hasattr(request, 'body') and request.body:
                    body = request.body.decode('utf-8')
                    if body:
                        log_data['body'] = body[:500] + '...' if len(body) > 500 else body
            except Exception as e:
                log_data['body_error'] = str(e)
        
        logger.info(f"API Request: {json.dumps(log_data, indent=2)}")
        return None
    
    def process_response(self, request, response):
        """Log the response and calculate timing."""
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            # Log response details
            log_data = {
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2),
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            }
            
            # Add response content for JSON responses
            if hasattr(response, 'content') and response.content:
                try:
                    content = response.content.decode('utf-8')
                    if content and response.get('content-type', '').startswith('application/json'):
                        # Truncate long responses
                        log_data['response_preview'] = content[:200] + '...' if len(content) > 200 else content
                except Exception as e:
                    log_data['response_error'] = str(e)
            
            logger.info(f"API Response: {json.dumps(log_data, indent=2)}")
        
        return response
    
    def process_exception(self, request, exception):
        """Log any exceptions that occur during request processing."""
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            
            log_data = {
                'method': request.method,
                'path': request.path,
                'exception': str(exception),
                'exception_type': type(exception).__name__,
                'duration_ms': round(duration * 1000, 2),
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            }
            
            logger.error(f"API Exception: {json.dumps(log_data, indent=2)}")
        
        return None
    
    def _get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SimpleResponseMiddleware(MiddlewareMixin):
    """
    Another simple middleware that adds custom headers to responses.
    Great for testing middleware chaining.
    """
    
    def process_response(self, request, response):
        """Add custom headers to all responses."""
        response['X-Middleware-Test'] = 'This response was processed by middleware!'
        response['X-Request-Path'] = request.path
        response['X-Request-Method'] = request.method
        
        # Add a custom header with timestamp
        import datetime
        response['X-Processed-At'] = datetime.datetime.now().isoformat()
        
        return response
