import {
  notificationsQueryKey,
  useRegisterFCMTokenMutation,
} from "@/lib/queries/notifications";
import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useAuthStore } from "@/lib/auth/store";
import { useQueryClient } from "@tanstack/react-query";

type DeviceModule = typeof import("expo-device");
type NotificationsModule = typeof import("expo-notifications");
type NotificationSubscription = import("expo-notifications").Subscription;

let notificationModulesPromise: Promise<{
  Device: DeviceModule;
  Notifications: NotificationsModule;
}> | null = null;

function loadNotificationModules() {
  notificationModulesPromise ??= Promise.resolve()
    .then(() => {
      const Device = require("expo-device") as DeviceModule;
      const Notifications = require(
        "expo-notifications",
      ) as NotificationsModule;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: false,
          shouldShowList: false,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      return { Device, Notifications };
    })
    .catch((error) => {
      notificationModulesPromise = null;
      console.error("Failed to load notification modules:", error);
      throw error;
    });

  return notificationModulesPromise;
}

export function usePushNotifications(isAuthenticated: boolean) {
  const { mutate: registerToken } = useRegisterFCMTokenMutation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const notificationListener = useRef<NotificationSubscription | null>(null);
  const responseListener = useRef<NotificationSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    loadNotificationModules()
      .then(async ({ Device, Notifications }) => {
        if (!isMounted) return;

        const token = await registerForPushNotificationsAsync(
          Device,
          Notifications,
        );
        if (token && isMounted) {
          registerToken({
            token,
            device_type: Platform.OS === "ios" ? "ios" : "android",
          });
        }

        notificationListener.current =
          Notifications.addNotificationReceivedListener(() => {
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
      })
      .catch((error) => {
        console.warn("Push notifications are unavailable:", error);
      });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
    };
  }, [isAuthenticated, registerToken, currentUser, queryClient]);
}

async function registerForPushNotificationsAsync(
  Device: DeviceModule,
  Notifications: NotificationsModule,
) {
  let token;
  const canAttemptPushRegistration =
    Device.isDevice || Platform.OS === "android";

  // Always set up the default channel for Android
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });

  if (canAttemptPushRegistration) {
    if (!Device.isDevice) {
      console.log(
        "Attempting push token registration on Android emulator with Google Play services.",
      );
    }

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
    console.log(
      "Push token registration requires a physical device on this platform.",
    );
  }

  return token;
}
