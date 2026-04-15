from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsUser

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListAPIView(APIView):
    """List unread notifications for the authenticated user."""

    permission_classes = [IsUser]

    @extend_schema(
        responses={
            200: NotificationSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="List all unread notifications for the authenticated user, ordered by most recent first.",
        tags=["Notifications"],
    )
    def get(self, request: Request) -> Response:
        """Return unread notifications for the current user."""
        notifications = Notification.objects.filter(
            user=request.user, is_read=False
        ).order_by("-created_at")

        return Response(
            NotificationSerializer(notifications, many=True).data,
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadAPIView(APIView):
    """Mark a specific notification as read."""

    permission_classes = [IsUser]

    @extend_schema(
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
