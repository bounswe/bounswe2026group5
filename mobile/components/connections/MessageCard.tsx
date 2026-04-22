import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

export interface MessageCardProps {
  id: string;
  name: string;
  messagePreview: string;
  timeAgo: string;
  avatarUrl?: string;
  hasUnread?: boolean;
  onPress?: () => void;
}

export function MessageCard({ id, name, messagePreview, timeAgo, avatarUrl, hasUnread, onPress }: MessageCardProps) {
  return (
    <TouchableOpacity
      testID={`message-card-${id}`}
      activeOpacity={0.75}
      onPress={onPress}
      className="w-[260px] flex-row items-start gap-3 bg-white p-5 pr-3 mr-3 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Avatar */}
      <View className="relative">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-surface-active items-center justify-center">
            <Text className="text-xl font-bold text-primary">
              {name.charAt(0)}
            </Text>
          </View>
        )}
        {hasUnread && (
          <View testID="message-card-unread" className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" />
        )}
      </View>

      {/* Content */}
      <View className="flex-1 overflow-hidden gap-1">
        <Text className="text-[15px] font-bold text-on-surface" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[13px] text-on-surface-soft leading-[18px]" numberOfLines={2}>
          {messagePreview}
        </Text>
        <Text className="text-[10px] font-bold text-primary opacity-60 uppercase tracking-wider">
          {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}