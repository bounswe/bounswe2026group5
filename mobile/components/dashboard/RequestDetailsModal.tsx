import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";

interface RequestDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onCancelOutgoing?: () => void;
  isSubmitting?: boolean;
  request: {
    id?: string;
    user: string;
    topic: string;
    type: "incoming" | "outgoing";
    message?: string; // The cover letter
    proposedDate?: string;
  } | null;
}

export function RequestDetailsModal({
  visible,
  onClose,
  onViewProfile,
  onAccept,
  onReject,
  onCancelOutgoing,
  isSubmitting = false,
  request,
}: Readonly<RequestDetailsModalProps>) {
  if (!request) return null;

  const isIncoming = request.type === "incoming";

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-surface-card dark:bg-surface-card-dark w-full rounded-t-3xl p-6 pb-12 shadow-2xl max-h-[80%]"
        >
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark mb-1">
              Mentorship Request
            </Text>
            <Text className="text-base text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
              {isIncoming ? `From ${request.user}` : `Sent to ${request.user}`}
            </Text>
            {!!onViewProfile && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onViewProfile}
                className="self-start mt-3 bg-surface-active dark:bg-surface-active-dark border border-divider dark:border-divider-dark px-3 py-2 rounded-lg"
              >
                <Text className="text-primary dark:text-primary-dim text-sm font-semibold">
                  Show Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
            {/* Topic & Date */}
            <View className="bg-surface-active dark:bg-surface-active-dark rounded-xl p-4 border border-divider dark:border-divider-dark mb-4">
              <View className="flex-row justify-between mb-3">
                <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
                  Topic
                </Text>
                <Text className="text-on-surface dark:text-on-surface-dark font-semibold">
                  {request.topic}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
                  Proposed Time
                </Text>
                <Text className="text-on-surface dark:text-on-surface-dark font-semibold">
                  {request.proposedDate || "TBD"}
                </Text>
              </View>
            </View>

            {/* The Cover Letter Message */}
            <Text className="text-sm font-bold text-on-surface dark:text-on-surface-dark mb-2">
              Message
            </Text>
            <View className="bg-primary/10 p-4 rounded-xl border border-primary/20">
              <Text className="text-on-surface-soft dark:text-on-surface-soft-dark leading-6">
                {request.message ||
                  "I would love to book a session with you to discuss this topic!"}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          {isIncoming ? (
            <View className="flex-row justify-between gap-3 pt-2 border-t border-divider dark:border-divider-dark">
              <TouchableOpacity
                className="flex-1 bg-surface-card dark:bg-surface-card-dark py-4 rounded-xl items-center border border-divider dark:border-divider-dark"
                onPress={onReject}
                disabled={isSubmitting}
              >
                <Text className="text-on-surface font-bold text-base">
                  {isSubmitting ? "Submitting..." : "Decline"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary py-4 rounded-xl items-center"
                onPress={onAccept}
                disabled={isSubmitting}
              >
                <Text className="text-white font-bold text-base">
                  {isSubmitting ? "Submitting..." : "Accept Request"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="bg-red-50 py-4 rounded-xl items-center mt-2 border border-red-100"
              onPress={onCancelOutgoing}
              disabled={isSubmitting}
            >
              <Text className="text-red-600 font-bold text-base">
                {isSubmitting ? "Submitting..." : "Cancel Request"}
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
