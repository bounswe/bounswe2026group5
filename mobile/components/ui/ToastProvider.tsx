import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastVariant = "error" | "warning" | "info" | "success";

interface ToastInput {
  message: string;
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "durationMs">> {
  id: string;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => string | null;
  success: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string | null;
  error: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string | null;
  warning: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string | null;
  info: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string | null;
}

const DEFAULT_TOAST_DURATION_MS = 4_000;

const VARIANT_STYLES = {
  error: {
    title: "Something went wrong",
    icon: "alert-circle",
    container:
      "border-error/20 bg-error-container dark:border-red-900/60 dark:bg-red-950/95",
    iconWrap: "bg-white/70 dark:bg-red-950/40",
    iconColor: "#ba1a1a",
    text: "text-error dark:text-red-200",
  },
  warning: {
    title: "Please check this",
    icon: "warning",
    container:
      "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/95",
    iconWrap: "bg-white/70 dark:bg-amber-950/40",
    iconColor: "#b45309",
    text: "text-amber-800 dark:text-amber-200",
  },
  info: {
    title: "Heads up",
    icon: "information-circle",
    container:
      "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/95",
    iconWrap: "bg-white/70 dark:bg-sky-950/40",
    iconColor: "#0369a1",
    text: "text-sky-800 dark:text-sky-200",
  },
  success: {
    title: "Success",
    icon: "checkmark-circle",
    container:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/95",
    iconWrap: "bg-white/70 dark:bg-emerald-950/40",
    iconColor: "#047857",
    text: "text-emerald-800 dark:text-emerald-200",
  },
} as const;

const ToastContext = createContext<ToastContextValue>({
  showToast: () => null,
  success: () => null,
  error: () => null,
  warning: () => null,
  info: () => null,
});

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToastCard({
  toast,
  onDismiss,
}: Readonly<{ toast: ToastItem; onDismiss: (id: string) => void }>) {
  useEffect(() => {
    const timeoutId = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timeoutId);
  }, [onDismiss, toast.durationMs, toast.id]);

  const styles = VARIANT_STYLES[toast.variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Dismiss ${toast.title}`}
      accessibilityLiveRegion="polite"
      className={`w-full flex-row items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${styles.container}`}
      onPress={() => onDismiss(toast.id)}
    >
      <View
        className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${styles.iconWrap}`}
      >
        <Ionicons name={styles.icon} size={18} color={styles.iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${styles.text}`}>
          {toast.title}
        </Text>
        <Text className={`mt-1 text-sm leading-5 ${styles.text}`}>
          {toast.message}
        </Text>
      </View>
      <Ionicons name="close" size={18} color={styles.iconColor} />
    </Pressable>
  );
}

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const message = input.message.trim();

    if (!message) {
      return null;
    }

    const variant = input.variant ?? "info";
    const styles = VARIANT_STYLES[variant];
    const id = createToastId();

    setToasts((current) => [
      ...current,
      {
        id,
        message,
        title: input.title ?? styles.title,
        variant,
        durationMs: input.durationMs ?? DEFAULT_TOAST_DURATION_MS,
      },
    ]);

    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, options) =>
        showToast({ ...options, message, variant: "success" }),
      error: (message, options) =>
        showToast({ ...options, message, variant: "error" }),
      warning: (message, options) =>
        showToast({ ...options, message, variant: "warning" }),
      info: (message, options) =>
        showToast({ ...options, message, variant: "info" }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      <View className="flex-1">
        {children}
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 z-50 gap-3 px-4"
          style={{ top: insets.top + 12 }}
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </View>
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
