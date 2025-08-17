from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'Pharmago API'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.signals
        except ImportError:
            pass
