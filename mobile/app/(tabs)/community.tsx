import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuthStore } from "@/lib/auth/store";
import {
  type CommunityTag,
  useMyCommunityTagsQuery,
} from "@/lib/queries/communityTags";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const plannedFeedItems = [
  "Community discussions",
  "Recommended posts",
  "Member updates",
];

function formatMemberCount(count: number) {
  if (count === 1) {
    return "1 member";
  }
  return `${count} members`;
}

function CommunityCard({ tag }: Readonly<{ tag: CommunityTag }>) {
  return (
    <View
      testID={`community-card-${tag.slug}`}
      className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark mb-3"
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
    </View>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const myCommunitiesQuery = useMyCommunityTagsQuery(currentUsername);
  const communities = myCommunitiesQuery.data ?? [];
  const hasCommunities = communities.length > 0;

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
            communities.map((tag) => <CommunityCard key={tag.id} tag={tag} />)
          ) : (
            <View testID="community-empty-state" className="py-2 pr-4">
              <Text className="text-sm leading-5 text-on-surface-soft/80 dark:text-on-surface-soft-dark/80">
                You have not joined any communities yet. Explore and join communities to see them here!
              </Text>
            </View>
          )}
        </View>

        <View>
          <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark mb-3">
            Community Feed
          </Text>
          <View className="border-l-2 border-divider dark:border-divider-dark pl-4 py-1">
            <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-dark mb-2">
              {hasCommunities
                ? "Posts from your communities will appear here"
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
        </View>
      </ScrollView>
    </View>
  );
}
