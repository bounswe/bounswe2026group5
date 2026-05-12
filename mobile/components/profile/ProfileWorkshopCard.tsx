import { Text, TouchableOpacity, View } from "react-native";

import type { WorkshopDashboardItem } from "@/lib/queries/workshops";

export function ProfileWorkshopCard({
  workshop,
  onPress,
}: Readonly<{
  workshop: WorkshopDashboardItem;
  onPress?: (workshop: WorkshopDashboardItem) => void;
}>) {
  const isActive =
    workshop.status === "Upcoming" && workshop.workshopStatus === "SCHEDULED";

  return (
    <TouchableOpacity
      testID={`profile-workshop-card-${workshop.workshopId}`}
      activeOpacity={0.85}
      onPress={() => onPress?.(workshop)}
      className={`mr-3 w-72 rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark ${
        isActive ? "" : "opacity-65"
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-extrabold text-on-surface dark:text-on-surface-dark">
            {workshop.topic}
          </Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-dim">
            {workshop.communityName}
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
            {isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-1">
        <Text className="text-sm font-semibold text-on-surface dark:text-on-surface-dark">
          {workshop.date}
        </Text>
        <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
          {workshop.time}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
