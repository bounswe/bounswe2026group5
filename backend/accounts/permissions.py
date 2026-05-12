from django.conf import settings
from rest_framework.permissions import BasePermission

from .models import UserRole


class IsUser(BasePermission):
    message = "You must be an authenticated user to access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, "is_banned", False):
            return False

        return request.user.role in {UserRole.USER, UserRole.ADMIN}


class IsAdmin(BasePermission):
    message = "You must be an administrator to access this resource."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
            and not getattr(request.user, "is_banned", False)
        )


class IsNotBanned(BasePermission):
    message = "This account has been banned."

    def has_permission(self, request, view):
        return not getattr(request.user, "is_banned", False)


class IsRegularUser(BasePermission):
    message = "You must be a regular (non-admin) authenticated user to access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, "is_banned", False):
            return False

        return request.user.role == UserRole.USER


class IsEmailVerified(BasePermission):
    message = "Please verify your email address to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True):
            return True

        return bool(getattr(request.user, "is_email_verified", False))
