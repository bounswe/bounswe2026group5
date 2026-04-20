from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "actor",
            "resource_type",
            "resource_id",
            "action_url",
            "extra_metadata",
            "is_read",
            "created_at",
        ]
