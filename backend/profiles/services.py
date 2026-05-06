"""Domain services for profile-related business operations."""

import uuid
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Coalesce
from django.utils import timezone

from mentorship.models import MentorshipRequest

from .models import AvailabilitySlot, Profile


class AvailabilityBookingError(Exception):
    """Base exception for booking-related business rule failures."""


class SlotAlreadyBookedError(AvailabilityBookingError):
    """Raised when attempting to book an already booked slot."""


class SlotInPastError(AvailabilityBookingError):
    """Raised when attempting to book a slot that is already in the past."""


class OwnSlotBookingError(AvailabilityBookingError):
    """Raised when mentor tries to book their own slot."""


class SlotNotBookedError(AvailabilityBookingError):
    """Raised when attempting to cancel an unbooked slot."""


class BookingCancelNotAllowedError(AvailabilityBookingError):
    """Raised when request user cannot cancel this booking."""


class InvalidPrPEventTypeError(Exception):
    """Raised when an unsupported event_type is supplied for a profile post."""


class InvalidCoPEventTypeError(Exception):
    """Raised when an unsupported event_type is supplied for a community post."""


# ============================================================================
# CoP Tagging Utilities
# ============================================================================


def get_taggable_users(author_profile: Profile) -> Any:
    """Get users who can be tagged in a CoP by the given author.

    Taggable users are active mentorship connections (both directions).
    Community members are resolved separately in validate_tagged_users_list.

    Args:
        author_profile: The Profile of the CoP author.

    Returns:
        A QuerySet of Profile objects that can be tagged via mentorship.
    """
    # Get all active mentorship connections (bidirectional) via ORM related names.
    # mentor_matches / mentee_matches are defined on the Match model.
    mentorship_connections = Profile.objects.filter(
        Q(mentor_matches__is_active=True, mentor_matches__mentee=author_profile)
        | Q(mentee_matches__is_active=True, mentee_matches__mentor=author_profile)
    ).distinct()

    return mentorship_connections.exclude(id=author_profile.id)


def get_tagged_user_info(user_id: str, username_snapshot: str | None = None) -> dict[str, str]:
    """Get or construct tagged user information.

    If user exists, returns the current username. If user was deleted, uses the
    provided username_snapshot (from when the tag was created).

    Args:
        user_id: UUID of the user to tag.
        username_snapshot: Username at tag-time (used if user was deleted).

    Returns:
        Dict with 'user_id' and 'username' keys.

    Raises:
        Profile.DoesNotExist: If user doesn't exist and no snapshot provided.
    """
    try:
        user = Profile.objects.only("id", "username").get(id=user_id)
        return {
            "user_id": str(user_id),
            "username": user.username,
        }
    except Profile.DoesNotExist:
        if username_snapshot is None:
            raise
        # Fallback to snapshot if user was deleted
        return {
            "user_id": str(user_id),
            "username": username_snapshot,
        }


