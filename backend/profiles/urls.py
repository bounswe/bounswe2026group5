"""URL routes for profiles app."""

from django.urls import path

from .views import (
    AvailabilitySlotBookAPIView,
    AvailabilitySlotCancelBookingAPIView,
    AvailabilitySlotDetailAPIView,
    AvailabilitySlotListCreateAPIView,
    MentorPublicRatingAPIView,
    MyAvailabilitySlotDetailAPIView,
    MyAvailabilitySlotListCreateAPIView,
    PopularMentorsListAPIView,
    ProfileByUsernameAPIView,
    ProfileMeAPIView,
    PublicMentorProfilesSearchListAPIView,
    RecentlyAddedMentorsListAPIView,
    SkillListAPIView,
)

urlpatterns = [
    path("", PublicMentorProfilesSearchListAPIView.as_view(), name="mentor-profiles-search"),
    path("me/", ProfileMeAPIView.as_view(), name="profile-me"),
    path(
        "me/availability-slots/",
        MyAvailabilitySlotListCreateAPIView.as_view(),
        name="availability-slot-me-list-create",
    ),
    path(
        "me/availability-slots/<uuid:slot_id>/",
        MyAvailabilitySlotDetailAPIView.as_view(),
        name="availability-slot-me-detail",
    ),
    path("skills/", SkillListAPIView.as_view(), name="skill-list"),
    path(
        "recently-added/",
        RecentlyAddedMentorsListAPIView.as_view(),
        name="mentor-recently-added",
    ),
    path("popular/", PopularMentorsListAPIView.as_view(), name="mentor-popular"),
    path(
        "<str:username>/availability-slots/",
        AvailabilitySlotListCreateAPIView.as_view(),
        name="availability-slot-list-create",
    ),
    path(
        "<str:username>/availability-slots/<uuid:slot_id>/",
        AvailabilitySlotDetailAPIView.as_view(),
        name="availability-slot-detail",
    ),
    path(
        "<str:username>/availability-slots/<uuid:slot_id>/book/",
        AvailabilitySlotBookAPIView.as_view(),
        name="availability-slot-book",
    ),
    path(
        "<str:username>/availability-slots/<uuid:slot_id>/cancel-booking/",
        AvailabilitySlotCancelBookingAPIView.as_view(),
        name="availability-slot-cancel-booking",
    ),
    path(
        "<str:username>/rating/",
        MentorPublicRatingAPIView.as_view(),
        name="mentor-public-rating",
    ),
    path("<str:username>/", ProfileByUsernameAPIView.as_view(), name="profile-by-username"),
]
