import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";
import { getAbsoluteUrl } from "@/lib/api/config";

import type { TimelineEvent } from "@/lib/queries/mentorship";

type TimelineEventStyle = {
  icon: keyof typeof Ionicons.glyphMap;
  badge: string;
  iconColor: string;
  titleColor: string;
  railClassName: string;
  iconClassName: string;
  badgeClassName: string;
  titleClassName: string;
};

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

const DEFAULT_SYSTEM_STYLE: TimelineEventStyle = {
  icon: "sparkles-outline",
  badge: "System",
  iconColor: "#2f7d68",
  titleColor: "#2f7d68",
  railClassName: "bg-primary/30 dark:bg-primary-dim/35",
  iconClassName:
    "border-primary/35 bg-primary/10 dark:border-primary-dim/55 dark:bg-primary-dim/15",
  badgeClassName:
    "border-primary/20 bg-primary/10 dark:border-primary-dim/35 dark:bg-primary-dim/15",
  titleClassName: "text-primary dark:text-primary-dim",
};

const DEFAULT_MILESTONE_STYLE: TimelineEventStyle = {
  icon: "flag-outline",
  badge: "Milestone",
  iconColor: "#047857",
  titleColor: "#047857",
  railClassName: "bg-emerald-400/35 dark:bg-emerald-400/30",
  iconClassName:
    "border-emerald-500/35 bg-emerald-50 dark:border-emerald-400/55 dark:bg-emerald-950/30",
  badgeClassName:
    "border-emerald-500/20 bg-emerald-50 dark:border-emerald-400/35 dark:bg-emerald-950/30",
  titleClassName: "text-emerald-700 dark:text-emerald-300",
};

const EVENT_STYLES: Record<string, TimelineEventStyle> = {
  request_accepted: {
    icon: "hand-left-outline",
    badge: "Started",
    iconColor: "#16a34a",
    titleColor: "#16a34a",
    railClassName: "bg-emerald-400/35 dark:bg-emerald-400/30",
    iconClassName:
      "border-emerald-500/35 bg-emerald-50 dark:border-emerald-400/55 dark:bg-emerald-950/30",
    badgeClassName:
      "border-emerald-500/20 bg-emerald-50 dark:border-emerald-400/35 dark:bg-emerald-950/30",
    titleClassName: "text-emerald-600 dark:text-emerald-300",
  },
  session_scheduled: {
    icon: "calendar-outline",
    badge: "Session",
    iconColor: "#2563eb",
    titleColor: "#2563eb",
    railClassName: "bg-blue-400/35 dark:bg-blue-400/30",
    iconClassName:
      "border-blue-500/30 bg-blue-50 dark:border-blue-400/55 dark:bg-blue-950/30",
    badgeClassName:
      "border-blue-500/20 bg-blue-50 dark:border-blue-400/35 dark:bg-blue-950/30",
    titleClassName: "text-blue-600 dark:text-blue-300",
  },
  session_rescheduled: {
    icon: "refresh-circle-outline",
    badge: "Moved",
    iconColor: "#7c3aed",
    titleColor: "#7c3aed",
    railClassName: "bg-violet-400/35 dark:bg-violet-400/30",
    iconClassName:
      "border-violet-500/30 bg-violet-50 dark:border-violet-400/55 dark:bg-violet-950/30",
    badgeClassName:
      "border-violet-500/20 bg-violet-50 dark:border-violet-400/35 dark:bg-violet-950/30",
    titleClassName: "text-violet-600 dark:text-violet-300",
  },
  session_canceled: {
    icon: "close-circle-outline",
    badge: "Canceled",
    iconColor: "#dc2626",
    titleColor: "#dc2626",
    railClassName: "bg-red-300/40 dark:bg-red-400/25",
    iconClassName:
      "border-red-500/30 bg-red-50 dark:border-red-400/50 dark:bg-red-950/25",
    badgeClassName:
      "border-red-500/20 bg-red-50 dark:border-red-400/35 dark:bg-red-950/25",
    titleClassName: "text-red-600 dark:text-red-300",
  },
  session_completed: {
    icon: "checkmark-circle-outline",
    badge: "Done",
    iconColor: "#0f766e",
    titleColor: "#0f766e",
    railClassName: "bg-teal-400/35 dark:bg-teal-400/30",
    iconClassName:
      "border-teal-500/30 bg-teal-50 dark:border-teal-400/55 dark:bg-teal-950/30",
    badgeClassName:
      "border-teal-500/20 bg-teal-50 dark:border-teal-400/35 dark:bg-teal-950/30",
    titleClassName: "text-teal-700 dark:text-teal-300",
  },
  mentorship_ended: {
    icon: "trail-sign-outline",
    badge: "Closed",
    iconColor: "#6b7280",
    titleColor: "#4b5563",
    railClassName: "bg-gray-300 dark:bg-gray-600",
    iconClassName:
      "border-gray-300 bg-gray-50 dark:border-gray-500 dark:bg-gray-800",
    badgeClassName:
      "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800",
    titleClassName: "text-gray-700 dark:text-gray-200",
  },
  achievement: {
    icon: "trophy-outline",
    badge: "Achievement",
    iconColor: "#d97706",
    titleColor: "#d97706",
    railClassName: "bg-amber-300/45 dark:bg-amber-400/30",
    iconClassName:
      "border-amber-500/30 bg-amber-50 dark:border-amber-400/55 dark:bg-amber-950/25",
    badgeClassName:
      "border-amber-500/20 bg-amber-50 dark:border-amber-400/35 dark:bg-amber-950/25",
    titleClassName: "text-amber-600 dark:text-amber-300",
  },
  social: {
    icon: "chatbubbles-outline",
    badge: "Social",
    iconColor: "#0891b2",
    titleColor: "#0891b2",
    railClassName: "bg-cyan-400/35 dark:bg-cyan-400/30",
    iconClassName:
      "border-cyan-500/30 bg-cyan-50 dark:border-cyan-400/55 dark:bg-cyan-950/30",
    badgeClassName:
      "border-cyan-500/20 bg-cyan-50 dark:border-cyan-400/35 dark:bg-cyan-950/30",
    titleClassName: "text-cyan-700 dark:text-cyan-300",
  },
  progress: {
    icon: "trending-up-outline",
    badge: "Progress",
    iconColor: "#2f7d68",
    titleColor: "#2f7d68",
    railClassName: "bg-primary/30 dark:bg-primary-dim/35",
    iconClassName:
      "border-primary/35 bg-primary/10 dark:border-primary-dim/55 dark:bg-primary-dim/15",
    badgeClassName:
      "border-primary/20 bg-primary/10 dark:border-primary-dim/35 dark:bg-primary-dim/15",
    titleClassName: "text-primary dark:text-primary-dim",
  },
};

