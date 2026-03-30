"""URL routes for profiles app."""

from django.urls import path

from .views import (
    AvailabilitySlotBookAPIView,
    AvailabilitySlotCancelBookingAPIView,
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
