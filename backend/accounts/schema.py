"""OpenAPI schema extensions for accounts app."""

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class CookieOrHeaderJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """Map custom JWT authentication class to OpenAPI bearer scheme."""

    target_class = "accounts.authentication.CookieOrHeaderJWTAuthentication"
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        """Return OpenAPI security definition for JWT bearer auth."""
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
