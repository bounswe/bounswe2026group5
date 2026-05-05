from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsUser

from .models import Notification
from .serializers import FCMTokenSerializer, NotificationSerializer


class FCMTokenRegisterAPIView(APIView):
    """Register or update an FCM token for the authenticated user."""

    permission_classes = [IsUser]

    @extend_schema(
        request=FCMTokenSerializer,
        responses={
            201: OpenApiResponse(description="Token registered successfully."),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="Register or update an FCM token for the current user.",
        tags=["Notifications"],
    )
    def post(self, request: Request) -> Response:
        """Register the FCM token."""
        serializer = FCMTokenSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(
            {"detail": "Token registered successfully."},
            status=status.HTTP_201_CREATED,
        )


class NotificationListAPIView(APIView):
    """List recent notifications for the authenticated user."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: NotificationSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="""List recent notifications for the authenticated user.
Unread notifications are returned first, followed by read notifications,
with newest items first inside each group. The response is capped to the
configured notifications history limit.

**Notification Types:**
* `new_mentorship_request`: User received a mentorship request.
* `mentorship_request_rejected`: Mentorship request sent by user was rejected.
* `new_match`: Mentorship request sent by user was accepted (new match created).
* `slot_booked`: A mentee booked an availability slot.
* `session_canceled`: A session was canceled.
* `session_rescheduled`: A session was rescheduled.
* `match_deactivated`: A mentorship match was deactivated.
* `new_message`: User received a private message.
* `new_feedback_available`: User received new feedback.
""",
        tags=["Notifications"],
    )
    def get(self, request: Request) -> Response:
        """Return recent notifications for the current user."""
        notifications = Notification.objects.filter(user=request.user).order_by(
            "is_read",
            "-created_at",
        )[: settings.NOTIFICATIONS_HISTORY_LIMIT]

        return Response(
            NotificationSerializer(notifications, many=True).data,
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadAPIView(APIView):
    """Mark a specific notification as read."""

    permission_classes = [IsUser]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(description="Notification marked as read."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Not the owner of the notification."),
            404: OpenApiResponse(description="Notification not found."),
        },
        description="Mark the specified notification as read. Only the owner can mark it.",
        tags=["Notifications"],
    )
    def put(self, request: Request, notification_id: str) -> Response:
        """Mark the notification as read if owned by the user."""
        try:
            notification = Notification.objects.get(id=notification_id, user=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response(
            {"detail": "Notification marked as read."},
            status=status.HTTP_200_OK,
        )
