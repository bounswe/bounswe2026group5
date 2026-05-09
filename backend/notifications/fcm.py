import logging
from typing import Any, Dict, Optional

import firebase_admin
from django.conf import settings
from firebase_admin import credentials, messaging

logger = logging.getLogger(__name__)

# Singleton instance for Firebase App
_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        try:
            # Service account path relative to BASE_DIR or absolute
            cred_path = settings.BASE_DIR / settings.FIREBASE_SERVICE_ACCOUNT_PATH
            if not cred_path.exists():
                logger.warning(f"Firebase service account file not found at {cred_path}")
                return None

            # Robust check for existing apps to avoid concurrent initialization errors
            app_name = "messaging"
            for app in firebase_admin._apps.values():
                if app.name == app_name:
                    _firebase_app = app
                    logger.debug(f"Firebase app '{app_name}' already exists in _apps, reusing it")
                    return _firebase_app

            try:
                # Double check with get_app in case it was just added
                _firebase_app = firebase_admin.get_app(app_name)
                logger.debug(f"Firebase app '{app_name}' already exists via get_app, reusing it")
            except ValueError:
                # App doesn't exist, create it
                cred = credentials.Certificate(str(cred_path))
                _firebase_app = firebase_admin.initialize_app(cred, name=app_name)
                logger.debug(f"Firebase app '{app_name}' initialized")
        except Exception as e:
            # Last ditch effort: if it failed because it exists, just get it
            if "already exists" in str(e):
                try:
                    _firebase_app = firebase_admin.get_app("messaging")
                    return _firebase_app
                except Exception:
                    pass
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            return None
    return _firebase_app


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
                    tag="neighborship_global_sync",  # Constant tag ensures they replace each other
                ),
            ),
        )
        for token in tokens
    ]

    if not messages:
        return

    try:
        response = messaging.send_each(messages, app=app)
        logger.info(
            f"Successfully sent push notification: {response.success_count} success, {response.failure_count} failure"
        )

        # Cleanup invalid tokens
        if response.failure_count > 0:
            invalid_tokens = []
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    # Check if error is related to invalid token
                    if resp.exception and resp.exception.code in [
                        "registration-token-not-registered",
                        "invalid-registration-token",
                    ]:
                        invalid_tokens.append(tokens[idx])

            if invalid_tokens:
                FCMToken.objects.filter(token__in=invalid_tokens).delete()
                logger.info(f"Deleted {len(invalid_tokens)} invalid FCM tokens.")

    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
