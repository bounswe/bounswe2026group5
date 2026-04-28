"""URL routes for profiles app."""

from django.urls import path

from .views import (
    AvailabilitySlotBookAPIView,
    AvailabilitySlotListCreateAPIView,
    CommunityTagDetailAPIView,
    CommunityTagJoinAPIView,
    CommunityTagLeaveAPIView,
    CommunityTagListCreateAPIView,
    PopularTagsListAPIView,
    CommunityTagMembersListAPIView,
    MentorPublicAverageRatingAPIView,
    MyAvailabilitySlotDetailAPIView,
    MyAvailabilitySlotListCreateAPIView,
    MyTagsListAPIView,
    PopularMentorsListAPIView,
    ProfileByUsernameAPIView,
    ProfileReviewsByUsernameAPIView,
    ProfileMeAPIView,
    ProfileUsernameUpdateAPIView,
    PublicMentorProfilesSearchListAPIView,
    RecentlyAddedMentorsListAPIView,
    SkillListAPIView,
)

urlpatterns = [
    path("", PublicMentorProfilesSearchListAPIView.as_view(), name="mentor-profiles-search"),
    path("me/", ProfileMeAPIView.as_view(), name="profile-me"),
    path("me/username/", ProfileUsernameUpdateAPIView.as_view(), name="profile-me-username"),
    path(
        "me/availability-slots/",
        MyAvailabilitySlotListCreateAPIView.as_view(),
        name="availability-slot-me-list-create",
    ),
    path(
        "me/availability-slots/<uuid:slot_id>/",
        MyAvailabilitySlotDetailAPIView.as_view(),
        name="availability-slot-me-detail",
    ),
    path("skills/", SkillListAPIView.as_view(), name="skill-list"),
    path(
        "recently-added/",
        RecentlyAddedMentorsListAPIView.as_view(),
        name="mentor-recently-added",
    ),
    path("popular/", PopularMentorsListAPIView.as_view(), name="mentor-popular"),
    path(
        "<str:username>/availability-slots/",
        AvailabilitySlotListCreateAPIView.as_view(),
        name="availability-slot-list-create",
    ),
    path(
        "<str:username>/availability-slots/<uuid:slot_id>/book/",
        AvailabilitySlotBookAPIView.as_view(),
        name="availability-slot-book",
    ),
    path(
        "<str:username>/rating/",
        MentorPublicAverageRatingAPIView.as_view(),
        name="mentor-public-rating",
    ),
    path(
        "<str:username>/reviews/",
        ProfileReviewsByUsernameAPIView.as_view(),
        name="profile-reviews",
    ),
    # Community Tags
    path("tags/", CommunityTagListCreateAPIView.as_view(), name="community-tag-list-create"),
    path("tags/popular/", PopularTagsListAPIView.as_view(), name="community-tag-popular"),
    path(
        "tags/<uuid:tag_id>/",
        CommunityTagDetailAPIView.as_view(),
        name="community-tag-detail",
    ),
    path(
        "tags/<uuid:tag_id>/join/",
        CommunityTagJoinAPIView.as_view(),
        name="community-tag-join",
    ),
    path(
        "tags/<uuid:tag_id>/leave/",
        CommunityTagLeaveAPIView.as_view(),
        name="community-tag-leave",
    ),
    path(
        "tags/<uuid:tag_id>/members/",
        CommunityTagMembersListAPIView.as_view(),
        name="community-tag-members",
    ),
    path("me/tags/", MyTagsListAPIView.as_view(), name="my-tags-list"),
    # Catch-all username route (must stay last)
    path("<str:username>/", ProfileByUsernameAPIView.as_view(), name="profile-by-username"),
]
