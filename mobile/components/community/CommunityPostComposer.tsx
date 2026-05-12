import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PostMediaPicker } from "@/components/posts/PostMediaPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { uploadPostMedia } from "@/lib/queries/uploads";
import type { LocalUploadFile } from "@/lib/queries/uploads";
import type { CreateCommunityPostPayload } from "@/lib/queries/communityPosts";
import type { CommunityTaggableUser } from "@/lib/queries/communityTags";
import type { CreateCommunityWorkshopPayload } from "@/lib/queries/workshops";

const EVENT_TYPES: {
  value: CreateCommunityPostPayload["event_type"];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "achievement", label: "Achievement", icon: "trophy-outline" },
  { value: "social", label: "Social", icon: "people-outline" },
  { value: "progress", label: "Progress", icon: "trending-up-outline" },
];

type WorkshopPickerMode = "date" | "startTime" | "endTime" | null;

export function CommunityPostComposer({
  isSubmitting,
  isLoadingTaggableUsers,
  onSubmit,
  onSubmitWorkshop,
  allowWorkshopCreation = false,
  taggableUsers = [],
}: Readonly<{
  isSubmitting?: boolean;
  isLoadingTaggableUsers?: boolean;
  onSubmit: (
    payload: Omit<CreateCommunityPostPayload, "tagId">,
  ) => Promise<boolean | void> | boolean | void;
  onSubmitWorkshop?: (
    payload: Omit<CreateCommunityWorkshopPayload, "tagId">,
  ) => Promise<boolean | void> | boolean | void;
  allowWorkshopCreation?: boolean;
  taggableUsers?: CommunityTaggableUser[];
}>) {
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<"post" | "workshop">("post");
  const [eventType, setEventType] =
    useState<CreateCommunityPostPayload["event_type"]>("social");
  const [content, setContent] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [media, setMedia] = useState<LocalUploadFile | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isUploadingMedia, setUploadingMedia] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [workshopTitle, setWorkshopTitle] = useState("");
  const [workshopDescription, setWorkshopDescription] = useState("");
  const [workshopDate, setWorkshopDate] = useState<Date | null>(null);
  const [workshopStartTime, setWorkshopStartTime] = useState<Date | null>(null);
  const [workshopEndTime, setWorkshopEndTime] = useState<Date | null>(null);
  const [workshopMaxParticipants, setWorkshopMaxParticipants] = useState("");
  const [activePicker, setActivePicker] = useState<WorkshopPickerMode>(null);
  const [pickerDraftValue, setPickerDraftValue] = useState(new Date());

  const isBusy = Boolean(isSubmitting) || isUploadingMedia;
  const canSubmit =
    mode === "workshop"
      ? workshopTitle.trim().length > 0 &&
        workshopDate !== null &&
        workshopStartTime !== null &&
        workshopEndTime !== null &&
        workshopMaxParticipants.trim().length > 0 &&
        !isBusy
      : content.trim().length > 0 && !isBusy;
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
    setMode("post");
    setContent("");
    setShowOnProfile(false);
    setEventType("social");
    setMedia(null);
    setMediaError(null);
    setFormError(null);
    setWorkshopTitle("");
    setWorkshopDescription("");
    setWorkshopDate(null);
    setWorkshopStartTime(null);
    setWorkshopEndTime(null);
    setWorkshopMaxParticipants("");
    setActivePicker(null);
    setPickerDraftValue(new Date());
  };

  const insertMention = (username: string) => {
    const prefix = content.replace(/(^|\s)@([a-zA-Z0-9_]{0,30})$/, "$1");
    setContent(`${prefix}@${username} `);
  };

  const formatWorkshopDate = (value: Date | null) => {
    if (!value) {
      return "Select date";
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatWorkshopTime = (value: Date | null) => {
    if (!value) {
      return "Select time";
    }

    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const buildWorkshopDateTime = (dateValue: Date, timeValue: Date) => {
    const combined = new Date(dateValue);
    combined.setHours(
      timeValue.getHours(),
      timeValue.getMinutes(),
      0,
      0,
    );

    return combined.toISOString();
  };

  const showWorkshopValidationError = (message: string) => {
    setFormError(message);
    toast.warning(message, { title: "Workshop details" });
  };

  const openPicker = (pickerMode: Exclude<WorkshopPickerMode, null>) => {
    setFormError(null);
    const nextValue =
      pickerMode === "date"
        ? workshopDate ?? new Date()
        : pickerMode === "startTime"
          ? workshopStartTime ?? new Date()
          : workshopEndTime ?? workshopStartTime ?? new Date();

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: nextValue,
        mode: pickerMode === "date" ? "date" : "time",
        is24Hour: true,
        onChange: (event, selectedValue) => {
          if (event.type === "dismissed" || !selectedValue) {
            return;
          }

          if (pickerMode === "date") {
            setWorkshopDate(selectedValue);
          } else if (pickerMode === "startTime") {
            setWorkshopStartTime(selectedValue);
          } else {
            setWorkshopEndTime(selectedValue);
          }
        },
      });
      return;
    }

    setPickerDraftValue(nextValue);
    setActivePicker(pickerMode);
  };

  const handleWorkshopPickerChange = (
    event: { type?: string },
    selectedValue?: Date,
  ) => {
    if (event.type === "dismissed") {
      setActivePicker(null);
      return;
    }

    if (!selectedValue || !activePicker) {
      return;
    }

    setPickerDraftValue(selectedValue);
    setFormError(null);
  };

  const confirmPickerSelection = () => {
    if (!activePicker) {
      return;
    }

    if (activePicker === "date") {
      setWorkshopDate(pickerDraftValue);
    } else if (activePicker === "startTime") {
      setWorkshopStartTime(pickerDraftValue);
    } else {
      setWorkshopEndTime(pickerDraftValue);
    }

    setActivePicker(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setMediaError(null);
    setFormError(null);

    if (mode === "workshop") {
      if (!onSubmitWorkshop) {
        showWorkshopValidationError(
          "Workshop creation is not available right now.",
        );
        return;
      }

      if (!workshopDate || !workshopStartTime || !workshopEndTime) {
        showWorkshopValidationError(
          "Pick a workshop date, start time, and end time.",
        );
        return;
      }

      const scheduled_at = buildWorkshopDateTime(workshopDate, workshopStartTime);
      const end_at = buildWorkshopDateTime(workshopDate, workshopEndTime);
      const maxParticipants = Number(workshopMaxParticipants.trim());

      if (!Number.isInteger(maxParticipants) || !(maxParticipants > 0)) {
        showWorkshopValidationError(
          "Maximum participants must be a whole number greater than 0.",
        );
        return;
      }

      if (new Date(end_at).getTime() <= new Date(scheduled_at).getTime()) {
        showWorkshopValidationError(
          "Workshop end time must be after the start time.",
        );
        return;
      }

      const didSubmit = await onSubmitWorkshop({
        title: workshopTitle.trim(),
        description: workshopDescription.trim(),
        scheduled_at,
        end_at,
        max_participants: maxParticipants,
      });

      if (didSubmit === false) {
        return;
      }

      resetForm();
      return;
    }

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
            {allowWorkshopCreation
              ? "Post or host in community"
              : "Post to community"}
          </Text>
          <Text className="mt-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
            {allowWorkshopCreation
              ? "Share an update or create a mentor-led workshop."
              : "Share an update with this community."}
          </Text>
          {allowWorkshopCreation ? (
            <View className="mt-3 flex-row gap-2">
              <View className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 dark:border-primary-dim/30 dark:bg-primary-dim/10">
                <Text className="text-[11px] font-bold text-primary dark:text-primary-dim">
                  Posts
                </Text>
              </View>
              <View className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 dark:border-primary-dim/30 dark:bg-primary-dim/10">
                <Text className="text-[11px] font-bold text-primary dark:text-primary-dim">
                  Workshops
                </Text>
              </View>
            </View>
          ) : null}
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
          {allowWorkshopCreation ? (
            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity
                testID="community-composer-mode-post"
                activeOpacity={0.82}
                onPress={() => {
                  setFormError(null);
                  setMode("post");
                }}
                className={`flex-1 rounded-xl border px-3 py-2.5 ${
                  mode === "post"
                    ? "border-primary bg-primary/10 dark:border-primary-dim dark:bg-primary-dim/15"
                    : "border-divider bg-surface dark:border-divider-dark dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-center text-sm font-bold ${
                    mode === "post"
                      ? "text-primary dark:text-primary-dim"
                      : "text-on-surface-muted dark:text-on-surface-muted-dark"
                  }`}
                >
                  Post
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="community-composer-mode-workshop"
                activeOpacity={0.82}
                onPress={() => {
                  setMedia(null);
                  setMediaError(null);
                  setFormError(null);
                  setActivePicker(null);
                  setMode("workshop");
                }}
                className={`flex-1 rounded-xl border px-3 py-2.5 ${
                  mode === "workshop"
                    ? "border-primary bg-primary/10 dark:border-primary-dim dark:bg-primary-dim/15"
                    : "border-divider bg-surface dark:border-divider-dark dark:bg-surface-dark"
                }`}
              >
                <Text
                  className={`text-center text-sm font-bold ${
                    mode === "workshop"
                      ? "text-primary dark:text-primary-dim"
                      : "text-on-surface-muted dark:text-on-surface-muted-dark"
                  }`}
                >
                  Workshop
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {mode === "post" ? (
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
            </>
          ) : (
            <>
              <TextInput
                testID="community-composer-workshop-title"
                value={workshopTitle}
                onChangeText={setWorkshopTitle}
                placeholder="Workshop title"
                placeholderTextColor="#8b8d98"
                className="mt-4 rounded-xl border border-divider bg-surface px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-dark dark:text-on-surface-dark"
              />
              <TextInput
                testID="community-composer-workshop-description"
                value={workshopDescription}
                onChangeText={setWorkshopDescription}
                placeholder="Workshop description"
                placeholderTextColor="#8b8d98"
                multiline
                textAlignVertical="top"
                className="mt-3 min-h-[110px] rounded-xl border border-divider bg-surface px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-dark dark:text-on-surface-dark"
              />
              <View className="mt-3 flex-row gap-3">
                <TouchableOpacity
                  testID="community-composer-workshop-date-trigger"
                  activeOpacity={0.82}
                  onPress={() => openPicker("date")}
                  className="flex-1 flex-row items-center gap-2 rounded-xl border border-divider bg-surface px-3 py-3 dark:border-divider-dark dark:bg-surface-dark"
                >
                  <Ionicons name="calendar-outline" size={18} color="#737686" />
                  <Text
                    className={`flex-1 text-sm ${
                      workshopDate
                        ? "text-on-surface dark:text-on-surface-dark"
                        : "text-on-surface-muted dark:text-on-surface-muted-dark"
                    }`}
                  >
                    {formatWorkshopDate(workshopDate)}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  testID="community-composer-workshop-capacity"
                  value={workshopMaxParticipants}
                  onChangeText={(nextValue) =>
                    setWorkshopMaxParticipants(
                      nextValue.replace(/[^0-9]/g, ""),
                    )
                  }
                  placeholder="Capacity"
                  placeholderTextColor="#8b8d98"
                  keyboardType="number-pad"
                  className="w-32 rounded-xl border border-divider bg-surface px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-dark dark:text-on-surface-dark"
                />
              </View>
              <View className="mt-3 flex-row gap-3">
                <TouchableOpacity
                  testID="community-composer-workshop-start-time-trigger"
                  activeOpacity={0.82}
                  onPress={() => openPicker("startTime")}
                  className="flex-1 flex-row items-center gap-2 rounded-xl border border-divider bg-surface px-3 py-3 dark:border-divider-dark dark:bg-surface-dark"
                >
                  <Ionicons name="time-outline" size={18} color="#737686" />
                  <Text
                    className={`flex-1 text-sm ${
                      workshopStartTime
                        ? "text-on-surface dark:text-on-surface-dark"
                        : "text-on-surface-muted dark:text-on-surface-muted-dark"
                    }`}
                  >
                    {workshopStartTime
                      ? `Start ${formatWorkshopTime(workshopStartTime)}`
                      : "Start time"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="community-composer-workshop-end-time-trigger"
                  activeOpacity={0.82}
                  onPress={() => openPicker("endTime")}
                  className="flex-1 flex-row items-center gap-2 rounded-xl border border-divider bg-surface px-3 py-3 dark:border-divider-dark dark:bg-surface-dark"
                >
                  <Ionicons name="time-outline" size={18} color="#737686" />
                  <Text
                    className={`flex-1 text-sm ${
                      workshopEndTime
                        ? "text-on-surface dark:text-on-surface-dark"
                        : "text-on-surface-muted dark:text-on-surface-muted-dark"
                    }`}
                  >
                    {workshopEndTime
                      ? `End ${formatWorkshopTime(workshopEndTime)}`
                      : "End time"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="mt-2 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                Use local time. Pick the workshop date first, then choose start and end.
              </Text>
              {formError ? (
                <Text
                  testID="community-composer-form-error"
                  className="mt-2 text-xs font-semibold text-error dark:text-red-200"
                >
                  {formError}
                </Text>
              ) : null}
            </>
          )}

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
              <Text className="font-bold text-white">
                {mode === "workshop" ? "Create Workshop" : "Post to Community"}
              </Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}

      {Platform.OS === "ios" && activePicker ? (
        <Modal
          testID="community-composer-workshop-picker-modal"
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setActivePicker(null)}
        >
          <View className="flex-1 items-center justify-end bg-black/35 px-4 pb-8">
            <View className="w-full max-w-[420px] rounded-3xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark">
              <Text className="text-base font-extrabold text-on-surface dark:text-on-surface-dark">
                {activePicker === "date"
                  ? "Select workshop date"
                  : activePicker === "startTime"
                    ? "Select start time"
                    : "Select end time"}
              </Text>
              <DateTimePicker
                testID="community-composer-workshop-picker"
                value={pickerDraftValue}
                mode={activePicker === "date" ? "date" : "time"}
                is24Hour
                display="spinner"
                onChange={handleWorkshopPickerChange}
                style={{ alignSelf: "stretch", height: 180 }}
              />
              <View className="mt-3 flex-row gap-3">
                <TouchableOpacity
                  testID="community-composer-workshop-picker-cancel"
                  activeOpacity={0.82}
                  onPress={() => setActivePicker(null)}
                  className="flex-1 rounded-xl border border-divider px-4 py-3 dark:border-divider-dark"
                >
                  <Text className="text-center text-sm font-bold text-on-surface dark:text-on-surface-dark">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="community-composer-workshop-picker-confirm"
                  activeOpacity={0.82}
                  onPress={confirmPickerSelection}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 dark:bg-primary-dim"
                >
                  <Text className="text-center text-sm font-bold text-white">
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
