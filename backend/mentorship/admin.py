from django.contrib import admin

from .models import Match, MeetingSession, MentorshipRequest, Workshop, WorkshopParticipant


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


@admin.register(MeetingSession)
class MeetingSessionAdmin(admin.ModelAdmin):
    list_display = (
        "match",
        "mentor",
        "mentee",
        "status",
        "scheduled_start_at_utc",
        "scheduled_end_at_utc",
    )
    list_filter = ("status",)
    search_fields = (
        "mentor__display_name",
        "mentor__user__email",
        "mentee__display_name",
        "mentee__user__email",
    )
    ordering = ("-scheduled_start_at_utc",)


@admin.register(Workshop)
class WorkshopAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "author",
        "community",
        "scheduled_at",
        "max_participants",
        "status",
        "created_at",
    )
    list_filter = ("status", "community", "created_at")
    search_fields = (
        "title",
        "author__display_name",
        "author__user__email",
        "community__name",
    )
    ordering = ("-scheduled_at", "-created_at")
    readonly_fields = ("created_at", "updated_at")


@admin.register(WorkshopParticipant)
class WorkshopParticipantAdmin(admin.ModelAdmin):
    list_display = (
        "participant",
        "workshop",
        "joined_at",
        "show_on_profile",
    )
    list_filter = ("show_on_profile", "joined_at")
    search_fields = (
        "participant__display_name",
        "participant__user__email",
        "workshop__title",
    )
    ordering = ("-joined_at",)
