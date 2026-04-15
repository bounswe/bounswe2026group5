from django.urls import path

from .views import MarkNotificationReadAPIView, NotificationListAPIView

urlpatterns = [
    path("", NotificationListAPIView.as_view(), name="notification-list"),
    path("<uuid:notification_id>/read/", MarkNotificationReadAPIView.as_view(), name="notification-mark-read"),
]