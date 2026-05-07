"""Serializers for messaging API endpoints."""

from django.conf import settings
from rest_framework import serializers

from mentorship.serializers import ProfileSummarySerializer

from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for private conversations tied to a mentorship match."""

    match_id = serializers.UUIDField(source="match.id", read_only=True)
    mentor = ProfileSummarySerializer(source="match.mentor", read_only=True)
    mentee = ProfileSummarySerializer(source="match.mentee", read_only=True)

    class Meta:
        model = Conversation
        fields = (
            "id",
            "match_id",
            "mentor",
            "mentee",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages inside a private conversation."""

    conversation_id = serializers.UUIDField(source="conversation.id", read_only=True)
    sender = ProfileSummarySerializer(read_only=True)
    attachment_url = serializers.SerializerMethodField()
    read_receipts = serializers.SerializerMethodField()
    status_for_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "conversation_id",
            "sender",
            "body",
            "attachment_url",
            "read_receipts",
            "status_for_me",
            "created_at",
        )
        read_only_fields = (
            "id",
            "conversation_id",
            "sender",
            "attachment_url",
            "read_receipts",
            "status_for_me",
            "created_at",
        )

    def get_attachment_url(self, obj: Message) -> str | None:
        """Return the public URL for an attached file, if present."""
        if not obj.attachment:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url

    def get_read_receipts(self, obj: Message) -> dict:
        """Return read receipt statuses for all users."""
        receipts = {}
        for receipt in obj.read_receipts.all():
            receipts[str(receipt.user_id)] = receipt.status
        return receipts

    def get_status_for_me(self, obj: Message) -> str:
        """Return the status of this message for the current user."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return "sent"
        return obj.get_status_for_user(str(request.user.id))


class MessageCreateSerializer(serializers.Serializer):
    """Serializer for creating a new message with optional file attachment."""

    body = serializers.CharField(required=False, allow_blank=True)
    attachment = serializers.FileField(required=False, allow_null=True)

    def validate(self, attrs: dict) -> dict:
        """Ensure a message has at least text or an attachment."""
        body = attrs.get("body", "")
        attachment = attrs.get("attachment")

        if not body and not attachment:
            raise serializers.ValidationError("A message must include text or an attachment.")

        return attrs

    def validate_attachment(self, attachment):
        """Accept only safe attachment types and enforce a size limit."""
        allowed_content_types = {
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
        }
        max_size_bytes = settings.MAX_MESSAGE_ATTACHMENT_SIZE_BYTES

        if attachment.content_type not in allowed_content_types:
            raise serializers.ValidationError(
                "Unsupported attachment type. Allowed types are PDF, image, and audio files."
            )

        if attachment.size > max_size_bytes:
            raise serializers.ValidationError(
                f"Attachment size must be at most {settings.MAX_MESSAGE_ATTACHMENT_SIZE_MB} MB."
            )

        return attachment
