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
      className="bg-surface-card dark:bg-surface-card-dark border border-divider dark:border-divider-dark rounded-2xl p-4 mb-3"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-full bg-surface-active dark:bg-surface-active-dark items-center justify-center mr-3">
          <Text className="text-primary dark:text-primary-dim font-bold">
            {getInitials(profile.full_name)}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className="text-on-surface dark:text-on-surface-dark font-bold text-base"
            numberOfLines={1}
          >
            {profile.full_name}
          </Text>
          <Text
            className="text-on-surface-soft dark:text-on-surface-soft-dark text-sm"
            numberOfLines={1}
          >
            {profile.title || "Mentor"}
          </Text>
        </View>
      </View>

      <Text
        className="text-on-surface-soft dark:text-on-surface-soft-dark mb-3"
        numberOfLines={2}
      >
        {profile.bio || "No bio provided yet."}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {(profile.skills || []).slice(0, 4).map((skill) => (
          <View
            key={skill}
            className="px-2 py-1 bg-surface-active dark:bg-surface-active-dark rounded-lg border border-divider dark:border-divider-dark"
          >
            <Text className="text-xs font-semibold text-primary dark:text-primary-dim">
              {skill}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}