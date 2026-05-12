import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfilePostCard } from "@/components/profile/ProfilePostCard";
import { ProfilePostEditSheet } from "@/components/profile/ProfilePostEditSheet";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuthStore } from "@/lib/auth/store";
import {
  useDeleteCommunityPostMutation,
  useUpdateCommunityPostMutation,
} from "@/lib/queries/communityPosts";
import {
  useCommunityTaggableUsersQuery,
  useMyCommunityTagsQuery,
} from "@/lib/queries/communityTags";
import {
  type ProfilePost,
  useDeleteProfilePostMutation,
  useProfilePostsQuery,
  useUpdateProfilePostMutation,
} from "@/lib/queries/profile";

const PAGE_SIZE = 20;

/**
 * Full paginated posts list for own profile.
 * Accessible at /profile/posts.
 * Back button uses router.back() so it returns to the exact previous screen.
 */
export default function OwnPostsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const myCommunitiesQuery = useMyCommunityTagsQuery(currentUsername);
  const updateProfilePostMutation =
    useUpdateProfilePostMutation(currentUsername);
  const deleteProfilePostMutation =
    useDeleteProfilePostMutation(currentUsername);
  const updateCommunityPostMutation =
    useUpdateCommunityPostMutation(currentUsername);
  const deleteCommunityPostMutation =
    useDeleteCommunityPostMutation(currentUsername);

  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<ProfilePost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const selectedCommunityPostTagId =
    selectedPost?.category === "CoP" ? selectedPost.community_id : null;
  const taggableUsersQuery = useCommunityTaggableUsersQuery(
    selectedCommunityPostTagId ?? undefined,
    Boolean(selectedCommunityPostTagId),
  );

  const postsQuery = useProfilePostsQuery(currentUsername, {
    limit: PAGE_SIZE,
    offset,
  });

  // Accumulate pages
  React.useEffect(() => {
    if (!postsQuery.data) {
      return;
    }
    if (offset === 0) {
      setAllPosts(postsQuery.data.results);
    } else {
      setAllPosts((prev) => [...prev, ...postsQuery.data!.results]);
    }
  }, [postsQuery.data, offset]);

  const totalCount = postsQuery.data?.count ?? 0;
  const hasMore = allPosts.length < totalCount;
  const communityLabelsById = React.useMemo(
    () =>
      Object.fromEntries(
        (myCommunitiesQuery.data ?? []).map((tag) => [tag.id, tag.name]),
      ) as Record<string, string>,
    [myCommunitiesQuery.data],
  );

  const handleLoadMore = () => {
    if (!postsQuery.isFetching && hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
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
      setActionError(null);

      if (post.category === "PrP") {
        const updatedPost = await updateProfilePostMutation.mutateAsync({
          eventId: post.id,
          content: payload.content,
          event_type: payload.event_type,
        });
        setAllPosts((previousPosts) =>
          previousPosts.map((item) =>
            item.id === updatedPost.id ? updatedPost : item,
          ),
        );
      } else if (post.category === "CoP" && post.community_id) {
        const updatedPost = await updateCommunityPostMutation.mutateAsync({
          tagId: post.community_id,
          eventId: post.id,
          content: payload.content,
          event_type: payload.event_type,
          show_on_profile: payload.show_on_profile,
          tagged_users: payload.tagged_users,
        });
        setAllPosts((previousPosts) =>
          previousPosts.map((item) =>
            item.id === updatedPost.id ? updatedPost : item,
          ),
        );
      }

      setSelectedPost(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update post.",
      );
    }
  };

  const handleDeletePost = async (post: ProfilePost) => {
    try {
      setActionError(null);

      if (post.category === "PrP") {
        await deleteProfilePostMutation.mutateAsync({ eventId: post.id });
      } else if (post.category === "CoP" && post.community_id) {
        await deleteCommunityPostMutation.mutateAsync({
          tagId: post.community_id,
          eventId: post.id,
          show_on_profile: post.show_on_profile,
        });
      }

      setAllPosts((previousPosts) =>
        previousPosts.filter((item) => item.id !== post.id),
      );
      setSelectedPost(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete post.",
      );
    }
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Header */}
      <View
        className="bg-surface-card dark:bg-surface-card-dark border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <TouchableOpacity
            testID="posts-back-button"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          >
            <Ionicons name="chevron-back" size={20} color="#2f7d68" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Posts
          </Text>
        </View>
      </View>

      {/* Content */}
      {postsQuery.isLoading && offset === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
            Loading posts…
          </Text>
        </View>
      ) : postsQuery.isError ? (
        <View className="flex-1 px-4 pt-6">
          <ErrorBanner
            title="Could not load posts"
            message="Please try again in a moment."
          />
        </View>
      ) : (
        <FlatList
          data={allPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Ionicons
                name="document-text-outline"
                size={40}
                color="#9ca3af"
              />
              <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark text-sm">
                No posts yet.
              </Text>
            </View>
          }
          ListHeaderComponent={
            actionError ? (
              <View className="mb-4">
                <ErrorBanner message={actionError} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ProfilePostCard
              post={item}
              expanded
              canManage={item.category === "PrP" || item.category === "CoP"}
              communityLabel={
                item.community_id
                  ? communityLabelsById[item.community_id]
                  : undefined
              }
              onEdit={setSelectedPost}
              onCommunityPress={(communityId) =>
                router.push(
                  `/(tabs)/community/${encodeURIComponent(communityId)}?from=profile`,
                )
              }
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            postsQuery.isFetching && offset > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}
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
