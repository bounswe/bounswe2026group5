import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { ProfilePostCard } from "@/components/profile/ProfilePostCard";
import { useProfilePostsQuery } from "@/lib/queries/profile";

interface ProfilePostsPreviewProps {
  username: string;
  onViewAll: () => void;
  onCompose?: () => void;
  communityLabelsById?: Record<string, string>;
}

/**
 * Vertical preview stack showing up to 3 profile posts.
 *
 * Data rules:
 *   - Relies on backend to return PrP + public MCTE only.
 *   - Defensively skips any AGTE category items client-side.
 *   - Defensively skips any MCTE where show_on_profile === false.
 *   - Renders nothing (null) when the post count is 0 or the request errors.
 */
export function ProfilePostsPreview({
  username,
  onViewAll,
  onCompose,
  communityLabelsById,
}: Readonly<ProfilePostsPreviewProps>) {
  const postsQuery = useProfilePostsQuery(username, { limit: 3 });

  // While loading show a subtle inline indicator
  if (postsQuery.isLoading) {
    return (
      <View className="mb-6">
        <Text className="mb-3 text-lg font-bold text-on-surface dark:text-on-surface-dark">
          Posts
        </Text>
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#4f46e5" />
        </View>
      </View>
    );
  }

  // No posts or error → render nothing; caller section is invisible
  const posts = postsQuery.data?.results ?? [];
  const totalCount = postsQuery.data?.count ?? 0;

  if (posts.length === 0) {
    return null;
  }

  return (
    <View testID="profile-posts-preview" className="mb-6">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
          Posts
        </Text>
        {onCompose ? (
          <TouchableOpacity
            testID="profile-post-compose-button"
            activeOpacity={0.8}
            onPress={onCompose}
            className="flex-row items-center gap-1 rounded-full border border-primary/50 bg-surface-card px-3 py-2 dark:border-primary-dim/50 dark:bg-surface-card-dark"
          >
            <Ionicons name="create-outline" size={14} color="#2f7d68" />
            <Text className="text-xs font-semibold text-primary dark:text-primary-dim">
              New Post
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="gap-3">
        {posts.map((post) => (
          <ProfilePostCard
            key={post.id}
            post={post}
            communityLabel={
              post.community_id
                ? communityLabelsById?.[post.community_id]
                : undefined
            }
          />
        ))}
      </View>

      {totalCount > 0 ? (
        <TouchableOpacity
          testID="view-all-posts-button"
          activeOpacity={0.75}
          onPress={onViewAll}
          className="mt-3 flex-row items-center justify-center gap-1 rounded-xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark py-3"
        >
          <Text className="text-sm font-semibold text-primary dark:text-primary-dim">
            View All
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#2f7d68" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