def validate_tagged_users_list(
    author: Profile,
    tagged_user_ids: list[str] | None,
    community_id: str | None,
    previous_tagged_user_ids: list[str] | None = None,
) -> list[dict[str, str]]:
    """Validate and build tagged users list for a CoP.

    Validation rules:
    - No more than COP_MAX_TAGS users (default 5).
    - All tagged users must exist.
    - Tagged users must be either mentorship connections or community members.
    - Author cannot tag themselves.
    - During editing, users who were previously tagged but are now untaggable
      are preserved if they are NOT in the new tagged_user_ids list (merge logic).
      If re-added to the new list, they are rejected.

    Args:
        author: The Profile of the CoP author.
        tagged_user_ids: List of user IDs to tag (can be None/empty for new posts).
        community_id: UUID of the community where the CoP is posted.
        previous_tagged_user_ids: List of previously tagged user IDs (for editing).

    Returns:
        List of dicts with 'user_id' and 'username' keys (snapshot at tag-time).

    Raises:
        ValidationError: If validation fails.
    """
    from .models import CommunityTag, CommunityTagMembership

    max_tags = getattr(settings, "COP_MAX_TAGS", 5)
    tagged_user_ids = tagged_user_ids or []
    previous_tagged_user_ids = previous_tagged_user_ids or []

    # --- Basic Constraints --------------------------------------------------

    if len(tagged_user_ids) > max_tags:
        raise ValidationError(f"Cannot tag more than {max_tags} users. Got {len(tagged_user_ids)}.")

    if str(author.id) in [str(uid) for uid in tagged_user_ids]:
        raise ValidationError("You cannot tag yourself.")

    # Convert to sets of UUIDs for set operations
    new_tagged_ids = {uuid.UUID(uid) if isinstance(uid, str) else uid for uid in tagged_user_ids}
    prev_tagged_ids = {
        uuid.UUID(uid) if isinstance(uid, str) else uid for uid in previous_tagged_user_ids
    }

    # --- Determine Currently Taggable Users ---------------------------------

    taggable_by_mentorship = set(get_taggable_users(author).values_list("id", flat=True))

    taggable_by_community: set = set()
    if community_id:
        try:
            community = CommunityTag.objects.only("id").get(id=community_id)
            taggable_by_community = set(
                CommunityTagMembership.objects.filter(tag=community).values_list(
                    "profile__id", flat=True
                )
            )
        except CommunityTag.DoesNotExist:
            raise ValidationError(f"Community with ID {community_id} does not exist.")

    currently_taggable = taggable_by_mentorship | taggable_by_community

    # --- Enforce Permissions (with Merge Logic) -----------------------------

    # Only validate NEWLY added tags (users not previously tagged).
    # Previously tagged users can remain in the list even if now untaggable,
    # because the editor is explicitly choosing to keep them (by including them
    # in the submitted list). Users not in the submitted list are removed.
    # This means: if the editor wants to keep a now-untaggable user, they must
    # include them in the new list; if they omit them, they are removed.
    # Once removed, a now-untaggable user cannot be re-added.
    newly_tagged = new_tagged_ids - prev_tagged_ids
    unallowed_new_tags = newly_tagged - currently_taggable

    if unallowed_new_tags:
        unallowed_names = ", ".join(str(uid) for uid in unallowed_new_tags)
        raise ValidationError(
            f"Cannot tag users: {unallowed_names}. "
            f"They are not in your mentorship connections or the community."
        )

    # Final state = exactly what the editor submitted (after validation).
    # No auto-preservation: omitting a user removes them.
    final_tagged_ids = new_tagged_ids

    # --- Build Snapshot List ------------------------------------------------

    tagged_users_list = []
    for user_id in final_tagged_ids:
        try:
            user_info = get_tagged_user_info(str(user_id))
            tagged_users_list.append(user_info)
        except Profile.DoesNotExist:
            raise ValidationError(f"User with ID {user_id} does not exist and cannot be tagged.")

    return tagged_users_list


def book_availability_slot(*, profile: Profile, slot_id, actor) -> AvailabilitySlot:
    """Book one slot with row-level locking to prevent race conditions."""
    with transaction.atomic():
        slot = (
            AvailabilitySlot.objects.select_for_update()
            .select_related("profile__user")
            .get(id=slot_id, profile=profile)
        )

        if slot.start_at <= timezone.now():
            raise SlotInPastError("Cannot book a slot in the past.")

        if slot.is_booked or slot.status == AvailabilitySlot.Status.BOOKED:
            raise SlotAlreadyBookedError("Slot is already booked.")

        if slot.profile.user.id == actor.id:
            raise OwnSlotBookingError("Mentors cannot book their own availability slot.")

        slot.mark_booked(actor)
        return slot


def cancel_availability_booking(*, profile: Profile, slot_id, actor) -> AvailabilitySlot:
    """Cancel one booking with row-level locking and ownership checks."""
    with transaction.atomic():
        slot = (
            AvailabilitySlot.objects.select_for_update()
            .select_related("profile__user")
            .get(id=slot_id, profile=profile)
        )

        if not slot.is_booked:
            raise SlotNotBookedError("Slot is not booked.")

        is_slot_owner = slot.profile.user.id == actor.id
        is_booking_owner = slot.booked_by is not None and slot.booked_by.id == actor.id
        if not is_slot_owner and not is_booking_owner:
            raise BookingCancelNotAllowedError(
                "Only booking owner or mentor can cancel this booking."
            )

        # Accepted first-session requests keep a protected FK to the slot.
        # Once the booking is canceled, detach those links so the mentor can
        # delete the now-available slot without triggering ProtectedError.
        # MentorshipRequest moved to top level

        accepted_requests = MentorshipRequest.objects.select_for_update().filter(
            slot=slot,
            status=MentorshipRequest.Status.ACCEPTED,
        )

        for request_obj in accepted_requests:
            if request_obj.initial_session_start_at is None:
                request_obj.initial_session_start_at = slot.start_at
            if request_obj.initial_session_end_at is None:
                request_obj.initial_session_end_at = slot.end_at
            request_obj.slot = None
            request_obj.save(
                update_fields=[
                    "slot",
                    "initial_session_start_at",
                    "initial_session_end_at",
                ]
            )

        slot.mark_available()
        return slot


