"""Authentication classes for accounts app."""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieOrHeaderJWTAuthentication(JWTAuthentication):
    """Authenticate requests using Authorization header first, then JWT cookie."""

    def authenticate(self, request):
        """Authenticate from bearer header or HttpOnly cookie."""
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                try:
                    validated_token = self.get_validated_token(raw_token)
                    return self.get_user(validated_token), validated_token
                except Exception:
                    # If token is invalid in header, don't fail yet, maybe cookie is valid or it's a public endpoint
                    pass

        raw_cookie_token = request.COOKIES.get(settings.AUTH_ACCESS_COOKIE_NAME)
        if not raw_cookie_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_cookie_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            return None
