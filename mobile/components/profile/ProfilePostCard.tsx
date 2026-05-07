import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";

import { BasicFormattedText } from "@/components/ui/BasicFormattedText";
import { FocusedImageModal } from "@/components/ui/FocusedImageModal";
import type { ProfilePost } from "@/lib/queries/profile";

const EVENT_TYPE_LABELS: Record<string, string> = {
  achievement: "Achievement",
  social: "Social moment",
  progress: "Progress update",
};

function getAccentColor(eventType: string): string {
  if (eventType === "achievement") {
    return "text-amber-600 dark:text-amber-400";
  }
  if (eventType === "social") {
    return "text-sky-600 dark:text-sky-400";
  }
  return "text-emerald-600 dark:text-emerald-400";
}

function getIconName(
  category: string,
  eventType: string,
): React.ComponentProps<typeof Ionicons>["name"] {
  if (eventType === "achievement") {
    return "trophy-outline";
  }
  if (eventType === "social") {
    return "people-outline";
  }
  if (category === "CoP") {
    return "chatbubbles-outline";
  }
  return "trending-up-outline";
}

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

function isImageMediaUrl(mediaUrl: string): boolean {
  const normalized = mediaUrl.split("?")[0]?.toLowerCase() ?? "";
  const filename = normalized.split("/").pop() ?? "";
  if (filename.endsWith(".pdf")) {
    return false;
  }

  return /\.(jpe?g|png|gif|webp)$/.test(filename) || !filename.includes(".");
}

function getUnmentionedTaggedUsers(post: ProfilePost) {
  const mentionedUsernames = new Set(
    Array.from(post.content.matchAll(/(^|\s)@([a-zA-Z0-9_]+)/g)).map((match) =>
      (match[2] ?? "").toLowerCase(),
    ),
  );

  return (post.tagged_users ?? []).filter((user) => {
    const username = user.username.trim();
    return username && !mentionedUsernames.has(username.toLowerCase());
  });
}

interface ProfilePostCardProps {
  post: ProfilePost;
  /** When true, content is not truncated. Default: false (preview mode). */
  expanded?: boolean;
  communityLabel?: string | null;
  mentionSourceCommunityId?: string | null;
  onCommunityPress?: (communityId: string) => void;
}

/**
 * Displays a single profile feed post (PrP or public MCTE).
 * Used both in the horizontal preview strip (expanded=false)
 * and in the full posts list screen (expanded=true).
 */
export function ProfilePostCard({
  post,
  expanded = false,
  communityLabel,
  mentionSourceCommunityId,
  onCommunityPress,
}: Readonly<ProfilePostCardProps>) {
  const router = useRouter();
  const label = EVENT_TYPE_LABELS[post.event_type] ?? post.event_type;
  const dateLabel = formatPostTimestamp(post.timestamp);
  const effectiveCommunityLabel = communityLabel ?? post.community_name ?? null;
  const authorName =
    post.author?.display_name || post.author?.username || "Unknown user";
  const authorSubtitle = post.author?.title || post.author?.username || "";
  const accentColor = getAccentColor(post.event_type);
  const iconName = getIconName(post.category, post.event_type);
  const hasImageMedia = post.media_url ? isImageMediaUrl(post.media_url) : false;
  const unmentionedTaggedUsers = getUnmentionedTaggedUsers(post);
  const [focusedImageUrl, setFocusedImageUrl] = useState<string | null>(null);
  const openUserProfile = (username: string) => {
    const encodedUsername = encodeURIComponent(username);
    const route = mentionSourceCommunityId
      ? `/(tabs)/user/${encodedUsername}?from=community&tagId=${encodeURIComponent(mentionSourceCommunityId)}`
      : `/user/${encodedUsername}`;
    router.push(route as Href);
  };

  return (
    <View
      testID={`post-card-${post.id}`}
      className="rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark p-4"
    >
      <View className="mb-3 flex-row items-center gap-3">
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
            {post.category === "CoP" && effectiveCommunityLabel ? (
              <TouchableOpacity
                testID={`post-card-community-${post.id}`}
                activeOpacity={post.community_id ? 0.75 : 1}
                disabled={!post.community_id}
                onPress={() => {
                  if (post.community_id) {
                    onCommunityPress?.(post.community_id);
                  }
                }}
                className="mt-0.5 flex-row items-center gap-1 self-start"
              >
                <Ionicons
                  testID={`post-card-community-icon-${post.id}`}
                  name="pricetag-outline"
                  size={11}
                  color="#6b7280"
                />
                <Text className="text-[11px] text-on-surface-muted dark:text-on-surface-muted-dark">
                  {effectiveCommunityLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mb-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons
            testID={`post-card-event-icon-${post.id}`}
            name={iconName}
            size={14}
            color="#6b7280"
          />
          <Text className={`text-xs font-bold ${accentColor}`}>{label}</Text>
        </View>
      </View>

      {/* Content */}
      {post.content ? (
        <BasicFormattedText
          testID={`post-card-content-${post.id}`}
          numberOfLines={expanded ? undefined : 3}
          className="text-sm leading-5 text-on-surface dark:text-on-surface-dark"
          onMentionPress={openUserProfile}
        >
          {post.content}
        </BasicFormattedText>
      ) : null}

      {unmentionedTaggedUsers.length > 0 ? (
        <View
          testID={`post-card-tagged-users-${post.id}`}
          className="mt-3 flex-row flex-wrap items-center gap-2"
        >
          <Text className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
            With
          </Text>
          {unmentionedTaggedUsers.map((user) => (
            <TouchableOpacity
              key={`${user.user_id}-${user.username}`}
              testID={`post-card-tagged-user-${post.id}-${user.username}`}
              activeOpacity={0.75}
              onPress={() => openUserProfile(user.username)}
            >
              <Text className="text-xs font-bold text-primary dark:text-primary-dim">
                @{user.username}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {post.media_url && hasImageMedia ? (
        <TouchableOpacity
          testID={`post-card-media-button-${post.id}`}
          activeOpacity={0.9}
          onPress={() => setFocusedImageUrl(post.media_url ?? null)}
        >
          <Image
            testID={`post-card-media-${post.id}`}
            source={{ uri: post.media_url }}
            className={`mt-3 w-full rounded-xl bg-surface-active dark:bg-surface-active-dark ${
              expanded ? "h-72" : "h-52"
            }`}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : null}

      {post.media_url && !hasImageMedia ? (
        <TouchableOpacity
          testID={`post-card-attachment-${post.id}`}
          activeOpacity={0.82}
          onPress={() => {
            void Linking.openURL(post.media_url ?? "");
          }}
          className="mt-3 flex-row items-center gap-3 rounded-xl border border-divider bg-surface-active px-3 py-3 dark:border-divider-dark dark:bg-surface-active-dark"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-card dark:bg-surface-card-dark">
            <Ionicons name="document-attach-outline" size={20} color="#2f7d68" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark">
              Attachment
            </Text>
            <Text
              numberOfLines={1}
              className="text-xs text-on-surface-soft dark:text-on-surface-soft-dark"
            >
              Open file
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <FocusedImageModal
        visible={Boolean(focusedImageUrl)}
        imageUrl={focusedImageUrl}
        onClose={() => setFocusedImageUrl(null)}
      />
    </View>
  );
}
