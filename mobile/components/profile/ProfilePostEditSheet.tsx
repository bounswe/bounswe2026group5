import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";
import type { CommunityTaggableUser } from "@/lib/queries/communityTags";
import type { ProfilePost } from "@/lib/queries/profile";

const EVENT_TYPES: {
  value: ProfilePost["event_type"];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "achievement", label: "Achievement", icon: "trophy-outline" },
  { value: "social", label: "Social", icon: "people-outline" },
  { value: "progress", label: "Progress", icon: "trending-up-outline" },
];

function getMentionedUsernames(
  content: string,
  taggableUsersByUsername: Map<string, CommunityTaggableUser>,
) {
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
}

export function ProfilePostEditSheet({
  isDeleting,
  isLoadingTaggableUsers,
  isSaving,
  onClose,
  onDelete,
  onSave,
  post,
  taggableUsers = [],
}: Readonly<{
  isDeleting?: boolean;
  isLoadingTaggableUsers?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onDelete: (post: ProfilePost) => Promise<void> | void;
  onSave: (
    post: ProfilePost,
    payload: {
      content: string;
      event_type: ProfilePost["event_type"];
      show_on_profile?: boolean;
      tagged_users?: string[];
    },
  ) => Promise<void> | void;
  post: ProfilePost | null;
  taggableUsers?: CommunityTaggableUser[];
}>) {
  const [content, setContent] = useState("");
  const [eventType, setEventType] =
    useState<ProfilePost["event_type"]>("social");
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [isDeleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false);

  const canEditProfileVisibility = post?.category === "CoP";
  const canEditMentions = post?.category === "CoP";
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
  const activeMentionMatch = canEditMentions
    ? content.match(/(^|\s)@([a-zA-Z0-9_]{0,30})$/)
    : null;
  const activeMentionQuery = activeMentionMatch?.[2]?.toLowerCase() ?? null;
  const mentionedUsernames = useMemo(
    () =>
      canEditMentions
        ? getMentionedUsernames(content, taggableUsersByUsername)
        : [],
    [canEditMentions, content, taggableUsersByUsername],
  );
  const mentionedUsernameLookup = useMemo(
    () => new Set(mentionedUsernames.map((username) => username.toLowerCase())),
    [mentionedUsernames],
  );
  const initialMentionedUsernames = useMemo(
    () =>
      canEditMentions
        ? getMentionedUsernames(post?.content ?? "", taggableUsersByUsername)
        : [],
    [canEditMentions, post?.content, taggableUsersByUsername],
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
  const isBusy = Boolean(isSaving || isDeleting);
  const canSave = Boolean(post) && content.trim().length > 0 && !isBusy;

  useEffect(() => {
    setContent(post?.content ?? "");
    setEventType(post?.event_type ?? "social");
    setShowOnProfile(Boolean(post?.show_on_profile));
    setDeleteConfirmationVisible(false);
  }, [post]);

  const insertMention = (username: string) => {
    const prefix = content.replace(/(^|\s)@([a-zA-Z0-9_]{0,30})$/, "$1");
    setContent(`${prefix}@${username} `);
  };

  const shouldSendTaggedUsers =
    canEditMentions &&
    (initialMentionedUsernames.length > 0 || mentionedUsernames.length > 0);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(post)}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(pressEvent) => pressEvent.stopPropagation()}
          className="w-full rounded-t-3xl bg-surface px-5 pb-8 pt-4 shadow-2xl dark:bg-surface-dark"
        >
          <View className="items-center pb-4">
            <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
                Edit post
              </Text>
              <Text className="mt-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                Update text and post type.
              </Text>
            </View>
            <TouchableOpacity
              testID="profile-post-edit-close"
              activeOpacity={0.8}
              disabled={isBusy}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-card dark:bg-surface-card-dark"
            >
              <Ionicons name="close" size={20} color="#737686" />
            </TouchableOpacity>
          </View>

          <View className="mt-5 flex-row gap-2">
            {EVENT_TYPES.map((item) => {
              const selected = eventType === item.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  testID={`profile-post-edit-type-${item.value}`}
                  activeOpacity={0.82}
                  disabled={isBusy}
                  onPress={() => setEventType(item.value)}
                  className={`flex-1 items-center rounded-xl border px-2 py-2 ${
                    selected
                      ? "border-primary bg-primary/10 dark:border-primary-dim dark:bg-primary-dim/15"
                      : "border-divider bg-surface-card dark:border-divider-dark dark:bg-surface-card-dark"
                  }`}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={selected ? "#2f7d68" : "#737686"}
                  />
                  <Text
                    numberOfLines={1}
                    className={`mt-1 text-[11px] font-bold ${
                      selected
                        ? "text-primary dark:text-primary-dim"
                        : "text-on-surface-muted dark:text-on-surface-muted-dark"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            testID="profile-post-edit-content"
            value={content}
            editable={!isBusy}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            className="mt-4 min-h-[120px] rounded-xl border border-divider bg-surface-card px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-card-dark dark:text-on-surface-dark"
          />

          {isLoadingTaggableUsers && activeMentionQuery !== null ? (
            <Text className="mt-2 text-xs text-on-surface-muted dark:text-on-surface-muted-dark">
              Loading taggable users...
            </Text>
          ) : null}

          {mentionSuggestions.length > 0 ? (
            <View
              testID="profile-post-edit-mention-suggestions"
              className="mt-2 overflow-hidden rounded-xl border border-divider bg-surface dark:border-divider-dark dark:bg-surface-dark"
            >
              {mentionSuggestions.map((user, index) => (
                <TouchableOpacity
                  key={user.username}
                  testID={`profile-post-edit-mention-suggestion-${user.username}`}
                  activeOpacity={0.75}
                  disabled={isBusy}
                  onPress={() => insertMention(user.username)}
                  className={`flex-row items-center gap-3 px-3 py-2.5 ${
                    index < mentionSuggestions.length - 1
                      ? "border-b border-divider dark:border-divider-dark"
                      : ""
                  }`}
                >
                  <Ionicons name="person-add-outline" size={15} color="#2f7d68" />
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

          {canEditProfileVisibility ? (
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
                testID="profile-post-edit-profile-toggle"
                value={showOnProfile}
                disabled={isBusy}
                onValueChange={setShowOnProfile}
                trackColor={{ false: "#d1d5db", true: "#9ed6c0" }}
                thumbColor={showOnProfile ? "#2f7d68" : "#f4f4f5"}
              />
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            <TouchableOpacity
              testID="profile-post-edit-save"
              activeOpacity={0.9}
              disabled={!canSave}
              onPress={() => {
                if (post && canSave) {
                  void onSave(post, {
                    content: content.trim(),
                    event_type: eventType,
                    ...(canEditProfileVisibility
                      ? { show_on_profile: showOnProfile }
                      : {}),
                    ...(shouldSendTaggedUsers
                      ? { tagged_users: mentionedUsernames }
                      : {}),
                  });
                }
              }}
              className={`h-12 items-center justify-center rounded-xl ${
                canSave ? "bg-primary dark:bg-primary-dim" : "bg-gray-300"
              }`}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="font-bold text-white">Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="profile-post-edit-delete"
              activeOpacity={0.86}
              disabled={isBusy || !post}
              onPress={() => setDeleteConfirmationVisible(true)}
              className="h-12 items-center justify-center rounded-xl border border-error/60 bg-surface-card dark:border-red-900/60 dark:bg-surface-card-dark"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <Text className="font-bold text-error dark:text-red-200">
                  Delete Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      <ConfirmationSheet
        visible={Boolean(post) && isDeleteConfirmationVisible}
        title="Delete post?"
        message="This post will be removed from your feed. This action cannot be undone."
        confirmLabel="Delete Post"
        cancelLabel="Keep Post"
        variant="destructive"
        isConfirming={isDeleting}
        onCancel={() => setDeleteConfirmationVisible(false)}
        onConfirm={() => {
          if (post) {
            void onDelete(post);
          }
        }}
      />
    </Modal>
  );
}
