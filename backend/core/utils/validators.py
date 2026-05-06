"""Shared file upload validators for use across apps."""

from rest_framework import serializers

# Content types considered safe image formats
IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

# Content types considered safe for general media (images + documents)
MEDIA_CONTENT_TYPES = IMAGE_CONTENT_TYPES | {
    "application/pdf",
}


def validate_file_size(file, max_bytes: int, label: str = "File") -> None:
    """Raise ValidationError when *file* exceeds *max_bytes*.

    Parameters
    ----------
    file:
        An ``UploadedFile``-like object with a ``.size`` attribute.
    max_bytes:
        Maximum allowed size in bytes.
    label:
        Human-readable name used in the error message (e.g. "Profile picture").
    """
    if file.size > max_bytes:
        max_mb = max_bytes / (1024 * 1024)
        raise serializers.ValidationError(
            f"{label} must be at most {max_mb:.0f} MB."
        )


def validate_image_content_type(file) -> None:
    """Raise ValidationError when *file* is not a recognised image type."""
    if file.content_type not in IMAGE_CONTENT_TYPES:
        raise serializers.ValidationError(
            "Unsupported file type. Allowed image types: JPEG, PNG, GIF, WebP."
        )


def validate_media_content_type(file) -> None:
    """Raise ValidationError when *file* is not image or PDF."""
    if file.content_type not in MEDIA_CONTENT_TYPES:
        raise serializers.ValidationError(
            "Unsupported file type. Allowed types: JPEG, PNG, GIF, WebP, PDF."
        )
