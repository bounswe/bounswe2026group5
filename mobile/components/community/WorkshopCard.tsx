import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import {
  type CommunityWorkshopListItem,
  isWorkshopActive,
} from "@/lib/queries/workshops";

function formatWorkshopDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
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

function getWorkshopStatusLabel(workshop: CommunityWorkshopListItem) {
  if (workshop.status === "CANCELLED") {
    return "Cancelled";
  }

  if (!isWorkshopActive(workshop)) {
    return "Ended";
  }

  if (workshop.is_full) {
    return "Full";
  }

  return "Open";
}

export function WorkshopCard({
  workshop,
  onPress,
}: Readonly<{
  workshop: CommunityWorkshopListItem;
  onPress?: (workshop: CommunityWorkshopListItem) => void;
}>) {
  const isActive = isWorkshopActive(workshop);
  const statusLabel = getWorkshopStatusLabel(workshop);

  return (
    <TouchableOpacity
      testID={`community-workshop-card-${workshop.id}`}
      activeOpacity={0.85}
      onPress={() => onPress?.(workshop)}
      className={`mr-3 w-80 rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark ${
        isActive ? "" : "opacity-65"
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-extrabold text-on-surface dark:text-on-surface-dark">
            {workshop.title}
          </Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-dim">
            {workshop.community_name}
          </Text>
        </View>
        <View
          className={`rounded-full px-2.5 py-1 ${
            isActive
              ? "bg-primary/10 dark:bg-primary-dim/15"
              : "bg-surface-active dark:bg-surface-active-dark"
          }`}
        >
          <Text
            className={`text-[11px] font-bold ${
              isActive
                ? "text-primary dark:text-primary-dim"
                : "text-on-surface-soft dark:text-on-surface-soft-dark"
            }`}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={3}
        className="mt-3 text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark"
      >
        {workshop.description.trim() || "No workshop description yet."}
      </Text>

      <View className="mt-4 gap-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name="calendar-outline" size={16} color="#737686" />
          <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-dark">
            {formatWorkshopDate(workshop.scheduled_at)}
          </Text>
          <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            {formatWorkshopTimeRange(workshop.scheduled_at, workshop.end_at)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="people-outline" size={16} color="#737686" />
          <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            {workshop.participant_count}/{workshop.max_participants} participants
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="person-outline" size={16} color="#737686" />
          <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            Host: {workshop.author?.display_name ?? "Unknown"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
