import time
import json
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from .models import ApiUsage


class ApiUsageTrackingMiddleware(MiddlewareMixin):
    """Middleware to automatically track API usage for all requests"""
    
    def process_request(self, request):
        """Record request start time"""
        request.start_time = time.time()
        
        # Get request size
        request.request_size = 0
        if request.body:
            request.request_size = len(request.body)
        
        return None
    
    def process_response(self, request, response):
        """Record API usage after response is generated"""
        try:
            # Calculate response time
            if hasattr(request, 'start_time'):
                response_time = (time.time() - request.start_time) * 1000  # Convert to milliseconds
            else:
                response_time = 0
            
            # Get response size
            response_size = 0
            if hasattr(response, 'content'):
                response_size = len(response.content)
            
            # Get user (handle both authenticated and anonymous users)
            user = None
            if hasattr(request, 'user') and not isinstance(request.user, AnonymousUser):
                user = request.user
            
            # Get IP address
            ip_address = self.get_client_ip(request)
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Create API usage record
            ApiUsage.objects.create(
                user=user,
                endpoint=request.path,
                method=request.method,
                status_code=response.status_code,
                response_time=response_time,
                user_agent=user_agent,
                ip_address=ip_address,
                request_size=getattr(request, 'request_size', 0),
                response_size=response_size
            )
            
        except Exception as e:
            # Log error but don't fail the request
            # In production, you might want to use proper logging here
            pass
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SystemHealthMiddleware(MiddlewareMixin):
    """Middleware to perform periodic system health checks"""
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.last_health_check = 0
        self.health_check_interval = 300  # Check every 5 minutes
    
    def process_request(self, request):
        """Perform periodic system health checks"""
        current_time = time.time()
        
        # Only perform health checks periodically
        if current_time - self.last_health_check > self.health_check_interval:
            try:
                from .signals import perform_system_health_checks
                perform_system_health_checks()
                self.last_health_check = current_time
            except Exception:
                # Don't fail requests if health checks fail
                pass
        
        return None
