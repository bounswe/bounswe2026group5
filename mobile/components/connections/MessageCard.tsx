import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export interface MessageCardProps {
  id: string;
  name: string;
  messagePreview: string;
  timeAgo: string;
  hasUnread?: boolean;
  onPress?: () => void;
}

export function MessageCard({
  name,
  messagePreview,
  timeAgo,
  hasUnread,
  onPress,
}: Readonly<MessageCardProps>) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="bg-white border border-divider/30 rounded-xl p-4 mr-3 w-72"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text
          className="text-sm font-bold text-on-surface flex-1"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text className="text-xs text-on-surface-muted ml-2">{timeAgo}</Text>
      </View>

      <Text className="text-sm text-on-surface-soft" numberOfLines={3}>
        {messagePreview}
      </Text>

      {hasUnread ? (
        <View className="w-2 h-2 rounded-full bg-primary mt-3" />
      ) : null}
    </TouchableOpacity>
  );
}
