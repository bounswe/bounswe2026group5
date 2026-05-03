import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

import type { TimelineEvent } from "@/lib/queries/mentorship";

export function TimelineEventEditSheet({
  event,
  isSaving,
  isDeleting,
  onClose,
  onDelete,
  onSave,
}: Readonly<{
  event: TimelineEvent | null;
  isSaving?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onDelete: (event: TimelineEvent) => Promise<void> | void;
  onSave: (
    event: TimelineEvent,
    payload: {
      content: string;
      media_url?: string | null;
      show_on_profile: boolean;
    },
  ) => Promise<void> | void;
}>) {
  const [content, setContent] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(false);

  useEffect(() => {
    setContent(event?.content ?? "");
    setShowOnProfile(Boolean(event?.show_on_profile));
  }, [event]);

  const canSave = Boolean(event) && content.trim().length > 0 && !isSaving && !isDeleting;
  const isBusy = Boolean(isSaving || isDeleting);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(event)}
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
                Edit milestone
              </Text>
              <Text className="mt-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                Only your own milestones can be changed.
              </Text>
            </View>
            <TouchableOpacity
              testID="timeline-edit-close"
              activeOpacity={0.8}
              disabled={isBusy}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-card dark:bg-surface-card-dark"
            >
              <Ionicons name="close" size={20} color="#737686" />
            </TouchableOpacity>
          </View>

          <TextInput
            testID="timeline-edit-content"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            className="mt-5 min-h-[120px] rounded-xl border border-divider bg-surface-card px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-card-dark dark:text-on-surface-dark"
          />

          <View className="mt-4 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark">
                Show on my profile
              </Text>
              <Text className="mt-0.5 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                Shared milestones can appear in profile posts.
              </Text>
            </View>
            <Switch
              testID="timeline-edit-profile-toggle"
              value={showOnProfile}
              disabled={isBusy}
              onValueChange={setShowOnProfile}
              trackColor={{ false: "#d1d5db", true: "#9ed6c0" }}
              thumbColor={showOnProfile ? "#2f7d68" : "#f4f4f5"}
            />
          </View>

          <View className="mt-6 gap-3">
            <TouchableOpacity
              testID="timeline-edit-save"
              activeOpacity={0.9}
              disabled={!canSave}
              onPress={() => {
                if (event && canSave) {
                  void onSave(event, {
                    content: content.trim(),
                    show_on_profile: showOnProfile,
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
              testID="timeline-edit-delete"
              activeOpacity={0.86}
              disabled={isBusy || !event}
              onPress={() => {
                if (event) {
                  void onDelete(event);
                }
              }}
              className="h-12 items-center justify-center rounded-xl border border-error/60 bg-surface-card dark:border-red-900/60 dark:bg-surface-card-dark"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <Text className="font-bold text-error dark:text-red-200">
                  Delete Milestone
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
