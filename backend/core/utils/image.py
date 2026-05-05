"""Image processing utilities for uploaded files."""

import io
import uuid

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image


def resize_image(
    uploaded_file,
    max_dimension: int,
    output_format: str = "JPEG",
    quality: int = 85,
):
    """Resize an uploaded image so its longest side is at most *max_dimension* px.

    If the image already fits within the limit, it is re-encoded (to strip
    EXIF / reduce size) but not scaled.

    Parameters
    ----------
    uploaded_file:
        A Django ``UploadedFile`` (or file-like) containing image data.
    max_dimension:
        Maximum width or height in pixels.
    output_format:
        PIL output format (``"JPEG"``, ``"PNG"``, ``"WEBP"``).
    quality:
        Compression quality for lossy formats (1–100).

    Returns
    -------
    A ``SimpleUploadedFile`` ready to be assigned to an ``ImageField``.
    """
    img = Image.open(uploaded_file)

    # Convert palette / RGBA to RGB when outputting as JPEG
    if output_format.upper() == "JPEG" and img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize if larger than limit (maintain aspect ratio)
    if max(img.size) > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format=output_format, quality=quality, optimize=True)
    buffer.seek(0)

    extension = {
        "JPEG": ".jpg",
        "PNG": ".png",
        "WEBP": ".webp",
        "GIF": ".gif",
    }.get(output_format.upper(), ".jpg")

    content_type = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
        "GIF": "image/gif",
    }.get(output_format.upper(), "image/jpeg")

    filename = f"{uuid.uuid4().hex}{extension}"

    return SimpleUploadedFile(
        name=filename,
        content=buffer.read(),
        content_type=content_type,
    )
