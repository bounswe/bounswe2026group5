from django.contrib import admin

from .models import AvailabilitySlot, Profile, Skill


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "display_name",
        "user",
        "show_initials_only",
        "created_at",
    )
    list_filter = ("show_initials_only",)
    search_fields = ("username", "display_name", "user__email", "title")
    ordering = ("display_name",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    ordering = ("name",)




@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("profile", "start_at", "end_at", "is_booked", "created_at")
    list_filter = ("is_booked",)
    search_fields = ("profile__display_name", "profile__user__email")
    ordering = ("start_at",)
