"""URL routes for profiles app."""

from django.urls import path

from .views import (
    AvailabilitySlotBookAPIView,
    AvailabilitySlotCancelBookingAPIView,
    AvailabilitySlotDetailAPIView,
    AvailabilitySlotListCreateAPIView,
    PopularMentorsListAPIView,
    PublicMentorProfilesSearchListAPIView,
    ProfileByUsernameAPIView,
    RecentlyAddedMentorsListAPIView,
    SkillListAPIView,
)

urlpatterns = [
    path("", PublicMentorProfilesSearchListAPIView.as_view(), name="mentor-profiles-search"),
    path("skills/", SkillListAPIView.as_view(), name="skill-list"),
    path("recently-added/", RecentlyAddedMentorsListAPIView.as_view(), name="mentor-recently-added"),
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
    path("<str:username>/", ProfileByUsernameAPIView.as_view(), name="profile-by-username"),
]
