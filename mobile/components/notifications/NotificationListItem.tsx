import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  formatNotificationTimestamp,
  type MobileNotification,
} from "@/lib/queries/notifications";

interface NotificationListItemProps {
  notification: MobileNotification;
  disabled?: boolean;
  onPress: () => void;
}

function iconNameForType(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "incoming_message":
    case "message_received":
      return "chatbubble-ellipses-outline";
    case "new_request":
    case "request_received":
      return "mail-open-outline";
    case "request_accepted":
    case "new_match":
      return "checkmark-circle-outline";
    case "request_rejected":
      return "close-circle-outline";
    case "session_canceled":
      return "calendar-clear-outline";
    case "session_rescheduled":
      return "calendar-outline";
    case "feedback_received":
      return "star-outline";
    default:
      return "notifications-outline";
  }
}

export function NotificationListItem({
  notification,
  disabled = false,
  onPress,
}: NotificationListItemProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="mb-3 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4 py-4"
      disabled={disabled}
      onPress={onPress}
      testID={`notification-item-${notification.id}`}
    >
      <View className="flex-row items-start">
        <View className="mt-0.5 h-11 w-11 rounded-full bg-surface-active dark:bg-surface-active-dark items-center justify-center">
          <Ionicons
            color={theme.primary}
            name={iconNameForType(notification.type)}
            size={20}
          />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-base font-bold text-on-surface dark:text-on-surface-dark">
              {notification.title}
            </Text>
            <Text className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
              {formatNotificationTimestamp(notification.createdAt)}
            </Text>
          </View>

          <Text className="mt-1 text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark">
            {notification.message}
          </Text>

          {notification.targetPath && (
            <Text className="mt-2 text-xs font-semibold text-primary dark:text-primary-dim">
              View details
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
