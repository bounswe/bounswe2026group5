import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SettingItem } from "@/components/settings/SettingItem";
import { useLogoutMutation } from "@/lib/queries/auth";
import { useAuthStore } from "@/lib/auth/store";
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const authUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateUser = useAuthStore((state) => state.updateUser);
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const [roleState, setRoleState] = useState({
    mentor: includesMentor(authUser?.app_usage_mode),
    mentee: includesMentee(authUser?.app_usage_mode),
  });

  const [prefs, setPrefs] = useState({
    notifRequests: true,
    notifReminders: true,
    notifUpdates: false,
  });

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const syncUsageMode = async (mode: UsageMode) => {
    if (!authUser?.id || !accessToken) {
      return;
    }

    if (mode === "BOTH") {
      await updateUser({ app_usage_mode: "BOTH" });
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/auth/${encodeURIComponent(authUser.id)}/app-usage-mode/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ app_usage_mode: mode }),
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
      };
      throw new Error(payload.detail || "Failed to update app usage mode.");
    }

    await updateUser({ app_usage_mode: mode });
  };

  const handleRoleToggle = async (key: "mentor" | "mentee", value: boolean) => {
    const next = {
      ...roleState,
      [key]: value,
    };

    if (!next.mentor && !next.mentee) {
      Alert.alert("Role Required", "At least one role must remain enabled.");
      return;
    }

    let nextMode: UsageMode = "MENTEE";
    if (next.mentor && next.mentee) {
      nextMode = "BOTH";
    } else if (next.mentor) {
      nextMode = "MENTOR";
    }

    try {
      await syncUsageMode(nextMode);
      setRoleState(next);
    } catch (error) {
      Alert.alert(
        "Update Failed",
        error instanceof Error ? error.message : "Could not update role mode.",
      );
    }
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
        {/* Section: Role Mode */}
        <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider ml-4 mt-6 mb-2">
          Role Mode
        </Text>
        <View className="bg-surface-card dark:bg-surface-card-dark border-t border-divider dark:border-divider-dark">
          <SettingItem
            type="toggle"
            icon="school-outline"
            label="Mentor Mode"
            isToggled={roleState.mentor}
            onToggle={(value) => handleRoleToggle("mentor", value)}
          />
          <SettingItem
            type="toggle"
            icon="rocket-outline"
            label="Mentee Mode"
            isToggled={roleState.mentee}
            onToggle={(value) => handleRoleToggle("mentee", value)}
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
