"""Views for messaging API endpoints."""

from django.db.models import Q
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsRegularUser
from profiles.models import Profile

from .models import Conversation, Message, MessageReport
from .serializers import (
    ConversationSerializer,
    MessageCreateSerializer,
    MessageReportSerializer,
    MessageSerializer,
)


class ConversationListAPIView(APIView):
    """List all conversations for the authenticated user."""

    permission_classes = [IsRegularUser]

    @extend_schema(
        responses={
            200: ConversationSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="List all private conversations where the authenticated user is a participant.",
        tags=["Messages"],
    )
    def get(self, request: Request) -> Response:
        """Return conversations involving the current user's profile."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        conversations = Conversation.objects.filter(
            Q(match__mentor=profile) | Q(match__mentee=profile)
        ).select_related("match__mentor", "match__mentee")

        return Response(
            ConversationSerializer(conversations, many=True).data,
            status=status.HTTP_200_OK,
        )


class ConversationDetailAPIView(APIView):
    """List messages in a conversation with pagination."""

    permission_classes = [IsRegularUser]

    @extend_schema(
        responses={
            200: MessageSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Access denied."),
            404: OpenApiResponse(description="Conversation not found."),
        },
        description="List messages in a private conversation. Supports pagination via `page` and `pageSize` query params.",
        tags=["Messages"],
    )
    def get(self, request: Request, conversation_id: str) -> Response:
        """Return paginated messages for the conversation if user is a participant."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            conversation = Conversation.objects.select_related(
                "match__mentor", "match__mentee"
            ).get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if user is a participant
        if conversation.match.mentor != profile and conversation.match.mentee != profile:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        messages_qs = Message.objects.filter(conversation=conversation).select_related("sender")

        # Manual pagination
        page = max(int(request.query_params.get("page", 1)), 1)
        page_size = min(max(int(request.query_params.get("pageSize", 20)), 1), 50)
        offset = (page - 1) * page_size
        messages = messages_qs[offset : offset + page_size]

        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageCreateAPIView(APIView):
    """Send a message in a conversation."""

    permission_classes = [IsRegularUser]

    @extend_schema(
        request=MessageCreateSerializer,
        responses={
            201: MessageSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Access denied."),
            404: OpenApiResponse(description="Conversation not found."),
        },
        description="Send a new message in a private conversation.",
        tags=["Messages"],
    )
    def post(self, request: Request, conversation_id: str) -> Response:
        """Create a message if user is a participant."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            conversation = Conversation.objects.select_related(
                "match__mentor", "match__mentee"
            ).get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if user is a participant
        if conversation.match.mentor != profile and conversation.match.mentee != profile:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = MessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conversation,
            sender=profile,
            body=serializer.validated_data.get("body", ""),
            attachment=serializer.validated_data.get("attachment"),
        )

        response_serializer = MessageSerializer(message, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class MessageReportAPIView(APIView):
    """Report a problematic message."""

    permission_classes = [IsAdmin]

    @extend_schema(
        request=MessageReportSerializer,
        responses={
            201: OpenApiResponse(description="Report created."),
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Admin access required."),
            404: OpenApiResponse(description="Message not found."),
        },
        description="Report a problematic message for admin review.",
        tags=["Messages"],
    )
    def post(self, request: Request, message_id: str) -> Response:
        """Create a report for the message."""
        try:
            message = Message.objects.select_related(
                "conversation__match__mentor", "conversation__match__mentee"
            ).get(id=message_id)
        except Message.DoesNotExist:
            return Response({"detail": "Message not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = MessageReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check if reporter is a participant (optional, but good practice)
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if (
            message.conversation.match.mentor != profile
            and message.conversation.match.mentee != profile
        ):
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        MessageReport.objects.create(
            message=message,
            reported_by=profile,
            reason=serializer.validated_data["reason"],
        )

        return Response({"detail": "Report created."}, status=status.HTTP_201_CREATED)
