import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface DiscoverSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  className?: string;
  placeholder?: string;
  testID?: string;
}

export function DiscoverSearchBar({
  value,
  onChangeText,
  className,
  placeholder = "Search mentors, skills, topics...",
  testID,
}: Readonly<DiscoverSearchBarProps>) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <View
      className={`h-12 flex-row items-center bg-surface-input dark:bg-surface-input-dark border border-divider dark:border-divider-dark rounded-xl px-3 py-2 ${className ?? ""}`}
    >
      <Ionicons name="search" size={18} color={theme.textMuted} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        className="flex-1 ml-2 text-on-surface dark:text-on-surface-dark"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}
