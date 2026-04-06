from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "email",
        "role",
        "auth_provider",
        "is_active",
        "is_banned",
        "is_staff",
        "is_superuser",
        "created_at",
    )
    list_filter = (
        "role",
        "auth_provider",
        "is_active",
        "is_banned",
        "is_staff",
    )
    search_fields = ("email", "username")
    ordering = ("email",)
