from rest_framework import serializers

from mentorship.serializers import ProfileSummarySerializer

from .models import FCMToken, Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""

    actor = ProfileSummarySerializer(read_only=True)

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


class FCMTokenSerializer(serializers.ModelSerializer):
    """Serializer for FCMToken model."""

    class Meta:
        model = FCMToken
        fields = ["token", "device_type"]

    def create(self, validated_data):
        user = self.context["request"].user
        token = validated_data["token"]
        device_type = validated_data.get("device_type", "web")

        fcm_token, created = FCMToken.objects.update_or_create(
            token=token,
            defaults={"user": user, "device_type": device_type},
        )
        return fcm_token
