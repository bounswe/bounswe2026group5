"""OAuth2 ID-token verification for Google."""

import logging

from django.conf import settings
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token

logger = logging.getLogger(__name__)


class OAuthVerificationError(Exception):
    """Raised when an OAuth ID-token cannot be verified."""


def verify_google_id_token(raw_token: str) -> dict:
    """Verify a Google ID-token and return the decoded payload.

    Returns a dict with at least ``email``.  Optional keys include
    ``given_name``, ``family_name``, ``name``, and ``picture``.

    Raises ``OAuthVerificationError`` on any verification failure.
    """
    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
    if not client_id:
        raise OAuthVerificationError("Google OAuth is not configured on the server.")

    try:
        payload = google_id_token.verify_oauth2_token(
            raw_token,
            GoogleAuthRequest(),
            audience=client_id,
        )
    except ValueError as exc:
        logger.warning("Google ID-token verification failed: %s", exc)
        raise OAuthVerificationError("Invalid or expired Google token.") from exc

    email = payload.get("email")
    if not email:
        raise OAuthVerificationError("Google token does not contain an email address.")

    if not payload.get("email_verified", False):
        raise OAuthVerificationError("Google email address is not verified.")

    return {
        "email": email.lower(),
        "given_name": payload.get("given_name", ""),
        "family_name": payload.get("family_name", ""),
        "name": payload.get("name", ""),
        "picture": payload.get("picture", ""),
    }
