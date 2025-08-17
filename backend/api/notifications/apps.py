from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.notifications'
    verbose_name = 'Notification Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.notifications.signals
        except ImportError:
            pass
