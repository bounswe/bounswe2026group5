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
  useMatchJourneyQuery,
  type TimelineEvent,
} from "@/lib/queries/mentorship";

const EVENT_LABELS: Record<string, string> = {
  request_accepted: "Request accepted",
  session_scheduled: "Session scheduled",
  session_rescheduled: "Session rescheduled",
  session_canceled: "Session canceled",
  session_completed: "Session completed",
  mentorship_ended: "Mentorship ended",
  achievement: "Achievement",
  social: "Social moment",
  progress: "Progress update",
};

const PAYLOAD_LABELS: Record<string, string> = {
  scheduled_start_at_utc: "Starts",
  scheduled_end_at_utc: "Ends",
  initial_session_start_at: "Initial session starts",
  initial_session_end_at: "Initial session ends",
  cancel_reason: "Cancel reason",
};

function getParamValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEventType(value: string): string {
  return (
    EVENT_LABELS[value] ??
    value
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatPayloadKey(value: string): string {
  if (PAYLOAD_LABELS[value]) {
    return PAYLOAD_LABELS[value];
  }

  return value
    .replace(/_utc$/u, "")
    .replace(/_at$/u, "")
    .replace(/_/gu, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPayloadIdField(key: string): boolean {
  return key === "id" || key.endsWith("_id");
}

function formatPayloadId(value: unknown): string {
  const text = formatPayloadValue(value);
  if (!text) {
    return "";
  }

  return text.length > 8 ? `Ref ${text.slice(0, 8)}` : `Ref ${text}`;
}

function isPayloadTimeField(key: string): boolean {
  return key.endsWith("_at") || key.endsWith("_at_utc");
}

function getPayloadEntries(event: TimelineEvent): [string, string][] {
  return Object.entries(event.payload)
    .map(([key, value]) => [
      isPayloadIdField(key) ? "Reference" : formatPayloadKey(key),
      isPayloadIdField(key)
        ? formatPayloadId(value)
        : isPayloadTimeField(key) && typeof value === "string"
        ? formatTimestamp(value)
        : formatPayloadValue(value),
    ] as [string, string])
    .filter(([, value]) => value.trim().length > 0)
    .slice(0, 4);
}

function TimelineEventNode({
  event,
  expanded,
  isFirst,
  isLast,
  onToggle,
}: Readonly<{
  event: TimelineEvent;
  expanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
}>) {
  const isSystemEvent = event.category === "AGTE";
  const payloadEntries = getPayloadEntries(event);
  const hasDetails =
    Boolean(event.content) ||
    Boolean(event.actor_role) ||
    payloadEntries.length > 0 ||
    event.show_on_profile;

  return (
    <View
      testID={`journey-event-${event.id}`}
      className="flex-row"
    >
      <View className="w-12 items-center">
        <View
          className={`w-0.5 flex-1 ${
            isFirst ? "bg-transparent" : "bg-divider dark:bg-divider-dark"
          }`}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggle}
          className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
            isSystemEvent
              ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
              : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          }`}
        >
          <Ionicons
            name={isSystemEvent ? "sparkles-outline" : "flag-outline"}
            size={18}
            color={isSystemEvent ? "#0369a1" : "#047857"}
          />
        </TouchableOpacity>
        <View
          className={`w-0.5 flex-1 ${
            isLast ? "bg-transparent" : "bg-divider dark:bg-divider-dark"
          }`}
        />
      </View>

      <View className="flex-1 pb-5 pl-2">
        <TouchableOpacity
          testID={`journey-event-toggle-${event.id}`}
          activeOpacity={0.82}
          onPress={onToggle}
          className="rounded-xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4 py-3"
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-extrabold text-on-surface dark:text-on-surface-dark">
                {formatEventType(event.event_type)}
              </Text>
              <Text className="mt-1 text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
                {formatTimestamp(event.timestamp)}
              </Text>
            </View>
            <View className="rounded-full bg-surface-active dark:bg-gray-800 px-2.5 py-1">
              <Text className="text-[10px] font-black uppercase text-on-surface-muted dark:text-on-surface-muted-dark">
                {isSystemEvent ? "System" : "Milestone"}
              </Text>
            </View>
          </View>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Text className="text-xs font-semibold capitalize text-primary dark:text-primary-dim">
              {event.actor_role ?? (isSystemEvent ? "System" : "Milestone")}
            </Text>
            {hasDetails ? (
              <>
                <Text className="text-xs text-on-surface-muted dark:text-on-surface-muted-dark">
                  ·
                </Text>
                <Text className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
                  {expanded ? "Hide details" : "View details"}
                </Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={13}
                  color="#737686"
                />
              </>
            ) : null}
          </View>
        </TouchableOpacity>

        {expanded && hasDetails ? (
          <View className="mt-2 rounded-xl border border-divider/70 dark:border-divider-dark bg-surface-card/80 dark:bg-surface-card-dark px-4 py-3">
            {event.content ? (
              <Text className="text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark">
                {event.content}
              </Text>
            ) : null}

            {event.actor_role ? (
              <Text className="mt-3 text-xs font-semibold capitalize text-primary dark:text-primary-dim">
                {event.actor_role}
              </Text>
            ) : null}

            {payloadEntries.length > 0 ? (
              <View className="mt-3 gap-1.5">
                {payloadEntries.map(([key, value]) => (
                  <View key={key} className="flex-row gap-2">
                    <Text className="w-28 text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark">
                      {key}
                    </Text>
                    <Text
                      className="flex-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark"
                      numberOfLines={2}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {event.show_on_profile ? (
              <View className="mt-3 self-start rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1">
                <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Shown on profile
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function MatchJourneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = getParamValue(params.matchId);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(
    () => new Set(),
  );
  const journeyQuery = useMatchJourneyQuery(matchId);
  const journeyEvents =
    journeyQuery.data?.results.filter(
      (event) => event.category === "AGTE" || event.category === "MCTE",
    ) ?? [];
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
        ) : journeyQuery.isLoading ? (
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
        ) : journeyEvents.length === 0 ? (
          <View testID="journey-empty" className="py-8">
            <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
              No journey events yet.
            </Text>
          </View>
        ) : (
          journeyEvents.map((event, index) => (
            <TimelineEventNode
              key={event.id}
              event={event}
              expanded={expandedEventIds.has(event.id)}
              isFirst={index === 0}
              isLast={index === journeyEvents.length - 1}
              onToggle={() => toggleExpandedEvent(event.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
