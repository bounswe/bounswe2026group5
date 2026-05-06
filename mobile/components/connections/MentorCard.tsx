import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UserAvatar } from "@/components/ui/UserAvatar";

export interface MentorCardProps {
  id: string;
  name: string;
  subtitle: string;
  avatarUrl?: string;
  onPress?: () => void;
  onMessage?: () => void;
  onMore?: () => void;
}

export function MentorCard({
  name,
  subtitle,
  avatarUrl,
  onPress,
  onMessage,
  onMore,
}: Readonly<MentorCardProps>) {
  return (
    <View className="bg-white p-[18px] rounded-xl border border-divider/20 shadow-sm mb-3.5">
      {/* Avatar + Name + Badge */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        className="flex-row gap-4 items-center"
      >
        <UserAvatar
          imageUrl={avatarUrl}
          name={name}
          shape="rounded"
          size="md"
          testIDPrefix="mentor-avatar"
        />

        <View className="flex-1">
          <Text className="text-base font-bold text-on-surface">{name}</Text>
          <Text
            className="text-[13px] text-on-surface-soft mt-0.5"
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View className="flex-row gap-2.5 mt-4">
        <TouchableOpacity
          testID="mentor-profile-button"
          activeOpacity={0.85}
          onPress={onPress}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-gray-100 py-2.5 rounded-lg"
        >
          <Ionicons name="person-outline" size={14} color="#374151" />
          <Text className="text-gray-700 font-semibold text-sm">Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="mentor-message-button"
          activeOpacity={0.85}
          onPress={onMessage}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-primary py-2.5 rounded-lg"
        >
          <Ionicons name="chatbubble-outline" size={14} color="#ffffff" />
          <Text className="text-white font-semibold text-sm">Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="mentor-more-button"
          activeOpacity={0.8}
          onPress={onMore}
          className="w-11 h-10 rounded-lg bg-gray-100 items-center justify-center"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#434655" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
