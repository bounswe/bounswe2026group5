import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";
import { WorkshopCard } from "@/components/community/WorkshopCard";
import { ProfilePostCard } from "@/components/profile/ProfilePostCard";
import { ProfilePostEditSheet } from "@/components/profile/ProfilePostEditSheet";
import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/ToastProvider";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import {
  useCommunityPostsQuery,
  useCreateCommunityPostMutation,
  useDeleteCommunityPostMutation,
  useUpdateCommunityPostMutation,
  type CommunityPost,
} from "@/lib/queries/communityPosts";
import {
  useCommunityTagDetailQuery,
  useCommunityTaggableUsersQuery,
  useJoinCommunityTagMutation,
  useLeaveCommunityTagMutation,
} from "@/lib/queries/communityTags";
import type { ProfilePost } from "@/lib/queries/profile";
import {
  useCommunityWorkshopsQuery,
  useCreateCommunityWorkshopMutation,
} from "@/lib/queries/workshops";

const PAGE_SIZE = 12;

function formatMemberCount(count: number) {
  if (count === 1) {
    return "1 member";
  }
  return `${count} members`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function getWorkshopCreateErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status >= 500) {
    return "Workshop creation failed on the server. The backend may still be missing the workshop migration or deployment update.";
  }

  return getErrorMessage(error, "Could not create this workshop.");
}

function getCommunityMembershipLabel(
  isMember: boolean | undefined,
  isMutating: boolean,
) {
  if (isMutating) {
    return "Updating...";
  }

  return isMember ? "Leave Community" : "Join Community";
}

