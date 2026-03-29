from functools import wraps

from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from .models import UserRole


def require_role(allowed_roles):
    """Decorator for view methods requiring a role check.

    Args:
        allowed_roles (set | list): Allowed role names, e.g. {'USER', 'ADMIN'}.
    """

    def wrapper(func):
        @wraps(func)
        def inner(self, request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                raise AuthenticationFailed("Authentication credentials were not provided.")

            if getattr(request.user, "is_banned", False):
                raise PermissionDenied("This account has been banned.")

            user_role = getattr(request.user, "role", None)

            if user_role not in allowed_roles:
                raise PermissionDenied("You do not have permission to perform this action.")

            return func(self, request, *args, **kwargs)

        return inner

    return wrapper


def require_admin(func):
    return require_role({UserRole.ADMIN})(func)


def require_user(func):
    return require_role({UserRole.USER, UserRole.ADMIN})(func)
