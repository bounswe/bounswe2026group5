import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthStore } from "@/lib/auth/store";
import { useCreateCommunityTagMutation } from "@/lib/queries/communityTags";

const DESCRIPTION_LIMIT = 280;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export default function CreateCommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const createCommunityMutation = useCreateCommunityTagMutation(currentUsername);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const canSubmit = !createCommunityMutation.isPending;

  const handleSubmit = async () => {
    if (!trimmedName) {
      setFormError("Community name is required.");
      return;
    }

    try {
      setFormError(null);
      const tag = await createCommunityMutation.mutateAsync({
        name: trimmedName,
        description: trimmedDescription,
      });
      toast.success(`${tag.name} is ready.`);
      router.replace(
        `/(tabs)/community/${encodeURIComponent(tag.id)}?from=community`,
      );
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Could not create this community right now."),
      );
    }
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="z-10 border-b border-divider bg-surface-card shadow-sm dark:border-divider-dark dark:bg-surface-card-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <TouchableOpacity
            testID="create-community-back-button"
            onPress={() => router.replace("/(tabs)/community")}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface dark:bg-surface-dark"
          >
            <Ionicons name="chevron-back" size={20} color="#2f7d68" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
              Create Community
            </Text>
            <Text className="text-xs font-semibold text-on-surface-soft dark:text-on-surface-soft-dark">
              Build a space people can join.
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {formError ? (
            <View className="mb-4">
              <ErrorBanner message={formError} />
            </View>
          ) : null}

          <View className="rounded-2xl border border-divider bg-surface-card p-4 dark:border-divider-dark dark:bg-surface-card-dark">
            <View className="mb-5">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary-dim/15">
                <Ionicons name="people-outline" size={26} color="#2f7d68" />
              </View>
              <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
                Create your own community
              </Text>
              <Text className="mt-2 text-sm leading-5 text-on-surface-soft dark:text-on-surface-soft-dark">
                Choose a name people can recognize, then add a short description
                that explains who belongs here.
              </Text>
            </View>

            <View className="gap-y-5">
              <View>
                <Text className="mb-2 text-sm font-bold text-on-surface dark:text-on-surface-dark">
                  Community name
                </Text>
                <TextInput
                  testID="create-community-name-input"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Backend Guild"
                  placeholderTextColor="#8b8d98"
                  maxLength={80}
                  autoCapitalize="words"
                  className="h-14 rounded-xl border border-divider bg-surface px-3 text-base font-semibold text-on-surface dark:border-divider-dark dark:bg-surface-dark dark:text-on-surface-dark"
                  style={
                    Platform.OS === "android"
                      ? { textAlignVertical: "center", paddingVertical: 0 }
                      : undefined
                  }
                />
              </View>

              <View>
                <View className="mb-2 flex-row items-end justify-between">
                  <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark">
                    Description
                  </Text>
                  <Text className="text-xs font-semibold text-on-surface-muted dark:text-on-surface-muted-dark">
                    {description.length}/{DESCRIPTION_LIMIT}
                  </Text>
                </View>
                <TextInput
                  testID="create-community-description-input"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What will members learn, discuss, or build together?"
                  placeholderTextColor="#8b8d98"
                  multiline
                  maxLength={DESCRIPTION_LIMIT}
                  textAlignVertical="top"
                  className="min-h-[132px] rounded-xl border border-divider bg-surface px-3 py-3 text-base leading-5 text-on-surface dark:border-divider-dark dark:bg-surface-dark dark:text-on-surface-dark"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-t border-divider bg-surface px-4 pt-3 dark:border-divider-dark dark:bg-surface-dark"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          testID="create-community-submit"
          activeOpacity={0.9}
          disabled={!canSubmit}
          onPress={handleSubmit}
          className={`h-12 items-center justify-center rounded-xl ${
            trimmedName && canSubmit
              ? "bg-primary dark:bg-primary-dim"
              : "bg-gray-300"
          }`}
        >
          {createCommunityMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="font-bold text-white">Create Community</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
