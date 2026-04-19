import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface ErrorBannerProps {
  message: string;
  title?: string;
  variant?: "error" | "warning" | "info" | "success";
}

const VARIANT_STYLES = {
  error: {
    title: "Something went wrong",
    icon: "alert-circle",
    container:
      "border-error/20 bg-error-container dark:border-red-900/60 dark:bg-red-950/30",
    iconWrap: "bg-white/70 dark:bg-red-950/40",
    iconColor: "#ba1a1a",
    text: "text-error dark:text-red-200",
  },
  warning: {
    title: "Please check this",
    icon: "warning",
    container:
      "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
    iconWrap: "bg-white/70 dark:bg-amber-950/40",
    iconColor: "#b45309",
    text: "text-amber-800 dark:text-amber-200",
  },
  info: {
    title: "Heads up",
    icon: "information-circle",
    container:
      "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/30",
    iconWrap: "bg-white/70 dark:bg-sky-950/40",
    iconColor: "#0369a1",
    text: "text-sky-800 dark:text-sky-200",
  },
  success: {
    title: "Done",
    icon: "checkmark-circle",
    container:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
    iconWrap: "bg-white/70 dark:bg-emerald-950/40",
    iconColor: "#047857",
    text: "text-emerald-800 dark:text-emerald-200",
  },
} as const;

export function ErrorBanner({
  message,
  title,
  variant = "error",
}: Readonly<ErrorBannerProps>) {
  if (!message.trim()) {
    return null;
  }

  const styles = VARIANT_STYLES[variant];

  return (
    <View
      className={`w-full flex-row items-start gap-3 rounded-2xl border px-4 py-3 ${styles.container}`}
    >
      <View
        className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${styles.iconWrap}`}
      >
        <Ionicons name={styles.icon} size={18} color={styles.iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${styles.text}`}>
          {title ?? styles.title}
        </Text>
        <Text className={`mt-1 text-sm leading-5 ${styles.text}`}>
          {message}
        </Text>
      </View>
    </View>
  );
}
