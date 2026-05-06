import {
  notificationsQueryKey,
  useRegisterFCMTokenMutation,
} from "@/lib/queries/notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";

import { useAuthStore } from "@/lib/auth/store";
import { useQueryClient } from "@tanstack/react-query";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(isAuthenticated: boolean) {
  const { mutate: registerToken } = useRegisterFCMTokenMutation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        registerToken({
          token,
          device_type: "android",
        });
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Invalidate notification list instantly
        if (currentUser?.username) {
          queryClient.invalidateQueries({
            queryKey: notificationsQueryKey(currentUser.username),
          });
        }
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response received:", response);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, registerToken, currentUser, queryClient]);
}

async function registerForPushNotificationsAsync() {
  let token;

  // Always set up the default channel for Android
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }

    // For Expo managed workflow with FCM
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        console.error("Project ID not found in expo config");
      }
      token = (await Notifications.getDevicePushTokenAsync()).data;
      // Wait, for FCM on Android we usually need getDevicePushTokenAsync.
      // For Expo Push Service we use getExpoPushTokenAsync.
      // Since we want to use FCM directly from backend, we need the device token.
      console.log("Device Push Token:", token);
    } catch (e) {
      console.error("Error getting push token:", e);
    }
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}
