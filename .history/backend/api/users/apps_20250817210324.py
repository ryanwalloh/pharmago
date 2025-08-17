from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.users'
    verbose_name = 'Users Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.users.signals
        except ImportError:
            pass
