"""Views for messaging API endpoints."""

from django.db.models import Q
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Report
from accounts.permissions import IsRegularUser, IsUser
from accounts.serializers import ReportCreateSerializer
from notifications.models import Notification, NotificationType
from profiles.models import Profile

from .firebase import update_message_read_status_in_firestore
from .models import Conversation, Message, ReadReceipt
from .serializers import ConversationSerializer, MessageCreateSerializer, MessageSerializer

PROFILE_NOT_FOUND_MSG = "Profile not found."
ACCESS_DENIED_MSG = "Access denied."
CONVERSATION_NOT_FOUND_MSG = "Conversation not found."


class ConversationListAPIView(APIView):
    """List all conversations for the authenticated user."""

    permission_classes = [IsRegularUser]

    @extend_schema(
        responses={
            200: ConversationSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
        },
        description="List all private conversations where the authenticated user is a participant.",
        operation_id="messages_conversations_list",
        tags=["Messages"],
    )
    def get(self, request: Request) -> Response:
        """Return conversations involving the current user's profile."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        conversations = (
            Conversation.objects.filter(Q(match__mentor=profile) | Q(match__mentee=profile))
            .select_related("match__mentor", "match__mentee")
            .order_by("-updated_at")
        )

        return Response(
            ConversationSerializer(conversations, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class ConversationDetailAPIView(APIView):
    """List messages in a conversation with pagination, and send messages."""

    permission_classes = [IsRegularUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        responses={
            200: MessageSerializer(many=True),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Access denied."),
            404: OpenApiResponse(description=CONVERSATION_NOT_FOUND_MSG),
        },
        description=(
            "List messages in a private conversation."
            "Supports pagination via `page` and `pageSize` query params."
        ),
        tags=["Messages"],
        operation_id="messages_conversation_messages_list",
    )
    def get(self, request: Request, conversation_id: str) -> Response:
        """Return paginated messages for the conversation if user is a participant."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": PROFILE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        try:
            conversation = Conversation.objects.select_related(
                "match__mentor", "match__mentee"
            ).get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": CONVERSATION_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is a participant
        if conversation.match.mentor != profile and conversation.match.mentee != profile:
            return Response({"detail": ACCESS_DENIED_MSG}, status=status.HTTP_403_FORBIDDEN)

        messages_qs = (
            Message.objects.filter(conversation=conversation)
            .select_related("sender")
            .order_by("-created_at")
        )

        # Manual pagination
        page = max(int(request.query_params.get("page", 1)), 1)
        page_size = min(max(int(request.query_params.get("pageSize", 20)), 1), 50)
        offset = (page - 1) * page_size
        messages = messages_qs[offset : offset + page_size]

        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "body": {"type": "string"},
                    "attachment": {"type": "string", "format": "binary"},
                },
            }
        },
        responses={
            201: MessageSerializer,
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Access denied."),
            404: OpenApiResponse(description=CONVERSATION_NOT_FOUND_MSG),
        },
        description=(
            "Send a new message in a private conversation. "
            "Supports text, file attachments, or both."
        ),
        tags=["Messages"],
    )
    def post(self, request: Request, conversation_id: str) -> Response:
        """Create a message if user is a participant."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": PROFILE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        try:
            conversation = Conversation.objects.select_related(
                "match__mentor", "match__mentee"
            ).get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": CONVERSATION_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is a participant
        if conversation.match.mentor != profile and conversation.match.mentee != profile:
            return Response({"detail": ACCESS_DENIED_MSG}, status=status.HTTP_403_FORBIDDEN)

        if not conversation.match.is_active:
            return Response({"error": "Cannot send messages to deactivated matches."}, status=403)

        serializer = MessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Help type-checker
        validated_data = getattr(serializer, "validated_data", {})

        attachment = validated_data.get("attachment")
        message = Message.objects.create(
            conversation=conversation,
            sender=profile,
            body=validated_data.get("body", ""),
            attachment=attachment,
            original_filename=attachment.name if attachment else None,
        )

        other_profile = (
            conversation.match.mentor
            if profile == conversation.match.mentee
            else conversation.match.mentee
        )
        Notification.objects.create(
            user=other_profile.user,
            type=NotificationType.NEW_MESSAGE,
            title="New Message",
            actor=profile,
            resource_type="conversation",
            resource_id=conversation.id,
            message=f"You have received a new message from {profile.display_name}.",
        )

        response_serializer = MessageSerializer(message, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class MessageReportAPIView(APIView):
    """Report a problematic message using the global reporting system."""

    permission_classes = [IsUser]

    @extend_schema(
        request=ReportCreateSerializer,
        responses={
            201: OpenApiResponse(description="Report created."),
            400: OpenApiResponse(description="Validation error."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Access denied."),
            404: OpenApiResponse(description="Message not found."),
        },
        description="Report a problematic message for admin review via the global Report system.",
        tags=["Messages"],
    )
    def post(self, request: Request, message_id: str) -> Response:
        """Create a report for the message."""
        try:
            message = Message.objects.select_related(
                "sender__user", "conversation__match__mentor", "conversation__match__mentee"
            ).get(id=message_id)
        except Message.DoesNotExist:
            return Response({"detail": "Message not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if reporter is a participant or admin
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": PROFILE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        is_admin = getattr(request.user, "role", None) == "ADMIN"
        if (
            not is_admin
            and message.conversation.match.mentor != profile
            and message.conversation.match.mentee != profile
        ):
            return Response({"detail": ACCESS_DENIED_MSG}, status=status.HTTP_403_FORBIDDEN)

        # We inject the message and its sender into the request data if not provided,
        # or we just use them directly to create the report.
        data = request.data.copy()
        data["related_message_id"] = message_id
        data["reported_user_id"] = str(message.sender.user_id)

        serializer = ReportCreateSerializer(
            data=data,
            context={"request": request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check for existing report for this user by this reporter
        if Report.objects.filter(
            reported_user=message.sender.user, submitted_by=request.user
        ).exists():
            return Response(
                {"detail": "You have already reported this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the global report
        Report.objects.create(
            submitted_by=request.user,
            reported_user=message.sender.user,
            related_message=message,
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data.get("description", ""),
        )

        return Response({"detail": "Report created."}, status=status.HTTP_201_CREATED)


class MessageMarkReadAPIView(APIView):
    """Mark all messages in a conversation as read by the current user."""

    permission_classes = [IsRegularUser]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(description="All messages marked as read."),
            401: OpenApiResponse(description="Authentication required."),
            403: OpenApiResponse(description="Access denied."),
            404: OpenApiResponse(description=CONVERSATION_NOT_FOUND_MSG),
        },
        description="Mark all messages in a conversation as read by the authenticated user.",
        tags=["Messages"],
        operation_id="messages_mark_read",
    )
    def post(self, request: Request, conversation_id: str) -> Response:
        """Mark all messages in the conversation as read for the current user."""
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({"detail": PROFILE_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND)

        try:
            conversation = Conversation.objects.select_related(
                "match__mentor", "match__mentee"
            ).get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {"detail": CONVERSATION_NOT_FOUND_MSG}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is a participant
        if conversation.match.mentor != profile and conversation.match.mentee != profile:
            return Response({"detail": ACCESS_DENIED_MSG}, status=status.HTTP_403_FORBIDDEN)

        # Update all messages from other sender to 'read'
        unread_messages = Message.objects.filter(conversation=conversation).exclude(sender=profile)

        # 1. Update existing receipts for this user to 'read'
        ReadReceipt.objects.filter(message__conversation=conversation, user=profile).update(
            status="read"
        )

        # 2. Find messages that don't have receipts yet and bulk create them
        existing_receipt_msg_ids = ReadReceipt.objects.filter(
            message__conversation=conversation, user=profile
        ).values_list("message_id", flat=True)

        new_receipts = [
            ReadReceipt(message=message, user=profile, status="read")
            for message in unread_messages.exclude(id__in=existing_receipt_msg_ids)
        ]

        if new_receipts:
            ReadReceipt.objects.bulk_create(new_receipts)

        # 3. Manually sync the updated read status to Firestore since bulk operations
        # bypass post_save signals.
        for msg_id in unread_messages.values_list("id", flat=True):
            update_message_read_status_in_firestore(
                message_id=msg_id,
                conversation_id=conversation.id,
                user_id=profile.id,
                status="read",
            )

        return Response({"detail": "All messages marked as read."}, status=status.HTTP_200_OK)
