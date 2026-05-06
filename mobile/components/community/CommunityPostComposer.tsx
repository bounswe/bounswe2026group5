import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { CreateCommunityPostPayload } from "@/lib/queries/communityPosts";

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
  onSubmit,
}: Readonly<{
  isSubmitting?: boolean;
  onSubmit: (
    payload: Omit<CreateCommunityPostPayload, "tagId">,
  ) => Promise<boolean | void> | boolean | void;
}>) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [eventType, setEventType] =
    useState<CreateCommunityPostPayload["event_type"]>("social");
  const [content, setContent] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(false);

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  const resetForm = () => {
    setContent("");
    setShowOnProfile(false);
    setEventType("social");
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const didSubmit = await onSubmit({
      event_type: eventType,
      content: content.trim(),
      show_on_profile: showOnProfile,
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
            {isSubmitting ? (
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
