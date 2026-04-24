import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { TouchableOpacity, View, Text } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import { useNotificationBadgeStore } from "@/lib/notifications/badgePreferences";
import { useNotificationsQuery } from "@/lib/queries/notifications";

function formatUnreadCount(count: number): string {
  if (count > 99) {
    return "99+";
  }

  return String(count);
}

export function NotificationBell() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const currentUsername = useAuthStore((state) => state.user?.username);
  const dismissedThrough = useNotificationBadgeStore((state) =>
    state.getDismissedThrough(currentUsername),
  );
  const dismissUnreadBadge = useNotificationBadgeStore(
    (state) => state.dismissUnreadBadge,
  );
  const notificationsQuery = useNotificationsQuery(currentUsername);
  const unreadNotifications =
    notificationsQuery.data?.filter((notification) => !notification.isRead) ??
    [];
  const latestUnreadTimestamp = unreadNotifications.reduce((latest, item) => {
    const timestamp = new Date(item.createdAt).getTime();
    if (Number.isNaN(timestamp)) {
      return latest;
    }

    return Math.max(latest, timestamp);
  }, 0);
  const unreadCount = unreadNotifications.length;
  const shouldShowBadge =
    unreadCount > 0 && latestUnreadTimestamp > dismissedThrough;

  const handlePress = () => {
    if (currentUsername && latestUnreadTimestamp > 0) {
      dismissUnreadBadge(currentUsername, latestUnreadTimestamp);
    }

    router.push("/notifications" as Href);
  };

  return (
    <TouchableOpacity
      accessibilityLabel="Open notifications"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={handlePress}
      testID="notification-bell-button"
    >
      <View className="relative">
        <Ionicons
          name="notifications-outline"
          size={24}
          color={theme.textSoft}
        />
        {shouldShowBadge && (
          <View className="absolute -top-1.5 -right-2 min-w-5 h-5 px-1 rounded-full bg-primary border border-surface-card dark:border-surface-card-dark items-center justify-center">
            <Text className="text-[10px] font-bold text-white">
              {formatUnreadCount(unreadCount)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
