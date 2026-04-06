import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { type DiscoverMentorProfile } from "@/lib/discover/types";

interface MentorCardProps {
  profile: DiscoverMentorProfile;
  onPress?: (profile: DiscoverMentorProfile) => void;
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  const initials = parts
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 2) || "?";
}

export function MentorCard({ profile, onPress }: Readonly<MentorCardProps>) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress?.(profile)}
      className="bg-white border border-gray-200 rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mr-3">
          <Text className="text-indigo-700 font-bold">
            {getInitials(profile.full_name)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
            {profile.full_name}
          </Text>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {profile.title || "Mentor"}
          </Text>
        </View>
      </View>

      <Text className="text-gray-600 mb-3" numberOfLines={2}>
        {profile.bio || "No bio provided yet."}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {(profile.expertises || []).slice(0, 4).map((skill) => (
          <View key={skill} className="px-2 py-1 bg-indigo-50 rounded-lg">
            <Text className="text-xs font-semibold text-indigo-700">
              {skill}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}
