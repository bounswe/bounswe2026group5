import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { ReportReason } from "@/lib/queries/reporting";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "OTHER", label: "Other" },
];

type ReportSheetProps = {
  visible: boolean;
  title: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: {
    reason: ReportReason;
    description: string;
  }) => void;
  onClose: () => void;
};

export function ReportSheet({
  visible,
  title,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
  onClose,
}: Readonly<ReportSheetProps>) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDescription("");
    }
  }, [visible]);

  const canSubmit = Boolean(reason) && !isSubmitting;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="bg-surface dark:bg-surface-dark w-full rounded-t-3xl px-6 pt-4 pb-8"
        >
          <View className="items-center pb-4">
            <View className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          <View className="flex-row items-center mb-2">
            <View className="h-11 w-11 rounded-full bg-red-50 items-center justify-center mr-3">
              <Ionicons name="flag" size={22} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-on-surface dark:text-on-surface-dark">
                {title}
              </Text>
              <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark mt-1">
                Choose a reason and add details if helpful.
              </Text>
            </View>
          </View>

          <View className="mt-5 gap-2">
            {REPORT_REASONS.map((item) => {
              const selected = reason === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  testID={`report-reason-${item.value}`}
                  activeOpacity={0.85}
                  onPress={() => setReason(item.value)}
                  className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                    selected
                      ? "border-red-500 bg-red-50"
                      : "border-divider bg-surface-card"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      selected ? "text-red-700" : "text-on-surface"
                    }`}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color="#dc2626" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            testID="report-description-input"
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details (optional)"
            placeholderTextColor="#8a8172"
            multiline
            textAlignVertical="top"
            className="mt-4 min-h-[104px] rounded-xl border border-divider bg-surface-card px-4 py-3 text-on-surface"
          />

          {errorMessage ? (
            <Text testID="report-error" className="mt-3 text-sm font-semibold text-red-600">
              {errorMessage}
            </Text>
          ) : null}

          <View className="mt-6 gap-3">
            <TouchableOpacity
              testID="submit-report-button"
              activeOpacity={0.9}
              disabled={!canSubmit}
              onPress={() => {
                if (reason) {
                  onSubmit({ reason, description });
                }
              }}
              className="items-center justify-center rounded-xl bg-red-600 py-4"
              style={{ opacity: canSubmit ? 1 : 0.45 }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="cancel-report-button"
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={onClose}
              className="items-center justify-center rounded-xl border border-divider bg-surface-card py-4"
            >
              <Text className="font-semibold text-on-surface">Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
