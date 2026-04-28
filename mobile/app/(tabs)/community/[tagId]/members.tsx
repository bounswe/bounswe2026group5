import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  useCommunityTagDetailQuery,
  useCommunityTagMembersQuery,
} from "@/lib/queries/communityTags";

const PAGE_SIZE = 20;

function formatMemberCount(count: number) {
  if (count === 1) {
    return "1 member";
  }
  return `${count} members`;
}

export default function CommunityMembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    tagId?: string | string[];
    from?: string | string[];
  }>();
  const tagId = Array.isArray(params.tagId) ? params.tagId[0] : params.tagId;
  const source = Array.isArray(params.from) ? params.from[0] : params.from;
  const [page, setPage] = useState(1);

  const detailQuery = useCommunityTagDetailQuery(tagId);
  const membersQuery = useCommunityTagMembersQuery(
    { tagId: tagId ?? "", page: 1, pageSize: PAGE_SIZE * page },
    Boolean(tagId),
  );
  const tag = detailQuery.data;
  const members = membersQuery.data?.results ?? [];
  const totalCount = membersQuery.data?.count ?? tag?.member_count ?? 0;
  const hasMore = members.length < totalCount;

  const goBackToCommunity = () => {
    if (!tagId) {
      router.replace("/(tabs)/community");
      return;
    }
    const nextSource = source === "discover" ? "discover" : "community";
    router.replace(
      `/(tabs)/community/${encodeURIComponent(tagId)}?from=${nextSource}`,
    );
  };

  const openMemberProfile = (username: string) => {
    router.push(`/user/${encodeURIComponent(username)}`);
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <TouchableOpacity
            testID="community-members-back-button"
            onPress={goBackToCommunity}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          >
            <Ionicons name="chevron-back" size={20} color="#2f7d68" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark"
              numberOfLines={1}
            >
              Members
            </Text>
            {tag ? (
              <Text
                className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark"
                numberOfLines={1}
              >
                {tag.name}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {!tagId ? (
          <ErrorBanner
            title="Community unavailable"
            message="Missing community id."
          />
        ) : membersQuery.isLoading && page === 1 ? (
          <View testID="community-members-loading" className="py-10 items-center">
            <ActivityIndicator />
            <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
              Loading members...
            </Text>
          </View>
        ) : membersQuery.isError ? (
          <ErrorBanner
            title="Could not load members"
            message="Members are temporarily unavailable."
          />
        ) : members.length === 0 ? (
          <View testID="community-members-empty" className="py-8">
            <Text className="text-on-surface-soft dark:text-on-surface-soft-dark text-sm">
              No visible members yet.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-3 text-sm font-semibold text-primary dark:text-primary-dim">
              {formatMemberCount(totalCount)}
            </Text>
            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                testID={`community-member-${member.username}`}
                activeOpacity={0.78}
                onPress={() => openMemberProfile(member.username)}
                className="py-4 border-b border-divider dark:border-divider-dark"
              >
                <Text className="font-semibold text-on-surface dark:text-on-surface-dark">
                  {member.full_name || member.username}
                </Text>
                {member.title ? (
                  <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark mt-1">
                    {member.title}
                  </Text>
                ) : null}
                {member.skills?.length ? (
                  <Text
                    className="text-xs text-on-surface-muted dark:text-on-surface-muted-dark mt-2"
                    numberOfLines={1}
                  >
                    {member.skills.slice(0, 4).join(" • ")}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}

            {hasMore ? (
              <TouchableOpacity
                testID="community-members-load-more"
                activeOpacity={0.9}
                onPress={() => setPage((currentPage) => currentPage + 1)}
                disabled={membersQuery.isFetching}
                className="bg-primary py-3 rounded-xl items-center mt-4"
              >
                <Text className="text-white font-semibold">
                  {membersQuery.isFetching ? "Loading..." : "Load More"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
