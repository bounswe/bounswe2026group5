import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, View } from "react-native";

import type { ProfilePost } from "@/lib/queries/profile";

const EVENT_TYPE_LABELS: Record<string, string> = {
  achievement: "Achievement",
  social: "Social moment",
  progress: "Progress update",
};

const CATEGORY_LABELS: Record<string, string> = {
  PrP: "Post",
  MCTE: "Milestone",
};

function formatPostTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  return initials || "?";
}

interface ProfilePostCardProps {
  post: ProfilePost;
  /** When true, content is not truncated. Default: false (preview mode). */
  expanded?: boolean;
}

/**
 * Displays a single profile feed post (PrP or public MCTE).
 * Used both in the horizontal preview strip (expanded=false)
 * and in the full posts list screen (expanded=true).
 */
export function ProfilePostCard({
  post,
  expanded = false,
}: Readonly<ProfilePostCardProps>) {
  const label = EVENT_TYPE_LABELS[post.event_type] ?? post.event_type;
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;
  const dateLabel = formatPostTimestamp(post.timestamp);
  const authorName =
    post.author?.display_name || post.author?.username || "Unknown user";
  const authorSubtitle = post.author?.title || post.author?.username || "";

  const isAchievement = post.event_type === "achievement";
  const accentColor = isAchievement
    ? "text-amber-600 dark:text-amber-400"
    : post.event_type === "social"
      ? "text-sky-600 dark:text-sky-400"
      : "text-emerald-600 dark:text-emerald-400";

  const iconName: React.ComponentProps<typeof Ionicons>["name"] =
    isAchievement
      ? "trophy-outline"
      : post.event_type === "social"
        ? "people-outline"
        : "trending-up-outline";

  return (
    <View
      testID={`post-card-${post.id}`}
      className="rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark p-4"
    >
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          {post.author?.picture_url ? (
            <Image
              testID={`post-card-avatar-${post.id}`}
              source={{ uri: post.author.picture_url }}
              className="h-10 w-10 rounded-full bg-surface-active dark:bg-surface-active-dark"
              resizeMode="cover"
            />
          ) : (
            <View
              testID={`post-card-avatar-fallback-${post.id}`}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-active dark:bg-surface-active-dark"
            >
              <Text className="text-sm font-extrabold text-primary dark:text-primary-dim">
                {getInitials(authorName)}
              </Text>
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="text-sm font-bold text-on-surface dark:text-on-surface-dark"
            >
              {authorName}
            </Text>
            <Text
              numberOfLines={1}
              className="text-xs text-on-surface-muted dark:text-on-surface-muted-dark"
            >
              {authorSubtitle ? `${authorSubtitle} - ${dateLabel}` : dateLabel}
            </Text>
          </View>
        </View>
        <View className="rounded-full bg-surface-active dark:bg-gray-800 px-2 py-0.5">
          <Text className="text-[10px] font-black uppercase text-on-surface-muted dark:text-on-surface-muted-dark">
            {categoryLabel}
          </Text>
        </View>
      </View>

      <View className="mb-2 flex-row items-center gap-1.5">
        <Ionicons name={iconName} size={14} color="#6b7280" />
        <Text className={`text-xs font-bold ${accentColor}`}>{label}</Text>
      </View>

      {/* Content */}
      {post.content ? (
        <Text
          testID={`post-card-content-${post.id}`}
          numberOfLines={expanded ? undefined : 3}
          className="text-sm leading-5 text-on-surface dark:text-on-surface-dark"
        >
          {post.content}
        </Text>
      ) : null}

      {/* Media thumbnail */}
      {post.media_url ? (
        <Image
          testID={`post-card-media-${post.id}`}
          source={{ uri: post.media_url }}
          className="mt-3 h-36 w-full rounded-xl bg-surface-active dark:bg-surface-active-dark"
          resizeMode="cover"
        />
      ) : null}

    </View>
  );
}
