import { WorkshopCard } from "@/components/community/WorkshopCard";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfilePostCard } from "@/components/profile/ProfilePostCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuthStore } from "@/lib/auth/store";
import { useMyCommunityPostsFeedQuery } from "@/lib/queries/communityPosts";
import {
  type CommunityTag,
  useMyCommunityTagsQuery,
} from "@/lib/queries/communityTags";
import { useMyCommunityWorkshopsFeedQuery } from "@/lib/queries/workshops";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRefreshControl } from "@/hooks/use-refresh-control";

const plannedFeedItems = [
  "Join communities to see their latest posts here.",
  "Posts from every community you join will be collected in this feed.",
];

function formatMemberCount(count: number) {
  if (count === 1) {
    return "1 member";
  }
  return `${count} members`;
}

function CommunityCard({
  tag,
  onPress,
}: Readonly<{ tag: CommunityTag; onPress: (tag: CommunityTag) => void }>) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(tag)}
      testID={`community-card-${tag.slug}`}
      className="w-72 bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark mr-3"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-on-surface dark:text-on-surface-dark">
            {tag.name}
          </Text>
          {tag.description.trim() ? (
            <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark mt-1">
              {tag.description}
            </Text>
          ) : null}
        </View>
        <Text className="text-xs font-semibold text-primary dark:text-primary-dim">
          {formatMemberCount(tag.member_count)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const myCommunitiesQuery = useMyCommunityTagsQuery(currentUsername);
  const communities = myCommunitiesQuery.data ?? [];
  const hasCommunities = communities.length > 0;
  const communityFeedQuery = useMyCommunityPostsFeedQuery(
    communities.map((tag) => tag.id),
    5,
    hasCommunities,
  );
  const workshopsFeedQuery = useMyCommunityWorkshopsFeedQuery(
    communities.map((tag) => tag.id),
    4,
    hasCommunities,
  );
  const communityFeedPosts = communityFeedQuery.data ?? [];
  const workshops = workshopsFeedQuery.data ?? [];
  const openCommunityById = (communityId: string) => {
    router.push(
      `/(tabs)/community/${encodeURIComponent(communityId)}?from=community`,
    );
  };
  const openCommunity = (tag: CommunityTag) => {
    openCommunityById(tag.id);
  };
  const openWorkshop = (communityId: string, workshopId: string) => {
    router.push(
      `/(tabs)/community/${encodeURIComponent(communityId)}/workshops/${encodeURIComponent(workshopId)}?from=community`,
    );
  };
  const refreshCommunity = useCallback(async () => {
    await Promise.all([
      myCommunitiesQuery.refetch(),
      communityFeedQuery.refetch(),
      workshopsFeedQuery.refetch(),
    ]);
  }, [communityFeedQuery, myCommunitiesQuery, workshopsFeedQuery]);
  const { refreshing, onRefresh } = useRefreshControl(refreshCommunity);

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Community
          </Text>
          <NotificationBell />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
              Your Communities
            </Text>
            <TouchableOpacity
              testID="discover-communities-link"
              onPress={() => router.push("/(tabs)/discover")}
            >
              <Text className="text-primary dark:text-primary-dim font-semibold text-sm">
                Find New Community
              </Text>
            </TouchableOpacity>
          </View>
          {myCommunitiesQuery.isLoading ? (
            <View
              testID="community-loading-state"
              className="bg-surface-card dark:bg-surface-card-dark p-6 rounded-xl border border-divider dark:border-divider-dark items-center justify-center"
            >
              <ActivityIndicator />
              <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium mt-3">
                Loading your communities...
              </Text>
            </View>
          ) : myCommunitiesQuery.isError ? (
            <ErrorBanner
              title="Could not load communities"
              message="Please try again in a moment."
            />
          ) : hasCommunities ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {communities.map((tag) => (
                <CommunityCard
                  key={tag.id}
                  tag={tag}
                  onPress={openCommunity}
                />
              ))}
            </ScrollView>
          ) : (
            <View testID="community-empty-state" className="py-2 pr-4">
              <Text className="text-sm leading-5 text-on-surface-soft/80 dark:text-on-surface-soft-dark/80">
                You have not joined any communities yet. Explore and join communities to see them here!
              </Text>
            </View>
          )}
          <TouchableOpacity
            testID="create-community-link"
            activeOpacity={0.88}
            onPress={() => router.push("/(tabs)/community/create")}
            className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 dark:border-primary-dim/25 dark:bg-primary-dim/10"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary dark:bg-primary-dim">
                <Text className="text-xl font-extrabold text-white">+</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-on-surface dark:text-on-surface-dark">
                  Create your own community
                </Text>
                <Text className="mt-1 text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark">
                  Start a focused space around a topic, skill, or shared goal.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
              Workshops
            </Text>
            {workshops.length > 0 ? (
              <Text className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                Across your communities
              </Text>
            ) : null}
          </View>
          {workshopsFeedQuery.isLoading ? (
            <View
              testID="community-workshops-loading"
              className="rounded-xl border border-divider bg-surface-card p-6 items-center dark:border-divider-dark dark:bg-surface-card-dark"
            >
              <ActivityIndicator />
              <Text className="mt-3 text-sm font-medium text-on-surface-soft dark:text-on-surface-soft-dark">
                Loading workshops...
              </Text>
            </View>
          ) : workshopsFeedQuery.isError ? (
            <ErrorBanner
              title="Could not load workshops"
              message="Workshops from your communities are temporarily unavailable."
            />
          ) : workshops.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              testID="community-workshops-rail"
            >
              {workshops.map((workshop) => (
                <WorkshopCard
                  key={`${workshop.community_id}-${workshop.id}`}
                  workshop={workshop}
                  onCommunityPress={(selectedWorkshop) =>
                    openCommunityById(selectedWorkshop.community_id)
                  }
                  onPress={(selectedWorkshop) =>
                    openWorkshop(
                      selectedWorkshop.community_id,
                      selectedWorkshop.id,
                    )
                  }
                />
              ))}
            </ScrollView>
          ) : (
            <View
              testID="community-workshops-empty"
              className="rounded-xl border border-dashed border-divider bg-surface-card/60 px-4 py-4 dark:border-divider-dark dark:bg-surface-card-dark/60"
            >
              <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
                No workshops are available in your communities yet.
              </Text>
            </View>
          )}
        </View>

        <View>
          <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark mb-3">
            Community Feed
          </Text>
          {communityFeedQuery.isLoading ? (
            <View
              testID="community-feed-loading"
              className="rounded-xl border border-divider bg-surface-card p-6 items-center dark:border-divider-dark dark:bg-surface-card-dark"
            >
              <ActivityIndicator />
              <Text className="mt-3 text-sm font-medium text-on-surface-soft dark:text-on-surface-soft-dark">
                Loading community posts...
              </Text>
            </View>
          ) : communityFeedQuery.isError ? (
            <ErrorBanner
              title="Could not load community feed"
              message="Posts from your communities are temporarily unavailable."
            />
          ) : communityFeedPosts.length > 0 ? (
            <View testID="community-feed-posts" className="gap-3">
              {communityFeedPosts.map((post) => (
                <ProfilePostCard
                  key={`${post.community_id}-${post.id}`}
                  post={post}
                  expanded
                  communityLabel={
                    communities.find((tag) => tag.id === post.community_id)
                      ?.name ?? null
                  }
                  onCommunityPress={(communityId) =>
                    router.push(
                      `/(tabs)/community/${encodeURIComponent(communityId)}?from=community`,
                    )
                  }
                />
              ))}
            </View>
          ) : (
            <View className="border-l-2 border-divider dark:border-divider-dark pl-4 py-1">
              <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-dark mb-2">
                {hasCommunities
                  ? "No posts in your communities yet"
                  : "Join communities to build your feed"}
              </Text>
              {plannedFeedItems.map((item) => (
                <Text
                  key={item}
                  className="text-sm text-on-surface-soft/80 dark:text-on-surface-soft-dark/80 mb-1"
                >
                  {item}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
