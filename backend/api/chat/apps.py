from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api.chat'
    verbose_name = 'Chat Management'

    def ready(self):
        """Import signals when the app is ready."""
        try:
            import api.chat.signals
        except ImportError:
            pass
