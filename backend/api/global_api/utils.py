from django.conf import settings


def telemetry_writes_enabled() -> bool:
    """
    Return True when telemetry writes (API usage and system health)
    should be persisted to the database.
    """
    return not getattr(settings, "DISABLE_TELEMETRY_WRITES", False)

