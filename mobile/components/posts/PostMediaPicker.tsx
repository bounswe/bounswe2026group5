import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { pickPostImageFile } from "@/lib/uploads/picker";
import type { LocalUploadFile } from "@/lib/queries/uploads";

interface PostMediaPickerProps {
  disabled?: boolean;
  media: LocalUploadFile | null;
  onChange: (media: LocalUploadFile | null) => void;
  onError?: (message: string) => void;
  testIDPrefix: string;
}

function getPickerErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not open your photo library.";
}

export function PostMediaPicker({
  disabled,
  media,
  onChange,
  onError,
  testIDPrefix,
}: Readonly<PostMediaPickerProps>) {
  const handlePick = async () => {
    if (disabled) {
      return;
    }

    try {
      const nextMedia = await pickPostImageFile();
      if (nextMedia) {
        onChange(nextMedia);
      }
    } catch (error) {
      onError?.(getPickerErrorMessage(error));
    }
  };

  return (
    <View className="mt-4 rounded-xl border border-dashed border-divider px-3 py-3 dark:border-divider-dark">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark">
            Photo
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-xs text-on-surface-soft dark:text-on-surface-soft-dark"
          >
            {media ? media.name : "Optional image attachment"}
          </Text>
        </View>

        <TouchableOpacity
          testID={`${testIDPrefix}-media-button`}
          activeOpacity={0.85}
          disabled={disabled}
          onPress={handlePick}
          className="h-10 flex-row items-center justify-center gap-1.5 rounded-full bg-surface-active px-3 dark:bg-surface-active-dark"
        >
          <Ionicons name="image-outline" size={16} color="#2f7d68" />
          <Text className="text-xs font-bold text-primary dark:text-primary-dim">
            {media ? "Change" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>

      {media ? (
        <View className="mt-3">
          <Image
            testID={`${testIDPrefix}-media-preview`}
            source={{ uri: media.uri }}
            resizeMode="cover"
            className="h-36 w-full rounded-xl bg-surface-active dark:bg-surface-active-dark"
          />
          <TouchableOpacity
            testID={`${testIDPrefix}-media-remove`}
            activeOpacity={0.85}
            disabled={disabled}
            onPress={() => onChange(null)}
            className="mt-2 self-start rounded-full border border-divider px-3 py-1.5 dark:border-divider-dark"
          >
            <Text className="text-xs font-bold text-on-surface-soft dark:text-on-surface-soft-dark">
              Remove photo
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
