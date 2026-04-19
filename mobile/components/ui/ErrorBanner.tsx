import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface ErrorBannerProps {
  message: string;
  title?: string;
}

export function ErrorBanner({
  message,
  title = "Something went wrong",
}: Readonly<ErrorBannerProps>) {
  if (!message.trim()) {
    return null;
  }

  return (
    <View className="w-full flex-row items-start gap-3 rounded-2xl border border-error/20 bg-error-container px-4 py-3 dark:border-red-900/60 dark:bg-red-950/30">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-white/70 dark:bg-red-950/40">
        <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-error dark:text-red-200">
          {title}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-error dark:text-red-200">
          {message}
        </Text>
      </View>
    </View>
  );
}
