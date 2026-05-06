"""URL routes for workshops app."""

from django.urls import path

from .views import WorkshopDetailAPIView, WorkshopListCreateAPIView

urlpatterns = [
    path("", WorkshopListCreateAPIView.as_view(), name="workshop-list-create"),
    path("<uuid:workshop_id>/", WorkshopDetailAPIView.as_view(), name="workshop-detail"),
]
