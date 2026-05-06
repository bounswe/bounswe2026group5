import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CreateProfilePostPayload } from "@/lib/queries/profile";

const EVENT_TYPES: {
  value: CreateProfilePostPayload["event_type"];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "achievement", label: "Achievement", icon: "trophy-outline" },
  { value: "social", label: "Social", icon: "people-outline" },
  { value: "progress", label: "Progress", icon: "trending-up-outline" },
];

export function ProfilePostComposer({
  isSubmitting,
  visible,
  onClose,
  onSubmit,
}: Readonly<{
  isSubmitting?: boolean;
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateProfilePostPayload,
  ) => Promise<boolean | void> | boolean | void;
}>) {
  const [eventType, setEventType] =
    useState<CreateProfilePostPayload["event_type"]>("social");
  const [content, setContent] = useState("");

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  const resetForm = () => {
    setContent("");
    setEventType("social");
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const didSubmit = await onSubmit({
      event_type: eventType,
      content: content.trim(),
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
            className="h-[72%] w-full overflow-hidden rounded-t-3xl bg-surface pt-4 shadow-2xl dark:bg-surface-dark"
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
                    New post
                  </Text>
                  <Text className="mt-1 text-xs text-on-surface-soft dark:text-on-surface-soft-dark">
                    Share an update with your profile followers.
                  </Text>
                </View>

                <Ionicons name="create-outline" size={22} color="#2f7d68" />
              </View>

              <View className="mt-4 flex-row gap-2">
                {EVENT_TYPES.map((item) => {
                  const selected = eventType === item.value;

                  return (
                    <TouchableOpacity
                      key={item.value}
                      testID={`profile-composer-type-${item.value}`}
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
                testID="profile-composer-content"
                value={content}
                onChangeText={setContent}
                placeholder="What would you like to share?"
                placeholderTextColor="#8b8d98"
                multiline
                textAlignVertical="top"
                className="mt-4 min-h-[140px] rounded-xl border border-divider bg-surface-card px-3 py-3 text-on-surface dark:border-divider-dark dark:bg-surface-card-dark dark:text-on-surface-dark"
              />

              <View className="mt-4 rounded-xl border border-dashed border-divider px-3 py-3 dark:border-divider-dark">
                <Text className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
                  This post will appear in your profile feed.
                </Text>
              </View>
            </ScrollView>

            <SafeAreaView
              edges={["bottom"]}
              className="border-t border-divider bg-surface px-5 pt-3 dark:border-divider-dark dark:bg-surface-dark"
            >
              <TouchableOpacity
                testID="profile-composer-submit"
                activeOpacity={0.9}
                disabled={!canSubmit}
                onPress={handleSubmit}
                className={`h-12 items-center justify-center rounded-xl ${
                  canSubmit ? "bg-primary dark:bg-primary-dim" : "bg-gray-300"
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="font-bold text-white">Post to Profile</Text>
                )}
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
