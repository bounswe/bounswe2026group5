import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessCard } from "@/components/ui/SuccessCard";
import { useAuthStore } from "@/lib/auth/store";
import {
  useCommunityTagDetailQuery,
  useJoinCommunityTagMutation,
  useLeaveCommunityTagMutation,
} from "@/lib/queries/communityTags";
import { useState } from "react";

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

export default function CommunityDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    tagId?: string | string[];
    from?: string | string[];
  }>();
  const tagId = Array.isArray(params.tagId) ? params.tagId[0] : params.tagId;
  const source = Array.isArray(params.from) ? params.from[0] : params.from;
  const currentUsername = useAuthStore((state) => state.user?.username);
  const detailQuery = useCommunityTagDetailQuery(tagId);
  const joinMutation = useJoinCommunityTagMutation(currentUsername);
  const leaveMutation = useLeaveCommunityTagMutation(currentUsername);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  const tag = detailQuery.data;
  const isMutating = joinMutation.isPending || leaveMutation.isPending;

  const goBackToSource = () => {
    router.replace(source === "discover" ? "/(tabs)/discover" : "/(tabs)/community");
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

  const updateMembership = async (action: "join" | "leave") => {
    if (!tagId || !tag) {
      return;
    }

    try {
      setActionError(null);
      setSuccessMessage(null);
      if (action === "leave") {
        await leaveMutation.mutateAsync(tagId);
        setSuccessMessage(`You left ${tag.name}.`);
      } else {
        await joinMutation.mutateAsync(tagId);
        setSuccessMessage(`You joined ${tag.name}.`);
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
        ) : detailQuery.isLoading ? (
          <View testID="community-detail-loading" className="py-10 items-center">
            <ActivityIndicator />
            <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
              Loading community...
            </Text>
          </View>
        ) : detailQuery.isError || !tag ? (
          <ErrorBanner
            title="Could not load community"
            message="Please try again in a moment."
          />
        ) : (
          <>
            {successMessage ? (
              <View className="mb-4">
                <SuccessCard message={successMessage} />
              </View>
            ) : null}

            {actionError ? (
              <View className="mb-4">
                <ErrorBanner message={actionError} />
              </View>
            ) : null}

            <View className="mb-6">
              <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
                {tag.name}
              </Text>
              <TouchableOpacity
                testID="community-members-link"
                onPress={openMembers}
                activeOpacity={0.75}
                className="self-start mt-2"
              >
                <Text className="text-sm font-semibold text-primary dark:text-primary-dim">
                  {formatMemberCount(tag.member_count)}
                </Text>
              </TouchableOpacity>
              {tag.description.trim() ? (
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
                    tag.is_member
                    ? "border border-error/60 dark:border-red-900/60"
                    : "bg-primary"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    tag.is_member
                      ? "text-error dark:text-red-200"
                      : "text-white"
                  }`}
                >
                  {isMutating
                    ? "Updating..."
                    : tag.is_member
                      ? "Leave Community"
                      : "Join Community"}
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark mb-3">
                Feed
              </Text>
              <View className="border-l-2 border-divider dark:border-divider-dark pl-4 py-1">
                <Text className="text-sm text-on-surface-soft/80 dark:text-on-surface-soft-dark/80">
                  Community posts will appear here when the posts backend is ready.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

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
    </View>
  );
}
