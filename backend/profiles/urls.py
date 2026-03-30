"""URL routes for profiles app."""

from django.urls import path

from .views import (
    AvailabilitySlotDetailAPIView,
    AvailabilitySlotListCreateAPIView,
    ProfileByUsernameAPIView,
)

urlpatterns = [
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
    path("<str:username>/", ProfileByUsernameAPIView.as_view(), name="profile-by-username"),
]
