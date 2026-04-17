import { SettingItem } from "@/components/settings/SettingItem";
import { useAuthStore } from "@/lib/auth/store";
<<<<<<< Updated upstream
import { API_BASE_URL } from "@/constants/api";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type UsageMode = "MENTOR" | "MENTEE" | "BOTH";

function includesMentor(mode?: string): boolean {
  return mode === "MENTOR" || mode === "BOTH";
}

function includesMentee(mode?: string): boolean {
  return mode === "MENTEE" || mode === "BOTH";
}
=======
import { useProfileVisibilityStore } from "@/lib/profile/preferences";
import { useLogoutMutation } from "@/lib/queries/auth";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
>>>>>>> Stashed changes

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const authUser = useAuthStore((state) => state.user);
<<<<<<< Updated upstream
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateUser = useAuthStore((state) => state.updateUser);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
=======

  const showExpertise = useProfileVisibilityStore(
    (state) => state.showExpertise,
  );
  const showEagerToLearn = useProfileVisibilityStore(
    (state) => state.showEagerToLearn,
  );
  const showAvailability = useProfileVisibilityStore(
    (state) => state.showAvailability,
  );
  const showOfferings = useProfileVisibilityStore(
    (state) => state.showOfferings,
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
  const setShowOfferings = useProfileVisibilityStore(
    (state) => state.setShowOfferings,
  );
>>>>>>> Stashed changes

  let roleModeLabel = "Not Set";
  if (authUser?.app_usage_mode === "MENTOR") {
    roleModeLabel = "Mentor";
  } else if (authUser?.app_usage_mode === "MENTEE") {
    roleModeLabel = "Mentee";
  }

  const roleModeDescription = authUser?.app_usage_mode
    ? "Account role is fixed. Use a separate account to use the other role."
    : "Choose your account role during onboarding.";

  const [prefs, setPrefs] = useState({
    notifRequests: true,
    notifReminders: true,
    notifUpdates: false,
  });

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logoutMutation.mutateAsync();
            router.replace("/login");
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleAccountDeletion = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => console.log("Account deleted"),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {/* 1. FORCE HIDE DEFAULT HEADER */}
      <Stack.Screen
        options={{ headerShown: false, headerBackVisible: false }}
      />

      {/* 2. ONLY ONE CUSTOM HEADER */}
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
<<<<<<< Updated upstream
        {/* Section: Role Mode */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-6 mb-2">
          Role Mode
=======
        {/* Section: Account Role */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-4 mt-6 mb-2">
          Account Role
>>>>>>> Stashed changes
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          <SettingItem
            icon="person-circle-outline"
            label="Role"
            value={roleModeLabel}
            onPress={() => Alert.alert("Role Policy", roleModeDescription)}
          />
        </View>

        {/* Section: Notifications */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-8 mb-2">
          Notifications
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          <SettingItem
            type="toggle"
            icon="person-add-outline"
            label="New Mentorship Requests"
            isToggled={prefs.notifRequests}
            onToggle={() => togglePref("notifRequests")}
          />
          <SettingItem
            type="toggle"
            icon="alarm-outline"
            label="Session Reminders"
            isToggled={prefs.notifReminders}
            onToggle={() => togglePref("notifReminders")}
          />
          <SettingItem
            type="toggle"
            icon="megaphone-outline"
            label="Platform Updates"
            isToggled={prefs.notifUpdates}
            onToggle={() => togglePref("notifUpdates")}
          />
        </View>

        {/* Section: Account & About */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-8 mb-2">
          Account
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          <SettingItem
            icon="lock-closed-outline"
            label="Privacy Policy"
            onPress={() => console.log("Open Privacy")}
          />
          <SettingItem
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => console.log("Open ToS")}
          />
          <SettingItem
            icon="log-out-outline"
            label={logoutMutation.isPending ? "Logging Out..." : "Log Out"}
            isDestructive={true}
            onPress={logoutMutation.isPending ? undefined : handleLogout}
          />
          <SettingItem
            icon="trash-outline"
            label="Delete Account"
            isDestructive={true}
            onPress={handleAccountDeletion}
          />
        </View>

        <Text className="text-center text-on-surface-muted dark:text-on-surface-muted-dark font-medium text-xs mt-8">
          Version 1.0.0 (MVP)
        </Text>
      </ScrollView>
    </View>
  );
}
