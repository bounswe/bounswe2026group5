import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

interface DiscoverSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
}

export function DiscoverSearchBar({
  value,
  onChangeText,
}: Readonly<DiscoverSearchBarProps>) {
  return (
    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2">
      <Ionicons name="search" size={18} color="#9ca3af" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search mentors, skills, topics..."
        className="flex-1 ml-2 text-gray-900"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}