def list_profile_feed_events(
    *,
    profile: Profile,
    offset: int,
    limit: int,
    category: str | None = None,
    event_type: str | None = None,
) -> dict[str, Any]:
    """Return paginated profile feed events for a profile page.

    Feed includes:
    - Profile posts (PrP) authored by the profile.
    - MCTE events authored by the profile where show_on_profile=True.
    - CoP events authored by the profile where show_on_profile=True.
    """
    from timeline.models import TimelineEvent

    queryset = (
        TimelineEvent.objects.filter(author=profile, is_deleted=False)
        .filter(
            Q(category=TimelineEvent.Category.PRP)
            | Q(category=TimelineEvent.Category.MCTE, show_on_profile=True)
            | Q(category=TimelineEvent.Category.COP, show_on_profile=True)
        )
        .select_related(
            "author",
            "mentorship__mentor",
            "mentorship__mentee",
        )
        .annotate(effective_last_update=Coalesce("last_edited", "created_at"))
        .order_by("-created_at", "-effective_last_update", "-source_id")
    )

    if category is not None:
        queryset = queryset.filter(category=category)

    if event_type is not None:
        queryset = queryset.filter(event_type=event_type)

    total_count = queryset.count()
    events = list(queryset[offset : offset + limit])

    return {
        "count": total_count,
        "offset": offset,
        "limit": limit,
        "results": events,
    }


def create_prp_event(
    *,
    author_profile: Profile,
    event_type: str,
    content: str = "",
    media_url: str | None = None,
    timestamp: Any | None = None,
) -> Any:
    """Create and persist a profile post (PrP).

    If timestamp is omitted, event timestamp is aligned with created_at.
    """
    from timeline.models import TimelineEvent

    if event_type not in TimelineEvent.MCTEEventType.values:
        raise InvalidPrPEventTypeError(
            f"Invalid PrP event_type: '{event_type}'. "
            f"Must be one of {TimelineEvent.MCTEEventType.values}."
        )

    event = TimelineEvent.objects.create(
        source_id=f"prp:{uuid.uuid4()}",
        category=TimelineEvent.Category.PRP,
        event_type=event_type,
        author=author_profile,
        content=content,
        media_url=media_url,
        show_on_profile=True,
        timestamp=timestamp if timestamp is not None else timezone.now(),
    )

    if timestamp is None:
        event.timestamp = event.created_at
        event.save(update_fields=["timestamp"])

    return event


def edit_prp_event(
    *,
    event: Any,
    content: str | None = None,
    event_type: str | None = None,
    media_url: str | None = None,
    update_media_url: bool = False,
) -> Any:
    """Partially update a profile post and set last_edited."""
    from timeline.models import TimelineEvent

    if event_type is not None and event_type not in TimelineEvent.MCTEEventType.values:
        raise InvalidPrPEventTypeError(
            f"Invalid PrP event_type: '{event_type}'. "
            f"Must be one of {TimelineEvent.MCTEEventType.values}."
        )

    update_fields: list[str] = ["last_edited"]

    if content is not None:
        event.content = content
        update_fields.append("content")

    if event_type is not None:
        event.event_type = event_type
        update_fields.append("event_type")

    if update_media_url:
        event.media_url = media_url
        update_fields.append("media_url")

    event.last_edited = timezone.now()
    event.save(update_fields=update_fields)
    return event


def soft_delete_prp_event(*, event: Any) -> None:
    """Soft-delete a profile post by setting is_deleted=True."""
    event.is_deleted = True
    event.save(update_fields=["is_deleted"])


def list_community_feed_events(
    *,
    community_tag: Any,
    offset: int,
    limit: int,
    event_type: str | None = None,
) -> dict[str, Any]:
    """Return paginated community feed events for a community tag.

    Feed includes all non-deleted CoP events scoped to the given community_id,
    ordered newest-first by created_at then effective last update tie-breaker.
    """
    from timeline.models import TimelineEvent

    queryset = (
        TimelineEvent.objects.filter(
            community_id=community_tag.id,
            category=TimelineEvent.Category.COP,
            is_deleted=False,
        )
        .select_related("author")
        .annotate(effective_last_update=Coalesce("last_edited", "created_at"))
        .order_by("-created_at", "-effective_last_update", "-source_id")
    )

    if event_type is not None:
        queryset = queryset.filter(event_type=event_type)

    total_count = queryset.count()
    events = list(queryset[offset : offset + limit])

    return {
        "count": total_count,
        "offset": offset,
        "limit": limit,
        "results": events,
    }


