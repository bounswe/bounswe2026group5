import { SettingItem } from "@/components/settings/SettingItem";
import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import { useProfileVisibilityStore } from "@/lib/profile/preferences";
import { useLogoutMutation } from "@/lib/queries/auth";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const authUser = useAuthStore((state) => state.user);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const isMentor = authUser?.app_usage_mode === "MENTOR";
  const isMentee = authUser?.app_usage_mode === "MENTEE";
  const showMentorVisibilityControls = !authUser?.app_usage_mode || isMentor;
  const showMenteeVisibilityControls = !authUser?.app_usage_mode || isMentee;

  const showExpertise = useProfileVisibilityStore(
    (state) => state.showExpertise,
  );
  const showEagerToLearn = useProfileVisibilityStore(
    (state) => state.showEagerToLearn,
  );
  const showAvailability = useProfileVisibilityStore(
    (state) => state.showAvailability,
  );
  const setShowExpertise = useProfileVisibilityStore(
    (state) => state.setShowExpertise,
  );
  const setShowEagerToLearn = useProfileVisibilityStore(
    (state) => state.setShowEagerToLearn,
  );
  const setShowAvailability = useProfileVisibilityStore(
    (state) => state.setShowAvailability,
  );

  let roleModeLabel = "Not Set";
  if (authUser?.app_usage_mode === "MENTOR") {
    roleModeLabel = "Mentor";
  } else if (authUser?.app_usage_mode === "MENTEE") {
    roleModeLabel = "Mentee";
  }

  const roleModeDescription = authUser?.app_usage_mode
    ? "Account role is fixed. Use a separate account to use the other role."
    : "Choose your account role during onboarding.";

  const [actionError, setActionError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <Stack.Screen
        options={{ headerShown: false, headerBackVisible: false }}
      />

      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 pb-3 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textSoft} />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Settings
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {actionError ? (
          <View className="px-4 pt-4">
            <ErrorBanner message={actionError} />
          </View>
        ) : null}

        {infoMessage ? (
          <View className="px-4 pt-4">
            <ErrorBanner message={infoMessage} variant="info" />
          </View>
        ) : null}

        {/* Section: Account Role */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-6 mb-2">
          Account Role
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          <SettingItem
            icon="person-circle-outline"
            label="Role"
            value={roleModeLabel}
            onPress={() => setInfoMessage(roleModeDescription)}
          />
        </View>

        {/* Section: Profile Display */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-8 mb-2">
          Profile Display
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          {showMentorVisibilityControls && (
            <SettingItem
              type="toggle"
              icon="school-outline"
              label="Show Expertise"
              isToggled={showExpertise}
              onToggle={setShowExpertise}
            />
          )}

          {showMenteeVisibilityControls && (
            <SettingItem
              type="toggle"
              icon="bulb-outline"
              label="Show Eager to Learn"
              isToggled={showEagerToLearn}
              onToggle={setShowEagerToLearn}
            />
          )}

          {showMentorVisibilityControls && (
            <SettingItem
              type="toggle"
              icon="calendar-outline"
              label="Show Availability"
              isToggled={showAvailability}
              onToggle={setShowAvailability}
            />
          )}
        </View>

        {/* Section: Account */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-8 mb-2">
          Account
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          <SettingItem
            icon="log-out-outline"
            label={logoutMutation.isPending ? "Logging Out..." : "Log Out"}
            isDestructive={true}
            onPress={logoutMutation.isPending ? undefined : handleLogout}
          />
        </View>

        <Text className="text-center text-on-surface-muted dark:text-on-surface-muted-dark font-medium text-xs mt-8">
          Version 1.0.0 (MVP)
        </Text>
      </ScrollView>

      <ConfirmationSheet
        visible={showLogoutConfirmation}
        title="Log out?"
        message="You will need to sign in again to access your dashboard."
        confirmLabel="Log Out"
        cancelLabel="Stay Logged In"
        variant="destructive"
        isConfirming={logoutMutation.isPending}
        onCancel={() => setShowLogoutConfirmation(false)}
        onConfirm={async () => {
          try {
            setActionError(null);
            await logoutMutation.mutateAsync();
            setShowLogoutConfirmation(false);
            router.replace("/login");
          } catch (error) {
            console.error("Logout failed:", error);
            setShowLogoutConfirmation(false);
            setActionError(
              error instanceof Error
                ? error.message
                : "Failed to log out. Please try again.",
            );
          }
        }}
      />

    </View>
  );
}
