"""Post serializers."""

from rest_framework import serializers

from .models import Post


class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_display_name = serializers.CharField(source="author.display_name", read_only=True)
    author_picture_url = serializers.CharField(source="author.picture_url", read_only=True)
    image_url = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author_username",
            "author_display_name",
            "author_picture_url",
            "content",
            "image_url",
            "is_mine",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_image_url(self, obj: Post) -> str | None:
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def get_is_mine(self, obj: Post) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.author.user_id == request.user.pk
