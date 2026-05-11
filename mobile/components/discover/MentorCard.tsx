import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { type DiscoverMentorProfile } from "@/lib/discover/types";

interface MentorCardProps {
  profile: DiscoverMentorProfile;
  onPress?: (profile: DiscoverMentorProfile) => void;
}

function formatDistance(distanceKm?: number | null): string | null {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return null;
  }

  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
}

export function MentorCard({ profile, onPress }: Readonly<MentorCardProps>) {
  const distanceLabel = formatDistance(profile.distance_km);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress?.(profile)}
      className="relative bg-surface-card dark:bg-surface-card-dark border border-divider dark:border-divider-dark rounded-2xl p-4 mb-3"
    >
      {profile.is_overloaded && (
        <View className="absolute top-3 right-3 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">
          <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
            Busy
          </Text>
        </View>
      )}
      <View className="flex-row items-center mb-3">
        <View className="mr-3">
          <UserAvatar
            imageUrl={profile.picture_url}
            name={profile.full_name}
            size="sm"
            testIDPrefix={`discover-avatar-${profile.username}`}
          />
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
          {Number(profile.average_rating) > 0 && (
            <View className="flex-row items-center gap-1 mt-0.5">
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text className="text-xs font-bold text-on-surface dark:text-on-surface-dark">
                {Number(profile.average_rating).toFixed(1)}
              </Text>
              <Text className="text-[10px] text-on-surface-muted dark:text-on-surface-muted-dark">
                ({profile.review_count})
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text
        className="text-on-surface-soft dark:text-on-surface-soft-dark mb-3"
        numberOfLines={2}
      >
        {profile.bio || "No bio provided yet."}
      </Text>

      {distanceLabel ? (
        <Text
          testID={`mentor-distance-${profile.username}`}
          className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark mb-3"
        >
          {distanceLabel}
        </Text>
      ) : null}

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
