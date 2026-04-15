"""URL routes for mentorship app."""

from django.urls import path

from .views import (
    CancelSessionAPIView,
    CreateRequestAPIView,
    DeactivateMatchAPIView,
    MatchFeedbackListCreateAPIView,
    MentorPastSessionsListAPIView,
    MentorUpcomingSessionsListAPIView,
    MyMatchesListAPIView,
    MyPastSessionsListAPIView,
    MyRequestsListAPIView,
    MyUpcomingSessionsListAPIView,
    RescheduleSessionAPIView,
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
        "matches/<uuid:match_id>/deactivate/",
        DeactivateMatchAPIView.as_view(),
        name="mentorship-match-deactivate",
    ),
    path(
        "matches/<uuid:match_id>/feedback/",
        MatchFeedbackListCreateAPIView.as_view(),
        name="mentorship-match-feedback",
    ),
    path(
        "sessions/me/upcoming/",
        MyUpcomingSessionsListAPIView.as_view(),
        name="mentorship-upcoming-session-list",
    ),
    path(
        "sessions/me/past/",
        MyPastSessionsListAPIView.as_view(),
        name="mentorship-past-session-list",
    ),
    path(
        "sessions/mentor/upcoming/",
        MentorUpcomingSessionsListAPIView.as_view(),
        name="mentorship-mentor-upcoming-session-list",
    ),
    path(
        "sessions/mentor/past/",
        MentorPastSessionsListAPIView.as_view(),
        name="mentorship-mentor-past-session-list",
    ),
    path(
        "sessions/<uuid:match_id>/cancel/",
        CancelSessionAPIView.as_view(),
        name="mentorship-session-cancel",
    ),
    path(
        "sessions/<uuid:match_id>/reschedule/",
        RescheduleSessionAPIView.as_view(),
        name="mentorship-session-reschedule",
    ),
]
