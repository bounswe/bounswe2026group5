import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ConfirmationSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationSheet({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isConfirming = false,
  onConfirm,
  onCancel,
}: Readonly<ConfirmationSheetProps>) {
  const isDestructive = variant === "destructive";

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onCancel}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="bg-surface dark:bg-surface-dark w-full rounded-t-3xl px-6 pt-4 pb-8 shadow-2xl"
        >
          <View className="items-center pb-4">
            <View className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          <View className="items-center mb-5">
            <View
              className={`h-14 w-14 rounded-full items-center justify-center ${
                isDestructive
                  ? "bg-red-50 dark:bg-red-950/40"
                  : "bg-surface-active dark:bg-surface-active-dark"
              }`}
            >
              <Ionicons
                name={isDestructive ? "warning" : "help-circle"}
                size={28}
                color={isDestructive ? "#dc2626" : "#4a7c6f"}
              />
            </View>
          </View>

          <Text className="text-2xl font-extrabold text-center text-on-surface dark:text-on-surface-dark">
            {title}
          </Text>
          <Text className="mt-3 text-base leading-6 text-center text-on-surface-soft dark:text-on-surface-soft-dark">
            {message}
          </Text>

          <View className="mt-8 gap-3">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onConfirm}
              disabled={isConfirming}
              className={`py-4 rounded-xl items-center justify-center ${
                isDestructive ? "bg-red-600" : "bg-primary dark:bg-primary-dim"
              }`}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onCancel}
              disabled={isConfirming}
              className="py-4 rounded-xl items-center justify-center border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark"
            >
              <Text className="font-semibold text-on-surface dark:text-on-surface-dark">
                {cancelLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
