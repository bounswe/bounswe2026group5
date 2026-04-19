"""App configuration for messaging app."""

from django.apps import AppConfig


class MessagingConfig(AppConfig):
    """Messaging app configuration."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "messaging"

    def ready(self) -> None:
        """Register app signal handlers."""
        from . import signals  # noqa: F401