const PAYLOAD_LABELS: Record<string, string> = {
  scheduled_start_at_utc: "Starts",
  scheduled_end_at_utc: "Ends",
  initial_session_start_at: "Initial session starts",
  initial_session_end_at: "Initial session ends",
  cancel_reason: "Cancel reason",
};

export function formatTimelineTimestamp(value: string): string {
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

export function formatTimelineEventType(value: string): string {
  return (
    EVENT_LABELS[value] ??
    value
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function getTimelineEventStyle(event: TimelineEvent): TimelineEventStyle {
  return (
    EVENT_STYLES[event.event_type] ??
    (event.category === "AGTE" ? DEFAULT_SYSTEM_STYLE : DEFAULT_MILESTONE_STYLE)
  );
}

function getTimelineActorLabel(event: TimelineEvent): string | null {
  if (event.author?.username) {
    return `@${event.author.username}`;
  }

  return event.actor_role ?? null;
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
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
          ? formatTimelineTimestamp(value)
          : formatPayloadValue(value),
    ] as [string, string])
    .filter(([, value]) => value.trim().length > 0)
    .slice(0, 4);
}

export function TimelineEventCard({
  event,
  expanded,
  isFirst,
  isLast,
  onToggle,
  onEdit,
}: Readonly<{
  event: TimelineEvent;
  expanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onEdit?: () => void;
}>) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const isSystemEvent = event.category === "AGTE";
  const eventStyle = getTimelineEventStyle(event);
  const actorLabel = getTimelineActorLabel(event);
  const payloadEntries = getPayloadEntries(event);
  const hasDetails =
    Boolean(event.media_url) ||
    payloadEntries.length > 0 ||
    event.show_on_profile;

  if (isSystemEvent) {
    return (
      <View testID={`journey-event-${event.id}`} className="flex-row">
        <View className="w-12 items-center pt-1">
          <View
            className={`w-0.5 flex-1 rounded-full ${
              isFirst ? "bg-transparent" : "bg-divider dark:bg-divider-dark"
            }`}
          />
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onToggle}
            className={`h-10 w-10 items-center justify-center rounded-full border-2 ${eventStyle.iconClassName}`}
          >
            <Ionicons
              name={eventStyle.icon}
              size={18}
              color={eventStyle.iconColor}
            />
          </TouchableOpacity>
          <View
            className={`w-0.5 flex-1 rounded-full ${
              isLast ? "bg-transparent" : "bg-divider dark:bg-divider-dark"
            }`}
          />
        </View>

        <View className="flex-1 pb-5 pl-3 pt-1.5">
          <TouchableOpacity
            testID={`journey-event-toggle-${event.id}`}
            activeOpacity={0.75}
            onPress={onToggle}
            className="py-1"
          >
            <Text className={`text-base font-extrabold ${eventStyle.titleClassName}`}>
              {formatTimelineEventType(event.event_type)}
            </Text>

            <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
              <Text className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
                {formatTimelineTimestamp(event.timestamp)}
              </Text>
              {hasDetails ? (
                <>
                  <Text className="text-xs text-on-surface-muted dark:text-on-surface-muted-dark">
                    .
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
            <View className="mt-2 border-l-2 border-divider/80 px-3 py-1.5 dark:border-divider-dark">
              {payloadEntries.length > 0 ? (
                <View className="gap-1.5">
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
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View testID={`journey-event-${event.id}`} className="flex-row">
      <View className="w-12 items-center pt-1">
        <View
          className={`w-0.5 flex-1 rounded-full ${
            isFirst ? "bg-transparent" : eventStyle.railClassName
          }`}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggle}
          className={`h-12 w-12 items-center justify-center rounded-full border-[3px] shadow-sm ${eventStyle.iconClassName}`}
        >
          <Ionicons
            name={eventStyle.icon}
            size={21}
            color={eventStyle.iconColor}
          />
        </TouchableOpacity>
        <View
          className={`w-0.5 flex-1 rounded-full ${
            isLast ? "bg-transparent" : eventStyle.railClassName
          }`}
        />
      </View>

      <View className="flex-1 pb-5 pl-3">
        <TouchableOpacity
          testID={`journey-event-toggle-${event.id}`}
          activeOpacity={0.82}
          onPress={onToggle}
          className="rounded-xl border border-divider/80 bg-surface-card px-4 py-3.5 shadow-sm dark:border-divider-dark dark:bg-surface-card-dark"
        >
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <View
                  className={`rounded-full border px-2.5 py-0.5 ${eventStyle.badgeClassName}`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase ${eventStyle.titleClassName}`}
                  >
                    {eventStyle.badge}
                  </Text>
                </View>
                {actorLabel ? (
                  <Text className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
                    by {actorLabel}
                  </Text>
                ) : null}
              </View>

              <Text
                className={`mt-2 text-lg font-extrabold ${eventStyle.titleClassName}`}
              >
                {formatTimelineEventType(event.event_type)}
              </Text>

              {event.content ? (
                <Text
                  className="mt-2 text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark"
                  numberOfLines={expanded ? undefined : 2}
                >
                  {event.content}
                </Text>
              ) : null}
            </View>
            {onEdit ? (
              <TouchableOpacity
                testID={`journey-event-edit-${event.id}`}
                activeOpacity={0.8}
                onPress={onEdit}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface-active dark:bg-gray-800"
              >
                <Ionicons name="create-outline" size={15} color="#2f7d68" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View className="mt-3 flex-row items-center gap-1.5">
            <Ionicons
              name="time-outline"
              size={13}
              color={eventStyle.titleColor}
            />
            <Text className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
              {formatTimelineTimestamp(event.timestamp)}
            </Text>
            {hasDetails ? (
              <>
                <Text className="text-xs text-on-surface-muted dark:text-on-surface-muted-dark">
                  .
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
          <View className="mt-2 rounded-xl border border-divider/70 bg-surface-card/80 px-4 py-3 dark:border-divider-dark dark:bg-surface-card-dark">
            {event.media_url ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowFullscreen(true)}
              >
                <Image
                  testID={`journey-event-media-${event.id}`}
                  source={{ uri: getAbsoluteUrl(event.media_url) }}
                  className="h-40 w-full rounded-xl bg-surface-active dark:bg-surface-active-dark"
                  resizeMode="cover"
                />
              </TouchableOpacity>
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

      <Modal
        visible={showFullscreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullscreen(false)}
      >
        <View className="flex-1 bg-black/95 items-center justify-center">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowFullscreen(false)}
            className="absolute top-10 right-6 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/20"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: getAbsoluteUrl(event.media_url) }}
            className="h-full w-full"
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
}
