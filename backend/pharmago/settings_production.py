"""
Production settings for Railway deployment.
This file contains additional production-specific settings.
Import this at the end of settings.py for production environments.
"""

import os
import dj_database_url

# Get DEBUG status from environment
DEBUG_MODE = os.getenv('DEBUG', 'False').lower() == 'true'

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

# WhiteNoise for static files (middleware already added in settings.py)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Security settings for production
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

# In production, don't allow all origins
if not DEBUG_MODE:
    CORS_ALLOW_ALL_ORIGINS = False

# Email configuration for production
# Use Brevo API instead of SMTP (Railway-friendly)
# Brevo: 300 emails/day FREE, no domain verification needed
if not DEBUG_MODE and not os.getenv('EMAIL_CONSOLE', '0') == '1':
    if os.getenv('BREVO_API_KEY'):
        EMAIL_BACKEND = 'api.utils.brevo_backend.BrevoEmailBackend'
        # DEFAULT_FROM_EMAIL already set in settings.py
    else:
        # Fallback to console for testing
        EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
        import logging
        logging.warning("BREVO_API_KEY not set. Emails will print to console.")

# Cloudinary is configured in settings.py

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
