from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.orders'
    verbose_name = 'Order Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.orders.signals
        except ImportError:
            pass
