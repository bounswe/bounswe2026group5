"""URL routes for workshops app."""

from django.urls import path

from .views import (
    WorkshopDetailAPIView,
    WorkshopGroupJoinAPIView,
    WorkshopJoinAPIView,
    WorkshopListCreateAPIView,
    WorkshopParticipationRespondAPIView,
)

urlpatterns = [
    path("", WorkshopListCreateAPIView.as_view(), name="workshop-list-create"),
    path("<uuid:workshop_id>/", WorkshopDetailAPIView.as_view(), name="workshop-detail"),
    path(
        "<uuid:workshop_id>/join/",
        WorkshopJoinAPIView.as_view(),
        name="workshop-join",
    ),
    path(
        "<uuid:workshop_id>/join-group/",
        WorkshopGroupJoinAPIView.as_view(),
        name="workshop-group-join",
    ),
    path(
        "<uuid:workshop_id>/participations/<uuid:participation_id>/respond/",
        WorkshopParticipationRespondAPIView.as_view(),
        name="workshop-participation-respond",
    ),
]
