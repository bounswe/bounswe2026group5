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
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuthStore } from "@/lib/auth/store";
import { useMyCommunityTagsQuery } from "@/lib/queries/communityTags";
import type { ProfilePost } from "@/lib/queries/profile";
import { useProfilePostsQuery } from "@/lib/queries/profile";

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

  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState<ProfilePost[]>([]);

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
          renderItem={({ item }) => (
            <ProfilePostCard
              post={item}
              expanded
              communityLabel={
                item.community_id
                  ? communityLabelsById[item.community_id]
                  : undefined
              }
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
    </View>
  );
}
