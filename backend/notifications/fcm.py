import logging
from typing import Any, Dict, List, Optional

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
            
            cred = credentials.Certificate(str(cred_path))
            _firebase_app = firebase_admin.initialize_app(cred)
        except Exception as e:
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

    # Prepare the message
    notification = messaging.Notification(
        title=title,
        body=body,
    )

    # Multicast message to all user devices
    messages = [
        messaging.Message(
            notification=notification,
            data=data or {},
            token=token,
        )
        for token in tokens
    ]

    try:
        response = messaging.send_each(messages)
        logger.info(
            f"Successfully sent push notification: {response.success_count} success, {response.failure_count} failure"
        )

        # Cleanup invalid tokens
        if response.failure_count > 0:
            invalid_tokens = []
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    # Check if error is related to invalid token
                    if resp.exception and resp.exception.code in ["registration-token-not-registered", "invalid-registration-token"]:
                        invalid_tokens.append(tokens[idx])

            if invalid_tokens:
                FCMToken.objects.filter(token__in=invalid_tokens).delete()
                logger.info(f"Deleted {len(invalid_tokens)} invalid FCM tokens.")
                
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
