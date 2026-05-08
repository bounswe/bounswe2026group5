from django.urls import path

from .views import (
    FCMTokenRegisterAPIView,
    MarkAllNotificationsReadAPIView,
    MarkNotificationReadAPIView,
    NotificationListAPIView,
)

urlpatterns = [
    path("", NotificationListAPIView.as_view(), name="notification-list"),
    path("fcm-token/", FCMTokenRegisterAPIView.as_view(), name="fcm-token-register"),
    path(
        "<uuid:notification_id>/read/",
        MarkNotificationReadAPIView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "mark-all-read/",
        MarkAllNotificationsReadAPIView.as_view(),
        name="notification-mark-all-read",
    ),
]
