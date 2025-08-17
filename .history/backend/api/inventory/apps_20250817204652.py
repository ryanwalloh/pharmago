from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.inventory'
    verbose_name = 'Inventory Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.inventory.signals
        except ImportError:
            pass
