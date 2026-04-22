"""Timezone utility functions for consistent localized datetime handling."""

import zoneinfo
from datetime import datetime
from typing import Any

from django.conf import settings
from django.utils import timezone


def get_project_timezone() -> zoneinfo.ZoneInfo:
    """Return the ZoneInfo object for the configured project timezone."""
    return zoneinfo.ZoneInfo(settings.TIME_ZONE)


def to_local_time(dt: datetime | None) -> datetime | None:
    """
    Convert a datetime to the project's local timezone.
    If dt is naive, it's assumed to be in the project's default timezone first.
    """
    if dt is None:
        return None

    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_default_timezone())

    return timezone.localtime(dt, get_project_timezone())


def format_local_datetime(dt: datetime | None, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Convert to local time and format as string."""
    local_dt = to_local_time(dt)
    if local_dt is None:
        return ""
    return local_dt.strftime(fmt)
