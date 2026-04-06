"""URL routes for mentorship app."""

from django.urls import path

from .views import (
    CreateRequestAPIView,
    MyMatchesListAPIView,
    MyRequestsListAPIView,
    MyUpcomingSessionsListAPIView,
    RespondToRequestAPIView,
)

urlpatterns = [
    path("requests/me/", MyRequestsListAPIView.as_view(), name="mentorship-request-list"),
    path("requests/", CreateRequestAPIView.as_view(), name="mentorship-request-create"),
    path(
        "requests/<uuid:request_id>/respond/",
        RespondToRequestAPIView.as_view(),
        name="mentorship-request-respond",
    ),
    path("matches/me/", MyMatchesListAPIView.as_view(), name="mentorship-match-list"),
    path(
        "sessions/me/upcoming/",
        MyUpcomingSessionsListAPIView.as_view(),
        name="mentorship-upcoming-session-list",
    ),
]