def create_cop_event(
    *,
    author_profile: Profile,
    community_tag: Any,
    event_type: str,
    content: str = "",
    media_url: str | None = None,
    show_on_profile: bool = False,
    timestamp: Any | None = None,
    tagged_users: list[str] | None = None,
) -> Any:
    """Create and persist a community post (CoP).

    If timestamp is omitted, event timestamp is aligned with created_at.

    Args:
        author_profile: The Profile of the CoP author.
        community_tag: The CommunityTag where the CoP is posted.
        event_type: Type of event (must be valid TimelineEvent.MCTEEventType).
        content: The post content text.
        media_url: Optional URL to media associated with the post.
        show_on_profile: Whether to show this CoP on the author's profile.
        timestamp: Optional custom timestamp (defaults to creation time).
        tagged_users: List of user IDs to tag (will be validated and stored with snapshots).

    Returns:
        The created TimelineEvent object.

    Raises:
        InvalidCoPEventTypeError: If event_type is invalid.
        ValidationError: If tagged_users validation fails.
    """
    from timeline.models import TimelineEvent

    if event_type not in TimelineEvent.MCTEEventType.values:
        raise InvalidCoPEventTypeError(
            f"Invalid CoP event_type: '{event_type}'. "
            f"Must be one of {TimelineEvent.MCTEEventType.values}."
        )

    # Validate and build tagged users list
    validated_tagged_users = validate_tagged_users_list(
        author=author_profile,
        tagged_user_ids=tagged_users,
        community_id=str(community_tag.id),
        previous_tagged_user_ids=None,
    )

    # Build payload with community name and tagged users
    payload = {
        "community_name": community_tag.name,
        "tagged_users": validated_tagged_users,
    }

    event = TimelineEvent.objects.create(
        source_id=f"cop:{uuid.uuid4()}",
        category=TimelineEvent.Category.COP,
        event_type=event_type,
        author=author_profile,
        community_id=community_tag.id,
        content=content,
        media_url=media_url,
        show_on_profile=show_on_profile,
        timestamp=timestamp if timestamp is not None else timezone.now(),
        payload=payload,
    )

    if timestamp is None:
        event.timestamp = event.created_at
        event.save(update_fields=["timestamp"])

    return event


def edit_cop_event(
    *,
    event: Any,
    content: str | None = None,
    event_type: str | None = None,
    media_url: str | None = None,
    show_on_profile: bool | None = None,
    update_media_url: bool = False,
    tagged_users: list[str] | None = None,
) -> Any:
    """Partially update a community post and set last_edited.

    When tagged_users is provided, applies merge logic:
    - New tags must be currently allowed (mentorship/community member)
    - Previously tagged users remain tagged even if now unallowed
    - (per requirements for backward compatibility)

    Args:
        event: The TimelineEvent to update.
        content: New content text (if provided).
        event_type: New event type (if provided).
        media_url: New media URL (if provided).
        show_on_profile: New visibility setting (if provided).
        update_media_url: Whether to actually update media_url.
        tagged_users: New list of user IDs to tag (None = don't change).

    Returns:
        The updated TimelineEvent object.

    Raises:
        InvalidCoPEventTypeError: If event_type is invalid.
        ValidationError: If tagged_users validation fails.
    """
    from timeline.models import TimelineEvent

    if event_type is not None and event_type not in TimelineEvent.MCTEEventType.values:
        raise InvalidCoPEventTypeError(
            f"Invalid CoP event_type: '{event_type}'. "
            f"Must be one of {TimelineEvent.MCTEEventType.values}."
        )

    update_fields: list[str] = ["last_edited"]

    if content is not None:
        event.content = content
        update_fields.append("content")

    if event_type is not None:
        event.event_type = event_type
        update_fields.append("event_type")

    if update_media_url:
        event.media_url = media_url
        update_fields.append("media_url")

    if show_on_profile is not None:
        event.show_on_profile = show_on_profile
        update_fields.append("show_on_profile")

    # Handle tagged_users with merge logic
    if tagged_users is not None:
        # Get previous tagged users from payload
        previous_payload = event.payload or {}
        previous_tagged_users = previous_payload.get("tagged_users", [])
        previous_tagged_user_ids = [tag["user_id"] for tag in previous_tagged_users]

        # Validate and build new tagged users list (with merge logic)
        validated_tagged_users = validate_tagged_users_list(
            author=event.author,
            tagged_user_ids=tagged_users,
            community_id=str(event.community_id) if event.community_id else None,
            previous_tagged_user_ids=previous_tagged_user_ids,
        )

        # Update payload with new tagged_users
        if event.payload is None:
            event.payload = {}
        event.payload["tagged_users"] = validated_tagged_users
        update_fields.append("payload")

    event.last_edited = timezone.now()
    event.save(update_fields=update_fields)
    return event


def soft_delete_cop_event(*, event: Any) -> None:
    """Soft-delete a community post by setting is_deleted=True."""
    event.is_deleted = True
    event.save(update_fields=["is_deleted"])
