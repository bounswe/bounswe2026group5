import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface MenteeCardProps {
  id: string;
  name: string;
  subtitle: string;
  avatarUrl?: string;
  onMessage?: () => void;
}

export function MenteeCard({
  name,
  subtitle,
  onMessage,
}: Readonly<MenteeCardProps>) {
  return (
    <View className="bg-white p-4 rounded-xl border border-divider/20 shadow-sm mb-3">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-on-surface">{name}</Text>
          <Text
            className="text-sm text-on-surface-soft mt-0.5"
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onMessage}
          className="px-3 py-2 rounded-lg bg-primary"
        >
          <Text className="text-white font-semibold text-xs">Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
