import logging
from typing import Dict, List, Optional

import firebase_admin
from django.conf import settings
from firebase_admin import credentials, messaging

logger = logging.getLogger(__name__)

# Singleton instance for Firebase App
_firebase_app = None


def get_firebase_app():
    """Initialize or retrieve the Firebase app singleton."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        cred_path = settings.BASE_DIR / settings.FIREBASE_SERVICE_ACCOUNT_PATH
        if not cred_path.exists():
            logger.warning("Firebase service account file not found at %s", cred_path)
            return None

        app_name = "messaging"
        # Check existing apps
        for app in firebase_admin._apps.values():
            if app.name == app_name:
                _firebase_app = app
                return _firebase_app

        try:
            _firebase_app = firebase_admin.get_app(app_name)
        except ValueError:
            cred = credentials.Certificate(str(cred_path))
            _firebase_app = firebase_admin.initialize_app(cred, name=app_name)
            logger.debug("Firebase app '%s' initialized", app_name)
    except Exception:
        logger.exception("Failed to initialize Firebase Admin SDK")
        return None

    return _firebase_app


def _cleanup_invalid_tokens(response: messaging.BatchResponse, tokens: List[str]) -> None:
    """Identify and delete tokens that are no longer registered or invalid."""
    invalid_tokens = []
    for idx, resp in enumerate(response.responses):
        if not resp.success and resp.exception:
            if resp.exception.code in [
                "registration-token-not-registered",
                "invalid-registration-token",
            ]:
                invalid_tokens.append(tokens[idx])

    if invalid_tokens:
        from .models import FCMToken

        FCMToken.objects.filter(token__in=invalid_tokens).delete()
        logger.info("Deleted %d invalid FCM tokens.", len(invalid_tokens))


def send_push_notification(
    user_id: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
) -> None:
    """Send a push notification to all registered tokens of a user."""
    from .models import FCMToken  # Local import to avoid circular dependency

    app = get_firebase_app()
    if not app:
        return

    tokens = list(FCMToken.objects.filter(user_id=user_id).values_list("token", flat=True))
    if not tokens:
        return

    messages = [
        messaging.Message(
            notification=messaging.Notification(title="Neighborship", body=f"{title}: {body}"),
            data=data or {},
            token=token,
            android=messaging.AndroidConfig(
                priority="normal",
                notification=messaging.AndroidNotification(
                    title="Neighborship",
                    body=f"{title}: {body}",
                    channel_id="default",
                    tag="neighborship_global_sync",
                ),
            ),
        )
        for token in tokens
    ]

    try:
        response = messaging.send_each(messages, app=app)
        logger.info(
            "Successfully sent push notification: %d success, %d failure",
            response.success_count,
            response.failure_count,
        )

        if response.failure_count > 0:
            _cleanup_invalid_tokens(response, tokens)

    except Exception:
        logger.exception("Error sending push notification")
