import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BIO_PREVIEW_LENGTH = 240;

interface ProfileHeaderProps {
  name: string;
  bio: string;
  rating?: number;
  reviewCount?: number;
  totalSessions?: number;
  menteesHelped?: number;
  showMenteesHelped?: boolean;
  imageUrl?: string;
  coverUrl?: string;
  onEdit?: () => void;
}

export function ProfileHeader({
  name,
  bio,
  rating,
  reviewCount = 0,
  totalSessions = 0,
  menteesHelped = 0,
  showMenteesHelped = true,
  imageUrl,
  coverUrl,
  onEdit,
}: Readonly<ProfileHeaderProps>) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  useEffect(() => {
    setIsBioExpanded(false);
  }, [bio]);

  const trimmedBio = bio.trim();
  const shouldShowReadMore = trimmedBio.length > BIO_PREVIEW_LENGTH;
  const visibleBio = useMemo(() => {
    if (isBioExpanded || !shouldShowReadMore) {
      return trimmedBio;
    }

    return `${trimmedBio.slice(0, BIO_PREVIEW_LENGTH).trimEnd()}...`;
  }, [isBioExpanded, shouldShowReadMore, trimmedBio]);

  return (
    <View className="bg-surface-card dark:bg-surface-card-dark mb-6">
      {/* 1. Cover Photo Area */}
      <View className="h-32 bg-surface-active dark:bg-surface-active-dark w-full">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} className="w-full h-full" />
        ) : (
          <View className="flex-1 bg-surface-active dark:bg-surface-active-dark border-b border-divider dark:border-divider-dark" />
        )}
      </View>

      {/* 2. Top Row: Avatar & Top-Right Actions */}
      <View className="flex-row justify-between px-4 -mt-12">
        {/* Left: Overlapping Avatar */}
        <View className="w-24 h-24 bg-surface-card dark:bg-surface-card-dark rounded-full p-1 shadow-sm border border-divider dark:border-divider-dark">
          <View className="w-full h-full bg-surface dark:bg-surface-dark rounded-full items-center justify-center overflow-hidden">
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} className="w-full h-full" />
            ) : (
              <Text className="text-3xl font-bold text-on-surface-soft dark:text-on-surface-soft-dark">
                {name.charAt(0)}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Rating & Edit Button */}
        <View className="flex-row items-center pt-14 gap-2">
          {rating !== undefined && rating !== null ? (
            <View className="h-8 flex-row items-center bg-amber-50 dark:bg-amber-950/40 px-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-700 dark:text-amber-300 font-bold text-xs ml-1">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}

          {onEdit ? (
            <Pressable
              className="h-8 w-8 items-center justify-center bg-surface dark:bg-surface-dark rounded-lg border border-divider dark:border-divider-dark"
              onPress={onEdit}
            >
              <Ionicons name="pencil" size={18} color="#4b5563" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 3. Name */}
      <View className="px-4 mt-2 items-start">
        <Text testID="profile-name" className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
          {name}
        </Text>
      </View>

      {/* 4. Bio */}
      <View className="px-4 mt-3">
        <Text className="text-base text-on-surface-soft dark:text-on-surface-soft-dark leading-relaxed">
          {visibleBio}
        </Text>
        {shouldShowReadMore && (
          <Pressable
            onPress={() => setIsBioExpanded((current) => !current)}
            style={({ pressed }) => [{ opacity: 1 } ]}
            className="mt-2 self-start"
          >
            <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {isBioExpanded ? "Show less" : "Read more"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Impact Stats Row */}
      <View className="px-4 mt-6">
        <View className="flex-row items-center justify-between bg-surface dark:bg-surface-dark p-4 rounded-2xl border border-divider dark:border-divider-dark">
          <View className="items-center flex-1 border-r border-divider dark:border-divider-dark">
            <Text className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mb-0.5">
              {totalSessions}
            </Text>
            <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider">
              Sessions
            </Text>
          </View>

          {showMenteesHelped ? (
            <View testID="mentees-section" className="items-center flex-1 border-r border-divider dark:border-divider-dark">
              <Text testID="mentees-count" className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-0.5">
                {menteesHelped}
              </Text>
              <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider">
                Mentees
              </Text>
            </View>
          ) : null}

          <View className="items-center flex-1">
            <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark mb-0.5">
              {reviewCount}
            </Text>
            <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider">
              Reviews
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
