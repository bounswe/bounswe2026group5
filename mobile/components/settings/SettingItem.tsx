import React from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  // Use 'toggle' for switches, 'link' for navigation/clicks
  type?: 'link' | 'toggle';
  // For 'link' type: optional text to show on the right (e.g., "English")
  value?: string;
  // For 'toggle' type
  isToggled?: boolean;
  onToggle?: (val: boolean) => void;
  // Action for 'link' type
  onPress?: () => void;
  // Styling
  isDestructive?: boolean;
}

export function SettingItem({
  icon,
  label,
  type = "link",
  value,
  isToggled,
  onToggle,
  onPress,
  isDestructive,
}: Readonly<SettingItemProps>) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const content = (
    <View className="flex-row items-center justify-between py-4 border-b border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4">
      <View className="flex-row items-center">
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isDestructive ? "bg-red-50 dark:bg-red-950/40" : "bg-surface-active dark:bg-surface-active-dark"}`}>
          <Ionicons
            name={icon}
            size={18}
            color={isDestructive ? "#ef4444" : theme.textSoft}
          />
        </View>
        <Text className={`text-base font-semibold ${isDestructive ? "text-red-500" : "text-on-surface dark:text-on-surface-dark"}`}>
          {label}
        </Text>
      </View>

      <View className="flex-row items-center">
        {type === "link" && (
          <>
            {value && (
              <Text className="text-on-surface-muted dark:text-on-surface-muted-dark font-medium mr-2">
                {value}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </>
        )}
        {type === "toggle" && (
          <Switch
            value={isToggled}
            onValueChange={onToggle}
            trackColor={{ false: theme.divider, true: theme.primary }}
            thumbColor="#ffffff"
          />
        )}
      </View>
    </View>
  );

  if (type === "toggle") {
    return <View>{content}</View>;
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}