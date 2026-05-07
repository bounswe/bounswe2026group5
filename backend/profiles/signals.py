"""Signal handlers for community tag side effects.

These handlers translate tag lifecycle events into in-app notifications
using the existing notifications app, so the view layer does not need
to know about notification dispatch directly. Views set a transient
``_actor_profile_id`` attribute on the tag instance before saving or
deleting so handlers can suppress notifications for the actor.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver

from notifications.models import Notification, NotificationType

from .models import CommunityTag, CommunityTagMembership, Profile

logger = logging.getLogger(__name__)


def _safe_create(**kwargs: Any) -> None:
    """Create a notification, swallowing failures so they do not roll back the caller."""
    try:
        Notification.objects.create(**kwargs)
    except Exception:
        logger.exception("Notification persistence failed for community tag flow.")


def _actor_id(instance: Any) -> UUID | None:
    return getattr(instance, "_actor_profile_id", None)


@receiver(pre_save, sender=CommunityTag, dispatch_uid="profiles.capture_old_tag_description")
def capture_old_tag_description(sender, instance: CommunityTag, **kwargs: Any) -> None:
    """Snapshot the existing description so post_save can detect a change."""
    if not instance.pk:
        return
    try:
        old = CommunityTag.objects.only("description").get(pk=instance.pk)
    except CommunityTag.DoesNotExist:
        return
    instance._old_description = old.description


@receiver(post_save, sender=CommunityTag, dispatch_uid="profiles.handle_tag_save")
def handle_tag_save(
    sender, instance: CommunityTag, created: bool, **kwargs: Any
) -> None:
    """On create, fan out interest matches; on update, notify members of edits."""
    if kwargs.get("raw", False):
        return

    if created:
        _notify_matching_interests(instance)
        return

    old = getattr(instance, "_old_description", None)
    if old is None or old == instance.description:
        return

    actor_id = _actor_id(instance)
    member_user_ids = (
        CommunityTagMembership.objects
        .filter(tag=instance)
        .exclude(profile_id=actor_id)
        .values_list("profile__user_id", "profile_id")
    )
    for user_id, _profile_id in member_user_ids:
        _safe_create(
            user_id=user_id,
            type=NotificationType.TAG_DESCRIPTION_UPDATED,
            title=f"Tag updated: {instance.name}",
            message=f"The description of '{instance.name}' has been updated.",
            resource_type="community_tag",
            resource_id=instance.id,
        )


@receiver(pre_delete, sender=CommunityTag, dispatch_uid="profiles.snapshot_members_before_delete")
def snapshot_members_before_delete(sender, instance: CommunityTag, **kwargs: Any) -> None:
    """Capture current member user ids before cascade removes the through rows."""
    actor_id = _actor_id(instance)
    instance._snapshot_member_user_ids = list(
        CommunityTagMembership.objects
        .filter(tag=instance)
        .exclude(profile_id=actor_id)
        .values_list("profile__user_id", flat=True)
    )


@receiver(post_delete, sender=CommunityTag, dispatch_uid="profiles.notify_tag_deleted")
def notify_tag_deleted(sender, instance: CommunityTag, **kwargs: Any) -> None:
    """Tell former members the tag they belonged to has been deleted."""
    user_ids = getattr(instance, "_snapshot_member_user_ids", None) or []
    if not user_ids:
        return

    name = instance.name
    for user_id in user_ids:
        _safe_create(
            user_id=user_id,
            type=NotificationType.TAG_DELETED,
            title=f"Tag deleted: {name}",
            message=f"The community tag '{name}' you belonged to has been deleted.",
            resource_type="community_tag",
            resource_id=instance.id,
        )


@receiver(
    post_save,
    sender=CommunityTagMembership,
    dispatch_uid="profiles.notify_tag_creator_on_join",
)
def notify_tag_creator_on_join(
    sender, instance: CommunityTagMembership, created: bool, **kwargs: Any
) -> None:
    """Notify the tag's creator when somebody else joins their tag."""
    if not created or kwargs.get("raw", False):
        return

    tag = instance.tag
    creator_profile_id = tag.created_by_id
    if creator_profile_id is None or creator_profile_id == instance.profile_id:
        return

    creator_user_id = (
        Profile.objects.filter(id=creator_profile_id).values_list("user_id", flat=True).first()
    )
    if creator_user_id is None:
        return

    _safe_create(
        user_id=creator_user_id,
        type=NotificationType.TAG_NEW_MEMBER,
        title=f"New member in {tag.name}",
        message=f"A new user just joined your tag '{tag.name}'.",
        actor_id=instance.profile_id,
        resource_type="community_tag",
        resource_id=tag.id,
    )


def _tag_keywords(tag: CommunityTag) -> set[str]:
    """Pick reasonably specific tokens from the tag name and slug for matching."""
    raw = f"{tag.name} {tag.slug}".lower()
    parts = {p for chunk in raw.split() for p in chunk.replace("-", " ").split()}
    return {p for p in parts if len(p) >= 3}


def _notify_matching_interests(tag: CommunityTag) -> None:
    """Send a discovery notification to users whose skills overlap with the tag."""
    keywords = _tag_keywords(tag)
    if not keywords:
        return

    creator_profile_id = tag.created_by_id

    candidates = (
        Profile.objects
        .exclude(id=creator_profile_id)
        .values_list("user_id", "skills")
    )

    for user_id, skills in candidates:
        if not skills:
            continue
        if any(
            kw in skill.lower() or skill.lower() in kw
            for skill in skills
            for kw in keywords
        ):
            _safe_create(
                user_id=user_id,
                type=NotificationType.TAG_MATCHES_INTEREST,
                title=f"New tag matches your interests: {tag.name}",
                message=f"A new community tag '{tag.name}' looks like it matches your skills.",
                resource_type="community_tag",
                resource_id=tag.id,
            )
