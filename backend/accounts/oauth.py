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
        # JWTs always have 3 segments separated by dots
        if raw_token.count('.') == 2:
            payload = google_id_token.verify_oauth2_token(
                raw_token,
                GoogleAuthRequest(),
                audience=client_id,
            )
        else:
            # 2. Fallback: Verify as an Access Token using Google's tokeninfo endpoint
            response = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?access_token={raw_token}",
                timeout=10
            )
            
            if response.status_code != 200:
                raise OAuthVerificationError("Invalid or expired Google access token.")
                
            token_info = response.json()
            
            # Verify the audience (client_id) matches
            aud = token_info.get("aud")
            if aud != client_id:
                raise OAuthVerificationError("Google Access Token audience mismatch.")
                
            # Access tokens don't contain user details, so we must fetch them from the userinfo endpoint
            user_info_res = requests.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {raw_token}"},
                timeout=10
            )
            
            if user_info_res.status_code != 200:
                raise OAuthVerificationError("Google UserInfo fetch failed.")
                
            payload = user_info_res.json()
            # Normalize field for the logic below. Userinfo might return "true"/"false" as strings or booleans.
            verified = payload.get("email_verified", True)
            payload["email_verified"] = str(verified).lower() == "true"

    except ValueError as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise OAuthVerificationError("Invalid or expired Google token.") from exc
    except Exception as exc:
        logger.error("Unexpected error during Google token verification: %s", exc)
        raise OAuthVerificationError("Google token verification failed.") from exc

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
