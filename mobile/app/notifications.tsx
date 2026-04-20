import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationListItem } from "@/components/notifications/NotificationListItem";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import {
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/lib/queries/notifications";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const currentUsername = useAuthStore((state) => state.user?.username);
  const notificationsQuery = useNotificationsQuery(currentUsername);
  const markReadMutation = useMarkNotificationReadMutation(currentUsername);
  const errorMessage =
    notificationsQuery.error instanceof Error
      ? notificationsQuery.error.message
      : "Could not load notifications.";

  const handleOpenNotification = async (
    notificationId: string,
    targetPath?: Href,
  ) => {
    try {
      await markReadMutation.mutateAsync(notificationId);
      if (targetPath) {
        router.push(targetPath);
      }
    } catch (error) {
      Alert.alert(
        "Notification Update Failed",
        error instanceof Error
          ? error.message
          : "Could not update the notification.",
      );
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["left", "right", "bottom"]}
    >
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
          <View className="flex-row items-center">
            <TouchableOpacity
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.back()}
              testID="notifications-back-button"
            >
              <Ionicons
                color={theme.textSoft}
                name="chevron-back"
                size={24}
              />
            </TouchableOpacity>
            <Text className="ml-3 text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
              Notifications
            </Text>
          </View>
          <Ionicons
            color={theme.textSoft}
            name="notifications-outline"
            size={22}
          />
        </View>
      </View>

      {notificationsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator color={theme.primary} size="large" />
          <Text className="mt-3 text-sm text-on-surface-soft dark:text-on-surface-soft-dark">
            Loading notifications...
          </Text>
        </View>
      ) : notificationsQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-error text-center">
            Could not load notifications.
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark">
            {errorMessage}
          </Text>
          <TouchableOpacity
            className="mt-4 rounded-xl bg-primary px-4 py-3"
            onPress={() => notificationsQuery.refetch()}
          >
            <Text className="font-semibold text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {notificationsQuery.data && notificationsQuery.data.length > 0 ? (
            notificationsQuery.data.map((notification) => (
              <NotificationListItem
                key={notification.id}
                disabled={markReadMutation.isPending}
                notification={notification}
                onPress={() =>
                  void handleOpenNotification(
                    notification.id,
                    notification.targetPath,
                  )
                }
              />
            ))
          ) : (
            <View className="mt-12 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-6 py-8 items-center">
              <Ionicons
                color={theme.primary}
                name="checkmark-circle-outline"
                size={36}
              />
              <Text className="mt-4 text-lg font-bold text-on-surface dark:text-on-surface-dark">
                You&apos;re all caught up
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark">
                New activity like messages, requests, and session changes will
                show up here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
