from django.apps import AppConfig


class DeliveryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.delivery'
    verbose_name = 'Delivery Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.delivery.signals
        except ImportError:
            pass
