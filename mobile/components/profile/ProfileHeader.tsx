import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAbsoluteImageUrl, getAbsoluteUrl } from "@/lib/api/config";

const BIO_PREVIEW_LENGTH = 240;

interface ProfileHeaderProps {
  name: string;
  bio: string;
  rating?: number;
  reviewCount?: number;
  openSlots?: number;
  menteesHelped?: number;
  showStats?: boolean;
  showRating?: boolean;
  showMenteesHelped?: boolean;
  imageUrl?: string;
  imageCacheKey?: string | number;
  coverUrl?: string;
  onEdit?: () => void;
}

export function ProfileHeader({
  name,
  bio,
  rating,
  reviewCount = 0,
  openSlots = 0,
  menteesHelped = 0,
  showStats = true,
  showRating = true,
  showMenteesHelped = true,
  imageUrl,
  imageCacheKey,
  coverUrl,
  onEdit,
}: Readonly<ProfileHeaderProps>) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isAvatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

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
    <View className="bg-surface dark:bg-surface-dark mb-6">
      {/* 1. Cover Photo Area */}
      <View className="h-32 bg-surface-active dark:bg-surface-active-dark w-full">
        {coverUrl ? (
          <Image source={{ uri: getAbsoluteUrl(coverUrl) }} className="w-full h-full" />
        ) : (
          <View className="flex-1 bg-surface-active dark:bg-surface-active-dark border-b border-divider dark:border-divider-dark" />
        )}
      </View>

      {/* 2. Top Row: Avatar & Top-Right Actions */}
      <View className="flex-row justify-between px-4 -mt-12">
        {/* Left: Overlapping Avatar */}
        <Pressable
          testID={imageUrl ? "profile-avatar-button" : undefined}
          disabled={!imageUrl}
          onPress={() => setAvatarPreviewOpen(true)}
          className="w-24 h-24 bg-surface-card dark:bg-surface-card-dark rounded-full p-1 shadow-sm border border-divider dark:border-divider-dark"
        >
          <View className="w-full h-full bg-surface dark:bg-surface-dark rounded-full items-center justify-center overflow-hidden">
            {imageUrl ? (
              <Image
                testID="profile-avatar-image"
                source={{ uri: getAbsoluteImageUrl(imageUrl, imageCacheKey) }}
                className="w-full h-full"
              />
            ) : (
              <Text
                testID="profile-avatar-fallback"
                className="text-3xl font-bold text-on-surface-soft dark:text-on-surface-soft-dark"
              >
                {name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Right: Rating & Edit Button */}
        <View className="flex-row items-center pt-14 gap-2">
          {showRating && rating !== undefined && rating !== null ? (
            <View className="h-8 flex-row items-center bg-amber-50 dark:bg-amber-950/40 px-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-700 dark:text-amber-300 font-bold text-xs ml-1">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}

          {onEdit ? (
            <Pressable
              testID="profile-edit-button"
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

      {showStats ? (
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between bg-surface dark:bg-surface-dark p-4 rounded-2xl border border-divider dark:border-divider-dark">
            <View className="items-center flex-1 border-r border-divider dark:border-divider-dark">
              <Text className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mb-0.5">
                {openSlots}
              </Text>
              <Text className="text-xs font-bold text-on-surface-muted dark:text-on-surface-muted-dark uppercase tracking-wider">
                Open Slots
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
      ) : null}

      <Modal
        visible={isAvatarPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPreviewOpen(false)}
      >
        <Pressable
          testID="profile-avatar-preview-backdrop"
          className="flex-1 items-center justify-center bg-black/80 px-6"
          onPress={() => setAvatarPreviewOpen(false)}
        >
          {imageUrl ? (
            <Image
              testID="profile-avatar-preview-image"
              source={{ uri: getAbsoluteImageUrl(imageUrl, imageCacheKey) }}
              className="h-80 w-80 max-w-full rounded-3xl bg-surface-card"
              resizeMode="cover"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
