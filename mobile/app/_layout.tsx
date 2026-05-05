import { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import "react-native-reanimated";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import { configureGoogleSignIn } from "@/lib/queries/googleAuth";

export const unstable_settings = {
  anchor: "index",
};

const queryClient = new QueryClient();

import { usePushNotifications } from "@/hooks/usePushNotifications";

function PushNotificationManager({ children, isAuthenticated }: { children: React.ReactNode, isAuthenticated: boolean }) {
  usePushNotifications(isAuthenticated);
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  /**
   * Initialize auth from secure storage on app start.
   * This runs once when the app launches.
   */
  useEffect(() => {
    configureGoogleSignIn();
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Show splash screen while initializing auth.
   */
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PushNotificationManager isAuthenticated={isAuthenticated}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          {isAuthenticated ? (
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="notifications"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="verify-email"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="messages" options={{ headerShown: false }} />
            </Stack>
          ) : (
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen
                name="verify-email"
                options={{ headerShown: false }}
              />
            </Stack>
          )}
          <StatusBar style="auto" />
        </ThemeProvider>
      </PushNotificationManager>
    </QueryClientProvider>
  );
}
