"""
Production settings for Railway deployment.
This file contains additional production-specific settings.
Import this at the end of settings.py for production environments.
"""

import os
import dj_database_url

# Database - Use Railway DATABASE_URL if available
if os.getenv('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.getenv('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

# Redis - Use Railway REDIS_URL if available
if os.getenv('REDIS_URL'):
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': os.getenv('REDIS_URL'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
    
    # Celery settings
    CELERY_BROKER_URL = os.getenv('REDIS_URL')
    CELERY_RESULT_BACKEND = os.getenv('REDIS_URL')
    
    # Channel Layers - Use Redis in production
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [os.getenv('REDIS_URL')],
            },
        },
    }

# WhiteNoise for static files
# Note: WhiteNoise middleware should be added to MIDDLEWARE in settings.py
# For now, we'll use WhiteNoise storage backend only
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Security settings for production
# Check DEBUG from environment variable instead of relying on settings.py
DEBUG_MODE = os.getenv('DEBUG', 'False').lower() == 'true'
if not DEBUG_MODE:
    # HTTPS/SSL settings
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    
    # HSTS settings
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Other security settings
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # Proxy settings for Railway
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Logging for Production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'level': 'INFO',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# CORS settings for production
# Add frontend Railway domain to allowed origins
FRONTEND_DOMAIN = os.getenv('FRONTEND_URL', '').replace('https://', '').replace('http://', '')
if FRONTEND_DOMAIN and os.getenv('FRONTEND_URL') not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(os.getenv('FRONTEND_URL'))

# Additional CORS origins from environment
if os.getenv('ADDITIONAL_CORS_ORIGINS'):
    additional_origins = os.getenv('ADDITIONAL_CORS_ORIGINS').split(',')
    CORS_ALLOWED_ORIGINS.extend(additional_origins)

# In production, don't allow all origins
if not DEBUG_MODE:
    CORS_ALLOW_ALL_ORIGINS = False

# Email configuration for production
if not DEBUG_MODE and not os.getenv('EMAIL_CONSOLE'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Cloudinary settings for production file uploads
if os.getenv('CLOUDINARY_CLOUD_NAME'):
    # Use Cloudinary for media files
    INSTALLED_APPS.append('cloudinary_storage')
    INSTALLED_APPS.append('cloudinary')
    
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
        'API_SECRET': os.getenv('CLOUDINARY_API_SECRET')
    }
    
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Sentry error tracking
if os.getenv('SENTRY_DSN'):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,  # Adjust based on traffic
        send_default_pii=False,
        environment=os.getenv('RAILWAY_ENVIRONMENT', 'production'),
    )

