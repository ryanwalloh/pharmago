from django.apps import AppConfig


class GlobalApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.global_api'
    verbose_name = 'Global API Infrastructure'

    def ready(self):
        """Import signals and perform app initialization"""
        try:
            import api.global_api.signals
        except ImportError:
            pass
