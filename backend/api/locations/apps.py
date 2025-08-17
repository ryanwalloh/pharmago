from django.apps import AppConfig


class LocationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.locations'
    verbose_name = 'Location Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.locations.signals
        except ImportError:
            pass
