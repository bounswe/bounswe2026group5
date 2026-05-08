import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PostMediaPicker } from "@/components/posts/PostMediaPicker";
import { uploadPostMedia } from "@/lib/queries/uploads";
import type { LocalUploadFile } from "@/lib/queries/uploads";
import type { CreateCommunityPostPayload } from "@/lib/queries/communityPosts";
import type { CommunityTaggableUser } from "@/lib/queries/communityTags";

const EVENT_TYPES: {
  value: CreateCommunityPostPayload["event_type"];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "achievement", label: "Achievement", icon: "trophy-outline" },
  { value: "social", label: "Social", icon: "people-outline" },
  { value: "progress", label: "Progress", icon: "trending-up-outline" },
];

export function CommunityPostComposer({
  isSubmitting,
  isLoadingTaggableUsers,
  onSubmit,
  taggableUsers = [],
}: Readonly<{
  isSubmitting?: boolean;
  isLoadingTaggableUsers?: boolean;
  onSubmit: (
    payload: Omit<CreateCommunityPostPayload, "tagId">,
  ) => Promise<boolean | void> | boolean | void;
  taggableUsers?: CommunityTaggableUser[];
}>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [eventType, setEventType] =
    useState<CreateCommunityPostPayload["event_type"]>("social");
  const [content, setContent] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [media, setMedia] = useState<LocalUploadFile | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isUploadingMedia, setUploadingMedia] = useState(false);

  const isBusy = Boolean(isSubmitting) || isUploadingMedia;
  const canSubmit = content.trim().length > 0 && !isBusy;
  const taggableUsersByUsername = useMemo(
    () =>
      new Map(
        taggableUsers.map((user) => [
          user.username.trim().toLowerCase(),
          user,
        ]),
      ),
    [taggableUsers],
  );
  const activeMentionMatch = content.match(/(^|\s)@([a-zA-Z0-9_]{0,30})$/);
  const activeMentionQuery = activeMentionMatch?.[2]?.toLowerCase() ?? null;
  const mentionedUsernames = useMemo(() => {
    const usernames = new Set<string>();
    for (const match of content.matchAll(/(^|\s)@([a-zA-Z0-9_]+)/g)) {
      const username = match[2]?.toLowerCase();
      const taggableUser = username
        ? taggableUsersByUsername.get(username)
        : undefined;
      if (taggableUser) {
        usernames.add(taggableUser.username);
      }
    }
    return Array.from(usernames).slice(0, 5);
  }, [content, taggableUsersByUsername]);
  const mentionedUsernameLookup = useMemo(
    () => new Set(mentionedUsernames.map((username) => username.toLowerCase())),
    [mentionedUsernames],
  );
  const mentionSuggestions = useMemo(() => {
    if (activeMentionQuery === null) {
      return [];
    }
    return taggableUsers
      .filter((user) => {
        const username = user.username.trim().toLowerCase();
        const displayName = user.display_name.trim().toLowerCase();
        return (
          !mentionedUsernameLookup.has(username) &&
          (username.includes(activeMentionQuery) ||
            displayName.includes(activeMentionQuery))
        );
      })
      .slice(0, 5);
  }, [activeMentionQuery, mentionedUsernameLookup, taggableUsers]);

  const resetForm = () => {
    setContent("");
    setShowOnProfile(false);
    setEventType("social");
    setMedia(null);
    setMediaError(null);
  };

  const insertMention = (username: string) => {
    const prefix = content.replace(/(^|\s)@([a-zA-Z0-9_]{0,30})$/, "$1");
    setContent(`${prefix}@${username} `);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setMediaError(null);

    let mediaUrl: string | null | undefined;
    if (media) {
      try {
        setUploadingMedia(true);
        const uploadResponse = await uploadPostMedia(media);
        mediaUrl = uploadResponse.url;
      } catch (error) {
        setMediaError(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Could not upload this photo.",
        );
        return;
      } finally {
        setUploadingMedia(false);
      }
    }

    const didSubmit = await onSubmit({
      event_type: eventType,
      content: content.trim(),
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
      show_on_profile: showOnProfile,
      ...(mentionedUsernames.length > 0
        ? { tagged_users: mentionedUsernames }
        : {}),
    });

    if (didSubmit === false) {
      return;
    }

    resetForm();
  };

  return (
    <View className="mb-6 rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-on-surface dark:text-on-surface-dark">
            Post to community
          </Text>
          <Text className="mt-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
            Share an update with this community.
          </Text>
        </View>
        <TouchableOpacity
          testID="community-composer-toggle"
          activeOpacity={0.8}
          onPress={() => setIsExpanded((current) => !current)}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
        >
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#2f7d68"
          />
        </TouchableOpacity>
      </View>

      {isExpanded ? (
        <>
          <View className="mt-4 flex-row gap-2">
            {EVENT_TYPES.map((item) => {
              const selected = eventType === item.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  testID={`community-composer-type-${item.value}`}
                  activeOpacity={0.82}
                  onPress={() => setEventType(item.value)}
                  className={`flex-1 items-center rounded-xl border px-2 py-2 ${
                    selected
                      ? "border-primary bg-primary/10 dark:border-primary-dim dark:bg-primary-dim/15"
                      : "border-divider bg-surface dark:border-divider-dark dark:bg-surface-dark"
                  }`}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={selected ? "#2f7d68" : "#737686"}
                  />
                  <Text
                    className={`mt-1 text-[11px] font-bold ${
                      selected
                        ? "text-primary dark:text-primary-dim"
                        : "text-on-surface-muted dark:text-on-surface-muted-dark"
                    }`}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            testID="community-composer-content"
            value={content}
            onChangeText={setContent}
            placeholder="What is happening in this community?"
            placeholderTextColor="#8b8d98"
            multiline
            textAlignVertical="top"
            className="mt-4 min-h-[120px] rounded-xl border border-divider bg-surface px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-dark dark:text-on-surface-dark"
          />

          {isLoadingTaggableUsers && activeMentionQuery !== null ? (
            <Text className="mt-2 text-xs text-on-surface-muted dark:text-on-surface-muted-dark">
              Loading taggable users...
            </Text>
          ) : null}

          {mentionSuggestions.length > 0 ? (
            <View
              testID="community-composer-mention-suggestions"
              className="mt-2 overflow-hidden rounded-xl border border-divider bg-surface dark:border-divider-dark dark:bg-surface-dark"
            >
              {mentionSuggestions.map((user, index) => (
                <TouchableOpacity
                  key={user.username}
                  testID={`community-composer-mention-suggestion-${user.username}`}
                  activeOpacity={0.75}
                  onPress={() => insertMention(user.username)}
                  className={`flex-row items-center gap-3 px-3 py-2.5 ${
                    index < mentionSuggestions.length - 1
                      ? "border-b border-divider dark:border-divider-dark"
                      : ""
                  }`}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-dim/15">
                    <Ionicons
                      name="person-add-outline"
                      size={15}
                      color="#2f7d68"
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-bold text-on-surface dark:text-on-surface-dark"
                    >
                      @{user.username}
                    </Text>
                    {user.display_name.trim() ? (
                      <Text
                        numberOfLines={1}
                        className="text-xs text-on-surface-muted dark:text-on-surface-muted-dark"
                      >
                        {user.display_name}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <PostMediaPicker
            disabled={isBusy}
            media={media}
            onChange={(nextMedia) => {
              setMediaError(null);
              setMedia(nextMedia);
            }}
            onError={setMediaError}
            testIDPrefix="community-composer"
          />

          {mediaError ? (
            <Text
              testID="community-composer-media-error"
              className="mt-2 text-xs font-semibold text-error dark:text-red-200"
            >
              {mediaError}
            </Text>
          ) : null}

          <View className="mt-4 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark">
                Show on my profile
              </Text>
              <Text className="mt-0.5 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                Shared posts can also surface on your profile feed.
              </Text>
            </View>
            <Switch
              testID="community-composer-profile-toggle"
              value={showOnProfile}
              onValueChange={setShowOnProfile}
              trackColor={{ false: "#d1d5db", true: "#9ed6c0" }}
              thumbColor={showOnProfile ? "#2f7d68" : "#f4f4f5"}
            />
          </View>

          <TouchableOpacity
            testID="community-composer-submit"
            activeOpacity={0.9}
            disabled={!canSubmit}
            onPress={handleSubmit}
            className={`mt-4 h-11 items-center justify-center rounded-xl ${
              canSubmit ? "bg-primary dark:bg-primary-dim" : "bg-gray-300"
            }`}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="font-bold text-white">Post to Community</Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}