export default function CommunityDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    tagId?: string | string[];
    from?: string | string[];
  }>();
  const tagId = Array.isArray(params.tagId) ? params.tagId[0] : params.tagId;
  const source = Array.isArray(params.from) ? params.from[0] : params.from;
  const currentUsername = useAuthStore((state) => state.user?.username);
  const currentUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const detailQuery = useCommunityTagDetailQuery(tagId);
  const taggableUsersQuery = useCommunityTaggableUsersQuery(
    tagId,
    Boolean(tagId && detailQuery.data?.is_member),
  );
  const joinMutation = useJoinCommunityTagMutation(currentUsername);
  const leaveMutation = useLeaveCommunityTagMutation(currentUsername);
  const createPostMutation = useCreateCommunityPostMutation(currentUsername);
  const createWorkshopMutation =
    useCreateCommunityWorkshopMutation(currentUsername);
  const tag = detailQuery.data;
  const workshopsQuery = useCommunityWorkshopsQuery(
    {
      tagId: tagId ?? "",
      limit: 12,
      offset: 0,
    },
    Boolean(tagId && tag?.is_member),
  );
  const updatePostMutation = useUpdateCommunityPostMutation(currentUsername);
  const deletePostMutation = useDeleteCommunityPostMutation(currentUsername);
  const [actionError, setActionError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  const isMutating = joinMutation.isPending || leaveMutation.isPending;
  const postsQuery = useCommunityPostsQuery(
    {
      tagId: tagId ?? "",
      limit: PAGE_SIZE,
      offset,
    },
    Boolean(tagId && tag?.is_member),
  );
  const workshops = workshopsQuery.data?.results ?? [];

  useEffect(() => {
    if (!postsQuery.data) {
      return;
    }

    if (offset === 0) {
      setPosts(postsQuery.data.results);
      return;
    }

    setPosts((previousPosts) => [...previousPosts, ...postsQuery.data.results]);
  }, [offset, postsQuery.data]);

  const totalCount = postsQuery.data?.count ?? 0;
  const hasMore = posts.length < totalCount;

  useFocusEffect(
    useCallback(
      () => () => {
        setActionError(null);
        setShowLeaveConfirmation(false);
        setSelectedPost(null);
      },
      [],
    ),
  );

  const goBackToSource = () => {
    router.replace(
      source === "discover" ? "/(tabs)/discover" : "/(tabs)/community",
    );
  };

  const openMembers = () => {
    if (!tagId) {
      return;
    }
    const nextSource = source === "discover" ? "discover" : "community";
    router.push(
      `/(tabs)/community/${encodeURIComponent(tagId)}/members?from=${nextSource}`,
    );
  };

  const openCommunityById = (communityId: string) => {
    router.push(
      `/(tabs)/community/${encodeURIComponent(communityId)}?from=community`,
    );
  };

  const updateMembership = async (action: "join" | "leave") => {
    if (!tagId || !tag) {
      return;
    }

    try {
      setActionError(null);
      if (action === "leave") {
        await leaveMutation.mutateAsync(tagId);
        toast.success(`You left ${tag.name}.`);
      } else {
        await joinMutation.mutateAsync(tagId);
        toast.success(`You joined ${tag.name}.`);
      }
      detailQuery.refetch();
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          action === "leave"
            ? "Could not leave this community."
            : "Could not join this community.",
        ),
      );
    }
  };

  const handleMembershipPress = () => {
    if (tag?.is_member) {
      setShowLeaveConfirmation(true);
      return;
    }
    void updateMembership("join");
  };

  const handleCreatePost = async (
    payload: Omit<
      Parameters<typeof createPostMutation.mutateAsync>[0],
      "tagId"
    >,
  ) => {
    if (!tagId) {
      return false;
    }

    try {
      setActionError(null);
      await createPostMutation.mutateAsync({
        tagId,
        ...payload,
      });
      toast.success(
        tag ? `Posted to ${tag.name}.` : "Posted to this community.",
      );
      setOffset(0);
      return true;
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Could not create a community post."),
      );
      return false;
    }
  };

  const handleUpdatePost = async (
    post: CommunityPost | ProfilePost,
    payload: Omit<
      Parameters<typeof updatePostMutation.mutateAsync>[0],
      "tagId" | "eventId"
    >,
  ) => {
    if (!tagId) {
      return;
    }

    try {
      setActionError(null);
      const updatedPost = await updatePostMutation.mutateAsync({
        tagId,
        eventId: post.id,
        ...payload,
      });
      setPosts((previousPosts) =>
        previousPosts.map((item) =>
          item.id === updatedPost.id ? updatedPost : item,
        ),
      );
      setSelectedPost(null);
      toast.success("Community post updated.");
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Could not update this community post."),
      );
    }
  };

  const handleCreateWorkshop = async ({
    title,
    description,
    scheduled_at,
    end_at,
    max_participants,
  }: {
    title: string;
    description?: string;
    scheduled_at: string;
    end_at: string;
    max_participants: number;
  }) => {
    if (!tagId) {
      return false;
    }

    try {
      setActionError(null);
      await createWorkshopMutation.mutateAsync({
        tagId,
        title,
        description,
        scheduled_at,
        end_at,
        max_participants,
      });
      await workshopsQuery.refetch();
      toast.success(tag ? `Workshop created in ${tag.name}.` : "Workshop created.");
      return true;
    } catch (error) {
      const message = getWorkshopCreateErrorMessage(error);
      toast.error(message, { title: "Workshop creation failed" });
      return false;
    }
  };

  const handleDeletePost = async (post: CommunityPost | ProfilePost) => {
    if (!tagId) {
      return;
    }

    try {
      setActionError(null);
      await deletePostMutation.mutateAsync({
        tagId,
        eventId: post.id,
        show_on_profile: post.show_on_profile,
      });
      setPosts((previousPosts) =>
        previousPosts.filter((item) => item.id !== post.id),
      );
      setSelectedPost(null);
      toast.success("Community post deleted.");
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Could not delete this community post."),
      );
    }
  };

  const handleLoadMore = () => {
    if (!postsQuery.isFetching && hasMore) {
      setOffset((previousOffset) => previousOffset + PAGE_SIZE);
    }
  };

  const headerContent = (
    <View>
      {actionError ? (
        <View className="mb-4">
          <ErrorBanner message={actionError} />
        </View>
      ) : null}

      <View className="mb-6 rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark">
        <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
          {tag?.name ?? "Community"}
        </Text>
        <TouchableOpacity
          testID="community-members-link"
          onPress={openMembers}
          activeOpacity={0.75}
          className="self-start mt-2"
        >
          <Text className="text-sm font-semibold text-primary dark:text-primary-dim">
            {tag ? formatMemberCount(tag.member_count) : "0 members"}
          </Text>
        </TouchableOpacity>
        {tag?.description.trim() ? (
          <Text className="mt-4 text-base leading-6 text-on-surface-soft dark:text-on-surface-soft-dark">
            {tag.description}
          </Text>
        ) : (
          <Text className="mt-4 text-sm text-on-surface-soft/80 dark:text-on-surface-soft-dark/80">
            This community does not have a description yet.
          </Text>
        )}
        <TouchableOpacity
          testID="community-membership-button"
          activeOpacity={0.9}
          disabled={isMutating}
          onPress={handleMembershipPress}
          className={`mt-5 rounded-xl py-3 items-center ${
            tag?.is_member
              ? "border border-error/60 dark:border-red-900/60"
              : "bg-primary"
          }`}
        >
          <Text
            className={`font-semibold ${
              tag?.is_member ? "text-error dark:text-red-200" : "text-white"
            }`}
          >
            {getCommunityMembershipLabel(tag?.is_member, isMutating)}
          </Text>
        </TouchableOpacity>
      </View>

      {tag?.is_member ? (
        <CommunityPostComposer
          isSubmitting={
            createPostMutation.isPending || createWorkshopMutation.isPending
          }
          isLoadingTaggableUsers={taggableUsersQuery.isLoading}
          onSubmit={handleCreatePost}
          onSubmitWorkshop={handleCreateWorkshop}
          allowWorkshopCreation={currentUsageMode === "MENTOR"}
          taggableUsers={taggableUsersQuery.data?.results ?? []}
        />
      ) : (
        <View className="mb-6 rounded-2xl border border-dashed border-divider bg-surface-card/60 px-4 py-4 dark:border-divider-dark dark:bg-surface-card-dark/60">
          <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            Join this community to create posts here.
          </Text>
        </View>
      )}

      {tag?.is_member ? (
        <View className="mb-6">
          <Text className="mb-3 text-lg font-bold text-on-surface dark:text-on-surface-dark">
            Workshops
          </Text>
          {workshopsQuery.isLoading ? (
            <View
              testID="community-detail-workshops-loading"
              className="rounded-xl border border-divider bg-surface-card p-6 items-center dark:border-divider-dark dark:bg-surface-card-dark"
            >
              <ActivityIndicator />
              <Text className="mt-3 text-sm font-medium text-on-surface-soft dark:text-on-surface-soft-dark">
                Loading workshops...
              </Text>
            </View>
          ) : workshops.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              testID="community-detail-workshops-rail"
            >
              {workshops.map((workshop) => (
                <WorkshopCard
                  key={workshop.id}
                  workshop={workshop}
                  onCommunityPress={(selectedWorkshop) =>
                    openCommunityById(selectedWorkshop.community_id)
                  }
                  onPress={(selectedWorkshop) =>
                    router.push(
                      `/(tabs)/community/${encodeURIComponent(selectedWorkshop.community_id)}/workshops/${encodeURIComponent(selectedWorkshop.id)}?from=community-detail`,
                    )
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <View
              testID="community-detail-workshops-empty"
              className="rounded-xl border border-dashed border-divider bg-surface-card/60 px-4 py-4 dark:border-divider-dark dark:bg-surface-card-dark/60"
            >
              <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
                No workshops in this community yet.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <Text className="mb-3 text-lg font-bold text-on-surface dark:text-on-surface-dark">
        Community Posts
      </Text>
    </View>
  );

  if (!tagId) {
    return (
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <View
          className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <TouchableOpacity
              testID="community-detail-back-button"
              onPress={goBackToSource}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
            >
              <Ionicons name="chevron-back" size={20} color="#2f7d68" />
            </TouchableOpacity>
            <Text
              className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark"
              numberOfLines={1}
            >
              Community
            </Text>
          </View>
        </View>
        <View className="flex-1 px-4 pt-4">
          <ErrorBanner
            title="Community unavailable"
            message="Missing community id."
          />
        </View>
      </View>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <View
          className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <TouchableOpacity
              testID="community-detail-back-button"
              onPress={goBackToSource}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
            >
              <Ionicons name="chevron-back" size={20} color="#2f7d68" />
            </TouchableOpacity>
            <Text
              className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark"
              numberOfLines={1}
            >
              Community
            </Text>
          </View>
        </View>
        <View
          testID="community-detail-loading"
          className="flex-1 items-center justify-center"
        >
          <ActivityIndicator />
          <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
            Loading community...
          </Text>
        </View>
      </View>
    );
  }

  if (detailQuery.isError || !tag) {
    return (
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <View
          className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <TouchableOpacity
              testID="community-detail-back-button"
              onPress={goBackToSource}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
            >
              <Ionicons name="chevron-back" size={20} color="#2f7d68" />
            </TouchableOpacity>
            <Text
              className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark"
              numberOfLines={1}
            >
              Community
            </Text>
          </View>
        </View>
        <View className="flex-1 px-4 pt-4">
          <ErrorBanner
            title="Could not load community"
            message="Please try again in a moment."
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <TouchableOpacity
            testID="community-detail-back-button"
            onPress={goBackToSource}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          >
            <Ionicons name="chevron-back" size={20} color="#2f7d68" />
          </TouchableOpacity>
          <Text
            className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark"
            numberOfLines={1}
          >
            Community
          </Text>
        </View>
      </View>

      <FlatList
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 140,
        }}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProfilePostCard
            post={item}
            expanded
            canManage={item.author?.username === currentUsername}
            communityLabel={tag?.name ?? null}
            mentionSourceCommunityId={tag?.id ?? null}
            onEdit={(post) => setSelectedPost(post as CommunityPost)}
            onCommunityPress={() => {
              if (tag) {
                router.push(
                  `/(tabs)/community/${encodeURIComponent(tag.id)}?from=community`,
                );
              }
            }}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={headerContent}
        ListEmptyComponent={
          postsQuery.isLoading && offset === 0 ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
              <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
                Loading posts...
              </Text>
            </View>
          ) : (
            <View className="py-12 items-center">
              <Ionicons
                name="document-text-outline"
                size={40}
                color="#9ca3af"
              />
              <Text className="mt-3 text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
                No community posts yet.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          postsQuery.isFetching && offset > 0 ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />

      <ConfirmationSheet
        visible={showLeaveConfirmation}
        title="Leave community?"
        message={
          tag
            ? `You will stop seeing ${tag.name} in Your Communities.`
            : "You will stop seeing this community in Your Communities."
        }
        confirmLabel="Leave Community"
        cancelLabel="Stay Joined"
        variant="destructive"
        isConfirming={leaveMutation.isPending}
        onCancel={() => setShowLeaveConfirmation(false)}
        onConfirm={async () => {
          await updateMembership("leave");
          setShowLeaveConfirmation(false);
        }}
      />

      <ProfilePostEditSheet
        post={selectedPost}
        isDeleting={deletePostMutation.isPending}
        isLoadingTaggableUsers={taggableUsersQuery.isLoading}
        isSaving={updatePostMutation.isPending}
        onClose={() => setSelectedPost(null)}
        onDelete={handleDeletePost}
        onSave={handleUpdatePost}
        taggableUsers={taggableUsersQuery.data?.results ?? []}
      />
    </View>
  );
}
