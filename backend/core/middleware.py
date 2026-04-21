"""Custom middleware for the core project."""

from typing import Any, Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.utils import timezone


class TimezoneMiddleware:
    """
    Middleware to ensure the project's configured timezone is active for every request.
    This ensures that timezone.localtime() and other localized operations
    consistently use settings.TIME_ZONE (e.g., Europe/Istanbul).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        timezone.activate(timezone.get_default_timezone())
        return self.get_response(request)
