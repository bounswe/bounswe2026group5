"""URL routes for profiles app."""

from django.urls import path

from .views import (
    AvailabilitySlotBookAPIView,
    AvailabilitySlotListCreateAPIView,
    CommunityTagDetailAPIView,
    CommunityTagJoinAPIView,
    CommunityTagLeaveAPIView,
    CommunityTagListCreateAPIView,
    CommunityTagMembersListAPIView,
    CommunityTagPostDetailAPIView,
    CommunityTagPostsListCreateAPIView,
    CommunityTagTaggableUsersAPIView,
    CommunityTagWorkshopDetailAPIView,
    CommunityTagWorkshopJoinAPIView,
    CommunityTagWorkshopLeaveAPIView,
    CommunityTagWorkshopMyParticipationAPIView,
    CommunityTagWorkshopParticipantsListAPIView,
    CommunityTagWorkshopsListCreateAPIView,
    MentorPublicAverageRatingAPIView,
    MyAvailabilitySlotDetailAPIView,
    MyAvailabilitySlotListCreateAPIView,
    MyProfilePostDetailAPIView,
    MyProfilePostsCollectionAPIView,
    MyTagsListAPIView,
    PopularMentorsListAPIView,
    PopularTagsListAPIView,
    PostMediaUploadAPIView,
    ProfileByUsernameAPIView,
    ProfileMeAPIView,
    ProfilePictureUploadAPIView,
    ProfilePostsListAPIView,
    ProfileReviewsByUsernameAPIView,
    ProfileUsernameUpdateAPIView,
    PublicMentorProfilesSearchListAPIView,
    RecentlyAddedMentorsListAPIView,
    SkillListAPIView,
)

urlpatterns = [
    path("", PublicMentorProfilesSearchListAPIView.as_view(), name="mentor-profiles-search"),
    path("me/", ProfileMeAPIView.as_view(), name="profile-me"),
    path("me/picture/", ProfilePictureUploadAPIView.as_view(), name="profile-picture-upload"),
    path("me/uploads/", PostMediaUploadAPIView.as_view(), name="post-media-upload"),
    path("me/posts/", MyProfilePostsCollectionAPIView.as_view(), name="profile-posts-me-create"),
    path(
        "me/posts/<uuid:event_id>/",
        MyProfilePostDetailAPIView.as_view(),
        name="profile-posts-me-detail",
    ),
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
    path("<str:username>/posts/", ProfilePostsListAPIView.as_view(), name="profile-posts-list"),
    # Community Tags
    path("tags/", CommunityTagListCreateAPIView.as_view(), name="community-tag-list-create"),
    path("tags/popular/", PopularTagsListAPIView.as_view(), name="community-tag-popular"),
    path(
        "tags/<str:tag_id>/",
        CommunityTagDetailAPIView.as_view(),
        name="community-tag-detail",
    ),
    path(
        "tags/<str:tag_id>/join/",
        CommunityTagJoinAPIView.as_view(),
        name="community-tag-join",
    ),
    path(
        "tags/<str:tag_id>/leave/",
        CommunityTagLeaveAPIView.as_view(),
        name="community-tag-leave",
    ),
    path(
        "tags/<str:tag_id>/members/",
        CommunityTagMembersListAPIView.as_view(),
        name="community-tag-members",
    ),
    path(
        "tags/<uuid:tag_id>/taggable-users/",
        CommunityTagTaggableUsersAPIView.as_view(),
        name="community-tag-taggable-users",
    ),
    path(
        "tags/<uuid:tag_id>/posts/",
        CommunityTagPostsListCreateAPIView.as_view(),
        name="community-tag-posts-list-create",
    ),
    path(
        "tags/<uuid:tag_id>/posts/<uuid:event_id>/",
        CommunityTagPostDetailAPIView.as_view(),
        name="community-tag-posts-detail",
    ),
    path(
        "tags/<uuid:tag_id>/workshops/",
        CommunityTagWorkshopsListCreateAPIView.as_view(),
        name="community-tag-workshops-list-create",
    ),
    path(
        "tags/<uuid:tag_id>/workshops/<uuid:workshop_id>/",
        CommunityTagWorkshopDetailAPIView.as_view(),
        name="community-tag-workshop-detail",
    ),
    path(
        "tags/<uuid:tag_id>/workshops/<uuid:workshop_id>/participants/",
        CommunityTagWorkshopParticipantsListAPIView.as_view(),
        name="community-tag-workshop-participants-list",
    ),
    path(
        "tags/<uuid:tag_id>/workshops/<uuid:workshop_id>/join/",
        CommunityTagWorkshopJoinAPIView.as_view(),
        name="community-tag-workshop-join",
    ),
    path(
        "tags/<uuid:tag_id>/workshops/<uuid:workshop_id>/leave/",
        CommunityTagWorkshopLeaveAPIView.as_view(),
        name="community-tag-workshop-leave",
    ),
    path(
        "tags/<uuid:tag_id>/workshops/<uuid:workshop_id>/participants/me/",
        CommunityTagWorkshopMyParticipationAPIView.as_view(),
        name="community-tag-workshop-participants-me",
    ),
    path("me/tags/", MyTagsListAPIView.as_view(), name="my-tags-list"),
    # Catch-all username route (must stay last)
    path("<str:username>/", ProfileByUsernameAPIView.as_view(), name="profile-by-username"),
]
