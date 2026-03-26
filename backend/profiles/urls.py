"""URL routes for profiles app."""

from django.urls import path

from .views import ProfileByUsernameAPIView

urlpatterns = [
    path("<str:username>/", ProfileByUsernameAPIView.as_view(), name="profile-by-username"),
]
