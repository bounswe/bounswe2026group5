from django.contrib import admin

from .models import (
    AvailabilitySlot,
    ExpertiseField,
    Match,
    MentorshipRequest,
    Profile,
    ProfileExpertise,
    User,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
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
    search_fields = ("email",)
    ordering = ("email",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "user",
        "mentorship_mode",
        "is_visible",
        "show_initials_only",
        "created_at",
    )
    list_filter = ("mentorship_mode", "is_visible", "show_initials_only")
    search_fields = ("display_name", "user__email", "title")
    ordering = ("display_name",)


@admin.register(ExpertiseField)
class ExpertiseFieldAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name", "description")
    ordering = ("name",)


@admin.register(ProfileExpertise)
class ProfileExpertiseAdmin(admin.ModelAdmin):
    list_display = (
        "profile",
        "expertise_field",
        "proficiency_level",
        "average_rating",
        "rating_count",
        "created_at",
    )
    list_filter = ("proficiency_level",)
    search_fields = ("profile__display_name", "expertise_field__name")
    ordering = ("-created_at",)


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("profile", "start_at", "end_at", "is_booked", "created_at")
    list_filter = ("is_booked",)
    search_fields = ("profile__display_name", "profile__user__email")
    ordering = ("start_at",)


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
