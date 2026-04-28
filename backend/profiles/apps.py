from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "profiles"

    def ready(self) -> None:
        """Register app signal handlers."""
        from . import signals  # noqa: F401
