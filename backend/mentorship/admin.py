from django.contrib import admin

from .models import Match, MentorshipRequest


@admin.register(MentorshipRequest)
class MentorshipRequestAdmin(admin.ModelAdmin):
    list_display = (
        "mentee",
        "mentor",
        "status",
        "created_at",
        "responded_at",
    )
    list_filter = ("status",)
    search_fields = (
        "mentor__display_name",
        "mentor__user__email",
        "mentee__display_name",
        "mentee__user__email",
    )
    ordering = ("-created_at",)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("mentor", "mentee", "is_active", "request")
    list_filter = ("is_active",)
    search_fields = (
        "mentor__display_name",
        "mentor__user__email",
        "mentee__display_name",
        "mentee__user__email",
    )
    ordering = ("-request__created_at",)
