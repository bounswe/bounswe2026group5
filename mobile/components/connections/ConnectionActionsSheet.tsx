import React from "react";
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";

interface ConnectionActionsSheetProps {
  visible: boolean;
  name: string;
  onClose: () => void;
  onViewProfile: () => void;
  onRemoveConnection: () => void;
  onLeaveReview?: () => void;
  hasReviewed?: boolean;
  isCheckingReview?: boolean;
}

export function ConnectionActionsSheet({
  visible,
  name,
  onClose,
  onViewProfile,
  onRemoveConnection,
  onLeaveReview,
  hasReviewed = false,
  isCheckingReview = false,
}: Readonly<ConnectionActionsSheetProps>) {
  const [showRemoveConfirmation, setShowRemoveConfirmation] =
    React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setShowRemoveConfirmation(false);
    }
  }, [visible]);

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible && !showRemoveConfirmation}
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl px-5 pt-3 pb-8 border-t border-divider/20">
            {/* Drag Indicator */}
            <View className="items-center pb-3">
              <View className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>

            {/* Header */}
            <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-muted mb-1">
              Manage Connection
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface dark:text-white mb-5">
              {name}
            </Text>

            {/* VIEW PROFILE BUTTON (Matches Secondary Button) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onViewProfile}
              className="flex-row items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-gray-100 dark:bg-gray-800 mb-3"
            >
              <Ionicons name="person-outline" size={18} color="#374151" />
              <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
                View Profile
              </Text>
            </TouchableOpacity>

            {/* LEAVE REVIEW BUTTON (Matches Primary Button) */}
            {onLeaveReview && (
              <TouchableOpacity
                activeOpacity={hasReviewed ? 1 : 0.85}
                onPress={hasReviewed ? undefined : onLeaveReview}
                className={`flex-row items-center justify-center gap-2 px-4 py-3.5 rounded-lg mb-3 ${
                  hasReviewed ? "bg-gray-100 dark:bg-gray-800" : "bg-primary"
                }`}
              >
                {isCheckingReview ? (
                  <ActivityIndicator size="small" color={hasReviewed ? "#9ca3af" : "#ffffff"} />
                ) : (
                  <Ionicons
                    name={hasReviewed ? "checkmark-circle" : "star"}
                    size={18}
                    color={hasReviewed ? "#9ca3af" : "#ffffff"}
                  />
                )}
                <Text
                  className={`text-base font-semibold ${
                    hasReviewed ? "text-gray-400 dark:text-gray-500" : "text-white"
                  }`}
                >
                  {isCheckingReview ? "Checking..." : hasReviewed ? "Reviewed" : "Leave Review"}
                </Text>
              </TouchableOpacity>
            )}

            {/* REMOVE CONNECTION BUTTON (Destructive) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowRemoveConfirmation(true)}
              className="flex-row items-center justify-center gap-2 px-4 py-3.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50"
            >
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
              <Text className="text-base font-semibold text-red-700 dark:text-red-400">
                Remove Connection
              </Text>
            </TouchableOpacity>

            {/* CLOSE BUTTON */}
            <TouchableOpacity activeOpacity={0.8} onPress={onClose} className="items-center justify-center py-4 mt-3">
              <Text className="text-on-surface-soft dark:text-gray-400 font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmationSheet
        visible={visible && showRemoveConfirmation}
        title={`Remove ${name}?`}
        message="This will end the active mentorship connection."
        confirmLabel="Remove"
        cancelLabel="Keep Connection"
        variant="destructive"
        onCancel={() => setShowRemoveConfirmation(false)}
        onConfirm={() => {
          setShowRemoveConfirmation(false);
          onRemoveConnection();
        }}
      />
    </>
  );
}
