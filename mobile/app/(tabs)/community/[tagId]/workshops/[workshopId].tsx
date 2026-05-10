import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthStore } from "@/lib/auth/store";
import {
  isWorkshopActive,
  useCommunityWorkshopDetailQuery,
  useJoinCommunityWorkshopMutation,
  useLeaveCommunityWorkshopMutation,
} from "@/lib/queries/workshops";
import { ActivityIndicator, ScrollView } from "react-native";

function formatWorkshopDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatWorkshopTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startLabel = `${String(startDate.getHours()).padStart(2, "0")}:${String(
    startDate.getMinutes(),
  ).padStart(2, "0")}`;
  const endLabel = `${String(endDate.getHours()).padStart(2, "0")}:${String(
    endDate.getMinutes(),
  ).padStart(2, "0")}`;

  return `${startLabel} - ${endLabel}`;
}

function getDetailErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export default function WorkshopDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    tagId?: string | string[];
    workshopId?: string | string[];
    from?: string | string[];
  }>();
  const tagId = Array.isArray(params.tagId) ? params.tagId[0] : params.tagId;
  const workshopId = Array.isArray(params.workshopId)
    ? params.workshopId[0]
    : params.workshopId;
  const source = Array.isArray(params.from) ? params.from[0] : params.from;
  const currentUsername = useAuthStore((state) => state.user?.username);
  const detailQuery = useCommunityWorkshopDetailQuery(tagId, workshopId);
  const joinMutation = useJoinCommunityWorkshopMutation(currentUsername);
  const leaveMutation = useLeaveCommunityWorkshopMutation(currentUsername);

  const workshop = detailQuery.data;
  const isAuthor = workshop?.author?.username === currentUsername;
  const isActive = workshop ? isWorkshopActive(workshop) : false;
  const isEnrolled = workshop?.current_user_enrolled ?? false;
  const canJoin =
    Boolean(workshop) && !isAuthor && isActive && !isEnrolled && !workshop.is_full;
  const canLeave = Boolean(workshop) && !isAuthor && isActive && isEnrolled;

  const goBack = () => {
    router.replace(
      source === "community"
        ? "/(tabs)/community"
        : `/(tabs)/community/${encodeURIComponent(tagId ?? "")}?from=community`,
    );
  };

  const handleJoin = async () => {
    if (!tagId || !workshopId || !workshop) {
      return;
    }

    try {
      await joinMutation.mutateAsync({
        tagId,
        workshopId,
      });
      await detailQuery.refetch();
      toast.success(`You joined ${workshop.title}.`);
    } catch (error) {
      toast.error(
        getDetailErrorMessage(error, "Could not join this workshop."),
        { title: "Workshop join failed" },
      );
    }
  };

  const handleLeave = async () => {
    if (!tagId || !workshopId || !workshop) {
      return;
    }

    try {
      await leaveMutation.mutateAsync({
        tagId,
        workshopId,
      });
      await detailQuery.refetch();
      toast.success(`You left ${workshop.title}.`);
    } catch (error) {
      toast.error(
        getDetailErrorMessage(error, "Could not leave this workshop."),
        { title: "Workshop leave failed" },
      );
    }
  };

  if (!tagId || !workshopId) {
    return (
      <View className="flex-1 bg-surface dark:bg-surface-dark">
        <View
          className="border-b border-divider bg-surface-card shadow-sm dark:border-divider-dark dark:bg-surface-card-dark"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <TouchableOpacity
              testID="workshop-detail-back-button"
              onPress={goBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
            >
              <Ionicons name="chevron-back" size={20} color="#2f7d68" />
            </TouchableOpacity>
            <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
              Workshop
            </Text>
          </View>
        </View>
        <View className="px-4 pt-4">
          <ErrorBanner
            title="Workshop unavailable"
            message="Missing workshop details."
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="border-b border-divider bg-surface-card shadow-sm dark:border-divider-dark dark:bg-surface-card-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <TouchableOpacity
            testID="workshop-detail-back-button"
            onPress={goBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          >
            <Ionicons name="chevron-back" size={20} color="#2f7d68" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Workshop
          </Text>
        </View>
      </View>

      {detailQuery.isLoading ? (
        <View
          testID="workshop-detail-loading"
          className="flex-1 items-center justify-center"
        >
          <ActivityIndicator />
          <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
            Loading workshop...
          </Text>
        </View>
      ) : detailQuery.isError || !workshop ? (
        <View className="px-4 pt-4">
          <ErrorBanner
            title="Could not load workshop"
            message="Please try again in a moment."
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
                  {workshop.title}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-primary dark:text-primary-dim">
                  {workshop.community_name}
                </Text>
              </View>
              <View
                className={`rounded-full px-3 py-1 ${
                  isActive
                    ? "bg-primary/10 dark:bg-primary-dim/15"
                    : "bg-surface-active dark:bg-surface-active-dark"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive
                      ? "text-primary dark:text-primary-dim"
                      : "text-on-surface-soft dark:text-on-surface-soft-dark"
                  }`}
                >
                  {workshop.status === "CANCELLED"
                    ? "Cancelled"
                    : isActive
                      ? "Active"
                      : "Ended"}
                </Text>
              </View>
            </View>

            <Text className="mt-4 text-base leading-6 text-on-surface-soft dark:text-on-surface-soft-dark">
              {workshop.description.trim() || "No workshop description yet."}
            </Text>

            <View className="mt-5 gap-3">
              <View className="flex-row items-center gap-3">
                <Ionicons name="calendar-outline" size={18} color="#737686" />
                <Text className="text-sm text-on-surface dark:text-on-surface-dark">
                  {formatWorkshopDate(workshop.scheduled_at)}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Ionicons name="time-outline" size={18} color="#737686" />
                <Text className="text-sm text-on-surface dark:text-on-surface-dark">
                  {formatWorkshopTimeRange(
                    workshop.scheduled_at,
                    workshop.end_at,
                  )}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Ionicons name="people-outline" size={18} color="#737686" />
                <Text className="text-sm text-on-surface dark:text-on-surface-dark">
                  {workshop.participant_count}/{workshop.max_participants} participants
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Ionicons name="person-outline" size={18} color="#737686" />
                <Text className="text-sm text-on-surface dark:text-on-surface-dark">
                  Host: {workshop.author?.display_name ?? "Unknown"}
                </Text>
              </View>
            </View>

            {isAuthor ? (
              <View
                testID="workshop-detail-author-state"
                className="mt-5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 dark:border-primary-dim/25 dark:bg-primary-dim/10"
              >
                <Text className="text-sm font-semibold text-primary dark:text-primary-dim">
                  You are hosting this workshop.
                </Text>
              </View>
            ) : canJoin ? (
              <TouchableOpacity
                testID="workshop-detail-join-button"
                activeOpacity={0.88}
                disabled={joinMutation.isPending}
                onPress={() => {
                  void handleJoin();
                }}
                className="mt-5 rounded-xl bg-primary px-4 py-3 dark:bg-primary-dim"
              >
                <Text className="text-center text-sm font-bold text-white">
                  {joinMutation.isPending ? "Joining..." : "Join Workshop"}
                </Text>
              </TouchableOpacity>
            ) : canLeave ? (
              <TouchableOpacity
                testID="workshop-detail-leave-button"
                activeOpacity={0.88}
                disabled={leaveMutation.isPending}
                onPress={() => {
                  void handleLeave();
                }}
                className="mt-5 rounded-xl border border-error/60 px-4 py-3 dark:border-red-900/60"
              >
                <Text className="text-center text-sm font-bold text-error dark:text-red-200">
                  {leaveMutation.isPending ? "Leaving..." : "Leave Workshop"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                testID="workshop-detail-locked-state"
                className="mt-5 rounded-xl border border-divider px-4 py-3 dark:border-divider-dark"
              >
                <Text className="text-center text-sm font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  {workshop.is_full
                    ? "This workshop is already full."
                    : workshop.status === "CANCELLED"
                      ? "This workshop has been cancelled."
                      : "This workshop is no longer accepting participants."}
                </Text>
              </View>
            )}
          </View>

          {workshop.participants.length > 0 ? (
            <View className="mt-6 rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark">
              <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
                Participants
              </Text>
              <View className="mt-3 gap-3">
                {workshop.participants.map((participant) => (
                  <View
                    key={participant.id}
                    className="flex-row items-center justify-between rounded-xl bg-surface px-3 py-3 dark:bg-surface-dark"
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-dark">
                        {participant.participant.display_name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                        @{participant.participant.username}
                      </Text>
                    </View>
                    {participant.participant.username === workshop.author?.username ? (
                      <Text className="text-xs font-bold text-primary dark:text-primary-dim">
                        Host
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
