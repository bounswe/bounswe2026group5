import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

interface DiscoverSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DiscoverSearchBar({
  value,
  onChangeText,
  className,
  placeholder = "Search mentors, skills, topics...",
}: Readonly<DiscoverSearchBarProps>) {
  return (
    <View
      className={`h-12 flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2 ${className ?? ""}`}
    >
      <Ionicons name="search" size={18} color="#9ca3af" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        className="flex-1 ml-2 text-gray-900"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}
