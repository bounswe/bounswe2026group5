import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";
import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";
import {
  EditProfileModal,
  type SaveProfileData,
  type UserProfileData,
} from "@/components/profile/EditProfileModal";
import { EditSkillsModal } from "@/components/profile/EditSkillsModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfilePostComposer } from "@/components/profile/ProfilePostComposer";
import { ProfilePostEditSheet } from "@/components/profile/ProfilePostEditSheet";
import { ProfilePostsPreview } from "@/components/profile/ProfilePostsPreview";
import { ProfileReviews } from "@/components/profile/ProfileReviews";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { API_BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/lib/auth/store";
import { useProfileVisibilityStore } from "@/lib/profile/preferences";
import {
  useDeleteCommunityPostMutation,
  useUpdateCommunityPostMutation,
} from "@/lib/queries/communityPosts";
import {
  type CommunityTag,
  useMyCommunityTagsQuery,
  useCommunityTaggableUsersQuery,
} from "@/lib/queries/communityTags";
import {
  mapAvailabilityToSchedule,
  useAvailabilitySlotsQuery,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
} from "@/lib/queries/mentorship";
import {
  type ProfileReview,
  type ProfilePost,
  useCreateProfilePostMutation,
  useDeleteProfilePostMutation,
  useProfileRatingQuery,
  useProfileReviewsQuery,
  useUpdateProfilePostMutation,
  useUpdateOwnProfileMutation,
} from "@/lib/queries/profile";
import {
  deleteProfilePicture,
  uploadProfilePicture,
} from "@/lib/queries/uploads";

const PROFILE_DEFAULTS = {
  skills: [] as string[],
};

interface OwnProfileResponse {
  full_name: string;
  bio: string;
  picture_url: string;
  hidden?: boolean;
  skills?: string[];
}

const REVIEWS_PAGE_SIZE = 6;

function isFutureOpenSlot(slot: {
  date: string;
  startTime: string;
  is_booked: boolean;
}): boolean {
  if (slot.is_booked) {
    return false;
  }

  return new Date(`${slot.date}T${slot.startTime}`) > new Date();
}

function renderSkillsSection({
  shouldShowSkills,
  isMentorMode,
  skillsTitle,
  skillsData,
  openEditModal,
  openSkillsModal,
  handleSaveSkills,
}: {
  shouldShowSkills: boolean;
  isMentorMode: boolean;
  skillsTitle: string;
  skillsData: string[];
  openEditModal: (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
    saveHandler: (s: string[]) => void,
  ) => void;
  openSkillsModal: (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
  ) => void;
  handleSaveSkills: (
    variant: "mentor" | "mentee",
    nextSkills: string[],
  ) => Promise<void>;
}) {
  if (!shouldShowSkills) {
    return null;
  }

  return (
    <View className="mb-6 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4 pt-4">
      <SkillsCloud
        title={skillsTitle}
        skills={skillsData}
        variant={isMentorMode ? "mentor" : "mentee"}
        onEdit={() =>
          openEditModal(
            skillsTitle,
            skillsData,
            isMentorMode ? "mentor" : "mentee",
            (newSkills) => {
              void handleSaveSkills(
                isMentorMode ? "mentor" : "mentee",
                newSkills,
              );
            },
          )
        }
        onViewAll={() =>
          openSkillsModal(
            skillsTitle,
            skillsData,
            isMentorMode ? "mentor" : "mentee",
          )
        }
      />
    </View>
  );
}

function renderCommunitiesSection({
  communities,
  openCommunity,
}: {
  communities: CommunityTag[] | undefined;
  openCommunity: (tag: CommunityTag) => void;
}) {
  if (!communities?.length) {
    return null;
  }

  return (
    <View className="mb-6 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark p-4">
      <Text className="mb-3 text-lg font-bold text-on-surface dark:text-on-surface-dark">
        Communities
      </Text>
      <View
        testID="profile-community-tags"
        className="flex-row flex-wrap gap-2"
      >
        {communities.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            testID={`profile-community-${tag.slug}`}
            activeOpacity={0.78}
            onPress={() => openCommunity(tag)}
            className="px-3 py-2 rounded-full border border-primary/60 bg-surface-active dark:bg-surface-active-dark"
          >
            <Text className="text-sm font-semibold text-primary dark:text-primary-dim">
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function renderPostsSection({
  currentUsername,
  onViewAll,
  onCompose,
  communityLabelsById,
  onEditPost,
  onOpenCommunity,
}: {
  currentUsername?: string;
  onViewAll: () => void;
  onCompose: () => void;
  communityLabelsById: Record<string, string>;
  onEditPost: (post: ProfilePost) => void;
  onOpenCommunity: (communityId: string) => void;
}) {
  if (!currentUsername) {
    return null;
  }

  return (
    <ProfilePostsPreview
      username={currentUsername}
      onViewAll={onViewAll}
      onCompose={onCompose}
      communityLabelsById={communityLabelsById}
      canManagePosts
      onEditPost={onEditPost}
      onOpenCommunity={onOpenCommunity}
    />
  );
}

function renderAvailabilitySection({
  isMentorMode,
  showAvailability,
  availabilityData,
  onEdit,
}: {
  isMentorMode: boolean;
  showAvailability: boolean;
  availabilityData: ReturnType<typeof mapAvailabilityToSchedule>;
  onEdit: () => void;
}) {
  if (!isMentorMode || !showAvailability) {
    return null;
  }

  return (
    <View className="mb-6 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4 pt-4">
      <AvailabilityPreview schedule={availabilityData} onEdit={onEdit} />
    </View>
  );
}

function renderReviewsSection({
  isMentorMode,
  isProfileHidden,
  shouldShowReviews,
  reviews,
  reviewsQuery,
  reviewsPage,
  onLoadMore,
}: {
  isMentorMode: boolean;
  isProfileHidden: boolean | null;
  shouldShowReviews: boolean;
  reviews: ProfileReview[];
  reviewsQuery: ReturnType<typeof useProfileReviewsQuery>;
  reviewsPage: number;
  onLoadMore: () => void;
}) {
  if (!isMentorMode) {
    return null;
  }

  return (
    <View className="mt-2 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark p-4">
      <Text className="mb-3 text-lg font-bold text-on-surface dark:text-on-surface-dark">
        Reviews
      </Text>
      {isProfileHidden === true ? (
        <View className="rounded-2xl border border-divider/20 bg-surface-card dark:bg-surface-card-dark px-4 py-4">
          <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            Public reviews appear only when your profile is visible.
          </Text>
        </View>
      ) : null}
      {isProfileHidden !== true && shouldShowReviews ? (
        <ProfileReviews
          reviews={reviews}
          isLoading={reviewsQuery.isLoading && reviewsPage === 1}
          isLoadingMore={reviewsQuery.isFetching && reviewsPage > 1}
          errorMessage={
            reviewsQuery.error instanceof Error
              ? reviewsQuery.error.message
              : null
          }
          totalCount={reviewsQuery.data?.count ?? reviews.length}
          onLoadMore={onLoadMore}
          emptyMessage="No public reviews yet. Reviews appear once privacy thresholds are met."
        />
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const availabilityQuery = useAvailabilitySlotsQuery(currentUsername || "");
  const mentorshipMatchesQuery = useMentorshipMatchesQuery(
    currentUsername || "",
  );
  const mentorshipRequestsQuery = useMentorshipRequestsQuery(
    currentUsername || "",
  );
  const updateProfileMutation = useUpdateOwnProfileMutation();
  const createProfilePostMutation =
    useCreateProfilePostMutation(currentUsername);
  const updateProfilePostMutation =
    useUpdateProfilePostMutation(currentUsername);
  const deleteProfilePostMutation =
    useDeleteProfilePostMutation(currentUsername);
  const updateCommunityPostMutation =
    useUpdateCommunityPostMutation(currentUsername);
  const deleteCommunityPostMutation =
    useDeleteCommunityPostMutation(currentUsername);
  const profileRatingQuery = useProfileRatingQuery(currentUsername);
  const myCommunitiesQuery = useMyCommunityTagsQuery(currentUsername);

  const showExpertise = useProfileVisibilityStore(
    (state) => state.showExpertise,
  );
  const showEagerToLearn = useProfileVisibilityStore(
    (state) => state.showEagerToLearn,
  );
  const showAvailability = useProfileVisibilityStore(
    (state) => state.showAvailability,
  );

  const [menteesCount, setMenteesCount] = useState<number>(0);
  const [skillsData, setSkillsData] = useState<string[]>(
    PROFILE_DEFAULTS.skills,
  );

  const [userData, setUserData] = useState<UserProfileData>({
    name: authUser?.username ?? "User",
    bio: "",
    pictureUrl: "",
  });

  useEffect(() => {
    setUserData((prev) => ({
      ...prev,
      name: authUser?.username ?? prev.name,
    }));
  }, [authUser?.username]);

  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isProfileHidden, setIsProfileHidden] = useState<boolean | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [isPostComposerOpen, setPostComposerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);
  const selectedCommunityPostTagId =
    selectedPost?.category === "CoP" ? selectedPost.community_id : null;
  const taggableUsersQuery = useCommunityTaggableUsersQuery(
    selectedCommunityPostTagId ?? undefined,
    Boolean(selectedCommunityPostTagId),
  );

  const isMentorMode = appUsageMode === "MENTOR";
  const shouldShowSkills = isMentorMode ? showExpertise : showEagerToLearn;
  const shouldShowReviews =
    isMentorMode && isProfileHidden === false && Boolean(currentUsername);
  const skillsTitle = isMentorMode ? "Expertise" : "Eager to Learn";
  const reviewsQuery = useProfileReviewsQuery(
    currentUsername,
    reviewsPage,
    REVIEWS_PAGE_SIZE,
    shouldShowReviews,
  );

  useEffect(() => {
    let mounted = true;

    if (!currentUsername) {
      return () => {
        mounted = false;
      };
    }

    fetch(
      `${API_BASE_URL}/api/profiles/${encodeURIComponent(currentUsername)}/`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load profile.");
        }

        const payload = (await response.json()) as OwnProfileResponse;
        if (!mounted) {
          return;
        }
        setPageError(null);

        setUserData((prev) => ({
          ...prev,
          name: payload.full_name || prev.name,
          bio: payload.bio || "",
          pictureUrl: payload.picture_url || "",
        }));

        setIsProfileHidden(Boolean(payload.hidden));
        setSkillsData(payload.skills ?? []);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setIsProfileHidden(null);
        setPageError("Failed to load profile.");
      });

    return () => {
      mounted = false;
    };
  }, [currentUsername]);

  useEffect(() => {
    if (!reviewsQuery.data) {
      return;
    }

    setReviews((prev) => {
      const nextReviews =
        reviewsPage === 1
          ? reviewsQuery.data.results
          : [...prev, ...reviewsQuery.data.results];

      const isSameCollection =
        prev.length === nextReviews.length &&
        prev.every((review, index) => {
          const nextReview = nextReviews[index];
          return (
            review?.rating === nextReview?.rating &&
            review?.text === nextReview?.text &&
            review?.created_at === nextReview?.created_at
          );
        });

      return isSameCollection ? prev : nextReviews;
    });
  }, [reviewsPage, reviewsQuery.data]);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/api/profiles/skills/`, {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load skills.");
        }
        const payload = (await response.json()) as
          | { name: string }[]
          | string[];
        if (!mounted) {
          return;
        }

        const normalized = payload
          .map((skill) => (typeof skill === "string" ? skill : skill.name))
          .filter(Boolean);

        setAvailableSkills(normalized);
      })
      .catch(() => {
        if (mounted) {
          setAvailableSkills([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const availabilityData = useMemo(
    () => mapAvailabilityToSchedule(availabilityQuery.data ?? []),
    [availabilityQuery.data],
  );
  const openSlotsCount = useMemo(
    () => (availabilityQuery.data ?? []).filter(isFutureOpenSlot).length,
    [availabilityQuery.data],
  );
  const communityLabelsById = useMemo(
    () =>
      Object.fromEntries(
        (myCommunitiesQuery.data ?? []).map((tag) => [tag.id, tag.name]),
      ) as Record<string, string>,
    [myCommunitiesQuery.data],
  );

  useEffect(() => {
    if (mentorshipMatchesQuery.data) {
      const uniqueMentees = new Set(
        mentorshipMatchesQuery.data
          .filter((match) => match.is_active)
          .map((match) => match.mentee.username),
      );
      setMenteesCount(uniqueMentees.size);
    }
  }, [mentorshipMatchesQuery.data]);

  const [skillsModalConfig, setSkillsModalConfig] = useState<{
    visible: boolean;
    title: string;
    skills: string[];
    variant: "mentor" | "mentee";
  }>({ visible: false, title: "", skills: [], variant: "mentor" });

  const [editModalConfig, setEditModalConfig] = useState<{
    visible: boolean;
    title: string;
    skills: string[];
    variant: "mentor" | "mentee";
    onSave: (newSkills: string[]) => void;
  }>({
    visible: false,
    title: "",
    skills: [],
    variant: "mentor",
    onSave: () => {},
  });

  const openEditModal = (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
    saveHandler: (s: string[]) => void,
  ) => {
    setEditModalConfig({
      visible: true,
      title,
      skills,
      variant,
      onSave: saveHandler,
    });
  };

  const handleSaveProfileHeader = async (updatedData: SaveProfileData) => {
    if (!currentUsername) {
      setUserData(updatedData);
      return true;
    }

    try {
      setPageError(null);
      let pictureUrl = userData.pictureUrl ?? "";
      const response = await updateProfileMutation.mutateAsync({
        username: currentUsername,
        display_name: updatedData.name,
        bio: updatedData.bio,
        ...(updatedData.removePicture ? { picture_url: "" } : {}),
      });

      if (updatedData.pictureFile) {
        const pictureResponse = await uploadProfilePicture(
          updatedData.pictureFile,
        );
        pictureUrl = pictureResponse.picture_url;
      } else if (updatedData.removePicture) {
        const pictureResponse = await deleteProfilePicture();
        pictureUrl = pictureResponse.picture_url;
      }

      setUserData({
        name: response.display_name || updatedData.name,
        bio: response.bio || updatedData.bio,
        pictureUrl,
      });
      return true;
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not update profile details.",
      );
      return false;
    }
  };

  const handleSaveSkills = async (
    variant: "mentor" | "mentee",
    nextSkills: string[],
  ) => {
    setSkillsData(nextSkills);

    if (!currentUsername) {
      return;
    }

    try {
      setPageError(null);
      await updateProfileMutation.mutateAsync({
        username: currentUsername,
        skills: nextSkills,
      });
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not update skills.",
      );
    }
  };

  const openCommunity = (tag: CommunityTag) => {
    router.push(
      `/(tabs)/community/${encodeURIComponent(tag.id)}?from=community`,
    );
  };

  const handleSavePost = async (
    post: ProfilePost,
    payload: {
      content: string;
      event_type: ProfilePost["event_type"];
      show_on_profile?: boolean;
      tagged_users?: string[];
    },
  ) => {
    try {
      setPageError(null);

      if (post.category === "PrP") {
        await updateProfilePostMutation.mutateAsync({
          eventId: post.id,
          content: payload.content,
          event_type: payload.event_type,
        });
      } else if (post.category === "CoP" && post.community_id) {
        await updateCommunityPostMutation.mutateAsync({
          tagId: post.community_id,
          eventId: post.id,
          content: payload.content,
          event_type: payload.event_type,
          show_on_profile: payload.show_on_profile,
          tagged_users: payload.tagged_users,
        });
      }

      setSelectedPost(null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not update post.",
      );
    }
  };

  const handleDeletePost = async (post: ProfilePost) => {
    try {
      setPageError(null);

      if (post.category === "PrP") {
        await deleteProfilePostMutation.mutateAsync({ eventId: post.id });
      } else if (post.category === "CoP" && post.community_id) {
        await deleteCommunityPostMutation.mutateAsync({
          tagId: post.community_id,
          eventId: post.id,
          show_on_profile: post.show_on_profile,
        });
      }

      setSelectedPost(null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Could not delete post.",
      );
    }
  };

  const openSkillsModal = (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
  ) => {
    setSkillsModalConfig({ visible: true, title, skills, variant });
  };

  const normalizedRating = Number.parseFloat(
    profileRatingQuery.data?.average_rating ?? "0",
  );
  const rating = Number.isFinite(normalizedRating) ? normalizedRating : 0;
  const reviewCount = profileRatingQuery.data?.review_count ?? 0;

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Profile
          </Text>
          <View className="flex-row items-center gap-4">
            <NotificationBell />
            <TouchableOpacity
              testID="settings-button"
              onPress={() => router.push("/settings" as any)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {pageError ? (
          <View className="px-4 pt-4">
            <ErrorBanner message={pageError} />
          </View>
        ) : null}

        <ProfileHeader
          name={userData.name}
          bio={userData.bio}
          reviewCount={reviewCount}
          rating={rating}
          openSlots={isMentorMode ? openSlotsCount : 0}
          menteesHelped={isMentorMode ? menteesCount : 0}
          showStats={isMentorMode}
          showRating={isMentorMode}
          showMenteesHelped={isMentorMode}
          imageUrl={userData.pictureUrl || undefined}
          onEdit={() => setEditProfileModalOpen(true)}
        />

        <View className="px-4 mt-4">
          {renderSkillsSection({
            shouldShowSkills,
            isMentorMode,
            skillsTitle,
            skillsData,
            openEditModal,
            openSkillsModal,
            handleSaveSkills,
          })}

          {renderCommunitiesSection({
            communities: myCommunitiesQuery.data,
            openCommunity,
          })}

          {renderPostsSection({
            currentUsername,
            onViewAll: () => router.push("/(tabs)/profile/posts" as any),
            onCompose: () => setPostComposerOpen(true),
            communityLabelsById,
            onEditPost: setSelectedPost,
            onOpenCommunity: (communityId) =>
              router.push(
                `/(tabs)/community/${encodeURIComponent(communityId)}?from=profile`,
              ),
          })}

          {renderAvailabilitySection({
            isMentorMode,
            showAvailability,
            availabilityData,
            onEdit: () => setAvailabilityModalOpen(true),
          })}

          {renderReviewsSection({
            isMentorMode,
            isProfileHidden,
            shouldShowReviews,
            reviews,
            reviewsQuery,
            reviewsPage,
            onLoadMore: () => setReviewsPage((prev) => prev + 1),
          })}
        </View>
      </ScrollView>

      <ViewAllSkillsModal
        visible={skillsModalConfig.visible}
        title={skillsModalConfig.title}
        skills={skillsModalConfig.skills}
        variant={skillsModalConfig.variant}
        onClose={() =>
          setSkillsModalConfig((prev) => ({ ...prev, visible: false }))
        }
      />
      <EditSkillsModal
        visible={editModalConfig.visible}
        title={editModalConfig.title}
        initialSkills={editModalConfig.skills}
        variant={editModalConfig.variant}
        availableSkills={availableSkills}
        onSave={editModalConfig.onSave}
        onClose={() =>
          setEditModalConfig((prev) => ({ ...prev, visible: false }))
        }
      />
      <EditAvailabilityModal
        visible={isAvailabilityModalOpen}
        username={currentUsername || ""}
        slots={availabilityQuery.data ?? []}
        requests={(mentorshipRequestsQuery.data ?? [])
          .filter((request) => request.mentor.username === currentUsername)
          .map((request) => ({
            id: request.id,
            slotId: request.slot_id,
            status: request.status,
          }))}
        onChanged={() => {
          availabilityQuery.refetch();
          mentorshipRequestsQuery.refetch();
        }}
        onClose={() => setAvailabilityModalOpen(false)}
      />
      <EditProfileModal
        visible={isEditProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        initialData={userData}
        onSave={handleSaveProfileHeader}
      />
      <ProfilePostComposer
        visible={isPostComposerOpen}
        isSubmitting={createProfilePostMutation.isPending}
        onClose={() => setPostComposerOpen(false)}
        onSubmit={async (payload) => {
          try {
            await createProfilePostMutation.mutateAsync(payload);
            return true;
          } catch (error) {
            setPageError(
              error instanceof Error ? error.message : "Could not create post.",
            );
            return false;
          }
        }}
      />
      <ProfilePostEditSheet
        post={selectedPost}
        isDeleting={
          deleteProfilePostMutation.isPending ||
          deleteCommunityPostMutation.isPending
        }
        isLoadingTaggableUsers={taggableUsersQuery.isLoading}
        isSaving={
          updateProfilePostMutation.isPending ||
          updateCommunityPostMutation.isPending
        }
        onClose={() => setSelectedPost(null)}
        onDelete={handleDeletePost}
        onSave={handleSavePost}
        taggableUsers={taggableUsersQuery.data?.results ?? []}
      />
    </View>
  );
}
