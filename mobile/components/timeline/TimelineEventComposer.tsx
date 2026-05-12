import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostMediaPicker } from "@/components/posts/PostMediaPicker";
import { uploadPostMedia } from "@/lib/queries/uploads";
import type { LocalUploadFile } from "@/lib/queries/uploads";
import type { MCTEEventType } from "@/lib/queries/mentorship";

const EVENT_TYPES: {
  value: MCTEEventType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "achievement", label: "Achievement", icon: "trophy-outline" },
  { value: "social", label: "Social", icon: "people-outline" },
  { value: "progress", label: "Progress", icon: "trending-up-outline" },
];

export function TimelineEventComposer({
  isSubmitting,
  visible,
  onClose,
  onSubmit,
}: Readonly<{
  isSubmitting?: boolean;
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    event_type: MCTEEventType;
    content: string;
    media_url?: string | null;
    show_on_profile: boolean;
  }) => Promise<boolean | void> | boolean | void;
}>) {
  const [eventType, setEventType] = useState<MCTEEventType>("achievement");
  const [content, setContent] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(false);
  const [media, setMedia] = useState<LocalUploadFile | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isUploadingMedia, setUploadingMedia] = useState(false);

  const isBusy = Boolean(isSubmitting) || isUploadingMedia;
  const canSubmit = content.trim().length > 0 && !isBusy;

  const resetForm = () => {
    setContent("");
    setShowOnProfile(false);
    setEventType("achievement");
    setMedia(null);
    setMediaError(null);
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
    });

    if (didSubmit === false) {
      return;
    }

    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          <Pressable
            onPress={(pressEvent) => pressEvent.stopPropagation()}
            className="h-[70%] w-full overflow-hidden rounded-t-3xl bg-surface pt-4 shadow-2xl dark:bg-surface-dark"
          >
            <View className="items-center pb-4">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>

            <ScrollView
              className="flex-1 px-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
                    Add milestone
                  </Text>

                  <Text className="mt-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                    Timestamp defaults to now.
                  </Text>
                </View>

                <Ionicons name="flag-outline" size={22} color="#2f7d68" />
              </View>

              <View className="mt-4 flex-row gap-2">
                {EVENT_TYPES.map((item) => {
                  const selected = eventType === item.value;

                  return (
                    <TouchableOpacity
                      key={item.value}
                      testID={`timeline-composer-type-${item.value}`}
                      activeOpacity={0.82}
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
                testID="timeline-composer-content"
                value={content}
                onChangeText={setContent}
                placeholder="What happened on this journey?"
                placeholderTextColor="#8b8d98"
                multiline
                textAlignVertical="top"
                className="mt-4 min-h-[112px] rounded-xl border border-divider bg-surface-card px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-card-dark dark:text-on-surface-dark"
              />

              <PostMediaPicker
                disabled={isBusy}
                media={media}
                onChange={(nextMedia) => {
                  setMediaError(null);
                  setMedia(nextMedia);
                }}
                onError={setMediaError}
                testIDPrefix="timeline-composer"
              />

              {mediaError ? (
                <Text
                  testID="timeline-composer-media-error"
                  className="mt-2 text-xs font-semibold text-error dark:text-red-200"
                >
                  {mediaError}
                </Text>
              ) : null}

              <View className="mt-4 flex-row items-center justify-between gap-3 pb-4">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark">
                    Show on my profile
                  </Text>

                  <Text className="mt-0.5 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                    Only this milestone can appear publicly.
                  </Text>
                </View>

                <Switch
                  testID="timeline-composer-profile-toggle"
                  value={showOnProfile}
                  onValueChange={setShowOnProfile}
                  trackColor={{ false: "#d1d5db", true: "#9ed6c0" }}
                  thumbColor={showOnProfile ? "#2f7d68" : "#f4f4f5"}
                />
              </View>
            </ScrollView>

            <SafeAreaView
              edges={["bottom"]}
              className="border-t border-divider bg-surface px-5 pt-3 dark:border-divider-dark dark:bg-surface-dark"
            >
              <TouchableOpacity
                testID="timeline-composer-submit"
                activeOpacity={0.9}
                disabled={!canSubmit}
                onPress={handleSubmit}
                className={`h-12 items-center justify-center rounded-xl ${
                  canSubmit ? "bg-primary dark:bg-primary-dim" : "bg-gray-300"
                }`}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="font-bold text-white">Save Milestone</Text>
                )}
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
