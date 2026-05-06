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

import { TimelineEventComposer } from "@/components/timeline/TimelineEventComposer";
import { TimelineEventEditSheet } from "@/components/timeline/TimelineEventEditSheet";
import { TimelineEventList } from "@/components/timeline/TimelineEventList";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthStore } from "@/lib/auth/store";
import {
  useCreateTimelineEventMutation,
  useDeleteTimelineEventMutation,
  useMatchJourneyQuery,
  useUpdateTimelineEventMutation,
  type MCTEEventType,
  type TimelineEvent,
} from "@/lib/queries/mentorship";

function getParamValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function MatchJourneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = getParamValue(params.matchId);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const journeyQuery = useMatchJourneyQuery(matchId);
  const createEventMutation = useCreateTimelineEventMutation(currentUsername);
  const updateEventMutation = useUpdateTimelineEventMutation(currentUsername);
  const deleteEventMutation = useDeleteTimelineEventMutation(currentUsername);

  const getActionErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message.trim() ? error.message : fallback;

  const handleCreateEvent = async (payload: {
    event_type: MCTEEventType;
    content: string;
    media_url?: string | null;
    show_on_profile: boolean;
  }) => {
    if (!matchId) {
      return;
    }

    try {
      await createEventMutation.mutateAsync({
        matchId,
        ...payload,
      });
      setComposerOpen(false);
      toast.success("Milestone added.");
      return true;
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          "Could not add milestone. The timeline API may be temporarily unavailable.",
        ),
      );
      return false;
    }
  };

  const handleUpdateEvent = async (
    event: TimelineEvent,
    payload: {
      content: string;
      media_url?: string | null;
      show_on_profile: boolean;
    },
  ) => {
    if (!matchId) {
      return;
    }

    try {
      await updateEventMutation.mutateAsync({
        matchId,
        eventId: event.id,
        content: payload.content,
        media_url: payload.media_url,
        show_on_profile: payload.show_on_profile,
      });
      setSelectedEvent(null);
      toast.success("Milestone updated.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          "Could not update milestone. The timeline API may be temporarily unavailable.",
        ),
      );
    }
  };

  const handleDeleteEvent = async (event: TimelineEvent) => {
    if (!matchId) {
      return;
    }

    try {
      await deleteEventMutation.mutateAsync({
        matchId,
        eventId: event.id,
        show_on_profile: event.show_on_profile,
      });
      setSelectedEvent(null);
      toast.success("Milestone deleted.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          "Could not delete milestone. The timeline API may be temporarily unavailable.",
        ),
      );
    }
  };

  const toggleExpandedEvent = (eventId: string) => {
    setExpandedEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <TouchableOpacity
            testID="journey-back-button"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          >
            <Ionicons name="chevron-back" size={20} color="#2f7d68" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
              Journey
            </Text>
            <Text
              className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark"
              numberOfLines={1}
            >
              Private mentorship timeline
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {!matchId ? (
          <ErrorBanner
            title="Journey unavailable"
            message="Missing mentorship match id."
          />
        ) : (
          <>
            {journeyQuery.isLoading ? (
              <View testID="journey-loading" className="py-12 items-center">
                <ActivityIndicator />
                <Text className="mt-3 text-on-surface-soft dark:text-on-surface-soft-dark">
                  Loading journey...
                </Text>
              </View>
            ) : journeyQuery.isError ? (
              <ErrorBanner
                title="Could not load journey"
                message={
                  journeyQuery.error instanceof Error
                    ? journeyQuery.error.message
                    : "Journey events are temporarily unavailable."
                }
              />
            ) : (
              <TimelineEventList
                events={journeyQuery.data?.results ?? []}
                expandedEventIds={expandedEventIds}
                currentUsername={currentUsername}
                onEditEvent={setSelectedEvent}
                onToggleEvent={toggleExpandedEvent}
              />
            )}
          </>
        )}
      </ScrollView>

      {matchId ? (
        <TouchableOpacity
          testID="timeline-open-composer"
          activeOpacity={0.9}
          onPress={() => setComposerOpen(true)}
          className="absolute bottom-7 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg dark:bg-primary-dim"
        >
          <Ionicons name="create-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      ) : null}

      <TimelineEventComposer
        visible={isComposerOpen}
        isSubmitting={createEventMutation.isPending}
        onClose={() => setComposerOpen(false)}
        onSubmit={handleCreateEvent}
      />

      <TimelineEventEditSheet
        event={selectedEvent}
        isSaving={updateEventMutation.isPending}
        isDeleting={deleteEventMutation.isPending}
        onClose={() => setSelectedEvent(null)}
        onDelete={handleDeleteEvent}
        onSave={handleUpdateEvent}
      />
    </View>
  );
}
