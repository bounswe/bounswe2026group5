"""Feed post models."""

import uuid

from django.db import models


class Post(models.Model):
    """A feed post authored by a profile."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        "profiles.Profile",
        on_delete=models.CASCADE,
        related_name="posts",
    )
    content = models.TextField()
    image = models.FileField(upload_to="post_images/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "posts"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.author.display_name}: {self.content[:60]}"
