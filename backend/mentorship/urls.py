"""URL routes for mentorship app."""

from django.urls import path

from .views import (
    CancelSessionAPIView,
    CreateRequestAPIView,
    DeactivateMatchAPIView,
    MatchJourneyAPIView,
    MatchFeedbackListCreateAPIView,
    MyMatchesListAPIView,
    MyMeetingSessionsListAPIView,
    MyRequestsListAPIView,
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
        "meeting-sessions/me/",
        MyMeetingSessionsListAPIView.as_view(),
        name="mentorship-meeting-session-list",
    ),
    path(
        "matches/<uuid:match_id>/deactivate/",
        DeactivateMatchAPIView.as_view(),
        name="mentorship-match-deactivate",
    ),
    path(
        "matches/<uuid:match_id>/journey/",
        MatchJourneyAPIView.as_view(),
        name="mentorship-match-journey",
    ),
    path(
        "matches/<uuid:match_id>/feedback/",
        MatchFeedbackListCreateAPIView.as_view(),
        name="mentorship-match-feedback",
    ),

    path(
        "sessions/<uuid:session_id>/cancel/",
        CancelSessionAPIView.as_view(),
        name="mentorship-session-cancel",
    ),
    path(
        "sessions/<uuid:session_id>/reschedule/",
        RescheduleSessionAPIView.as_view(),
        name="mentorship-session-reschedule",
    ),
]
