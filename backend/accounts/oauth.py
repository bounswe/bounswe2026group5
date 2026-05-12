"""OAuth2 ID-token verification for Google."""

import logging
import requests

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
        # 1. Try to verify as an ID Token (JWT)
        if raw_token.count(".") == 2:
            payload = _verify_jwt_token(raw_token, client_id)
        else:
            # 2. Fallback: Verify as an Access Token using Google's tokeninfo endpoint
            payload = _verify_access_token(raw_token, client_id)

        email = payload.get("email")
        if not email:
            raise OAuthVerificationError("Google token does not contain an email address.")

        if not payload.get("email_verified", False):
            raise OAuthVerificationError("Google email address is not verified.")

    except Exception as exc:
        if isinstance(exc, OAuthVerificationError):
            raise
        # Wrap unexpected errors
        logger.error("Unexpected error during Google token verification: %s", exc)
        raise OAuthVerificationError("Google token verification failed.") from exc

    return {
        "email": email.lower(),
        "given_name": payload.get("given_name", ""),
        "family_name": payload.get("family_name", ""),
        "name": payload.get("name", ""),
        "picture": payload.get("picture", ""),
    }


def _verify_jwt_token(raw_token: str, client_id: str) -> dict:
    """Verify raw_token as a Google JWT ID token."""
    try:
        return google_id_token.verify_oauth2_token(
            raw_token,
            GoogleAuthRequest(),
            audience=client_id,
        )
    except ValueError as exc:
        logger.warning("Google JWT verification failed: %s", exc)
        raise OAuthVerificationError("Invalid or expired Google token.") from exc


def _verify_access_token(raw_token: str, client_id: str) -> dict:
    """Verify raw_token as a Google OAuth2 access token and fetch user info."""
    # Verify the access token using Google's tokeninfo endpoint
    info_url = f"https://oauth2.googleapis.com/tokeninfo?access_token={raw_token}"
    response = requests.get(info_url, timeout=10)

    if response.status_code != 200:
        raise OAuthVerificationError("Invalid or expired Google access token.")

    token_info = response.json()

    # Verify the audience (client_id) matches
    if token_info.get("aud") != client_id:
        raise OAuthVerificationError("Google Access Token audience mismatch.")

    # Fetch user details from the userinfo endpoint
    user_info_res = requests.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {raw_token}"},
        timeout=10,
    )

    if user_info_res.status_code != 200:
        raise OAuthVerificationError("Google UserInfo fetch failed.")

    payload = user_info_res.json()
    # Normalize email_verified field
    verified = payload.get("email_verified", True)
    payload["email_verified"] = str(verified).lower() == "true"
    return payload
