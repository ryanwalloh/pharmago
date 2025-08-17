from django.apps import AppConfig


class PharmaciesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.pharmacies'
    verbose_name = 'Pharmacy Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.pharmacies.signals
        except ImportError:
            pass
