from django.contrib import admin

from .models import Workshop, WorkshopParticipation


@admin.register(Workshop)
class WorkshopAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "mentor",
        "status",
        "scheduled_start_at_utc",
        "scheduled_end_at_utc",
        "min_participants",
        "max_participants",
    )
    list_filter = ("status",)
    search_fields = (
        "title",
        "mentor__display_name",
        "mentor__user__email",
    )
    ordering = ("-scheduled_start_at_utc",)


@admin.register(WorkshopParticipation)
class WorkshopParticipationAdmin(admin.ModelAdmin):
    list_display = (
        "workshop",
        "mentee",
        "group_size",
        "status",
        "requested_at",
        "decided_at",
    )
    list_filter = ("status",)
    search_fields = (
        "workshop__title",
        "mentee__display_name",
        "mentee__user__email",
    )
    ordering = ("-requested_at",)
