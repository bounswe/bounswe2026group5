"""App configuration for timeline app."""

from django.apps import AppConfig


class TimelineConfig(AppConfig):
    """Timeline app configuration."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "timeline"

    def ready(self) -> None:
        """Register app signal handlers."""
        from . import signals  # noqa: F401
