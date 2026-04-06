import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface MentorCardProps {
  name: string;
  subtitle: string;
  avatarUrl?: string;
  onMessage?: () => void;
  onMore?: () => void;
}

export function MentorCard({
  name,
  subtitle,
  avatarUrl,
  onMessage,
  onMore,
}: Readonly<MentorCardProps>) {
  return (
    <View className="bg-white p-[18px] rounded-xl border border-divider/20 shadow-sm mb-3.5">
      {/* Avatar + Name + Badge */}
      <View className="flex-row gap-4 items-center">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="w-16 h-16 rounded-lg" />
        ) : (
          <View className="w-16 h-16 rounded-lg bg-surface-active items-center justify-center">
            <Text className="text-[22px] font-bold text-primary">
              {name.charAt(0)}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-base font-bold text-on-surface">
                {name}
              </Text>
              <Text
                className="text-[13px] text-on-surface-soft mt-0.5"
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            </View>
            <View className="px-2 py-1 bg-indigo-100 rounded-lg ml-2">
              <Text className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">
                Mentor
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {/* TODO: API connection — navigate to messaging screen for this mentor */}
      <View className="flex-row gap-2.5 mt-4">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onMessage}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-primary py-2.5 rounded-lg"
        >
          <Ionicons name="chatbubble-outline" size={14} color="#ffffff" />
          <Text className="text-white font-semibold text-sm">Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
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
