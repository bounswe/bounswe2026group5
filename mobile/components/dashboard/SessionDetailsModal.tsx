import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface SessionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onReschedule?: () => void;
  onCancelSession?: () => void;
  onLeaveFeedback?: () => void;
  isCancelling?: boolean;
  session: {
    id?: string;
    user: string;
    date: string;
    time: string;
    status: string;
    topic?: string;
    myRole?: string;
    isSessionStarted?: boolean;
  } | null;
}

export function SessionDetailsModal({
  visible,
  onClose,
  onReschedule,
  onCancelSession,
  onLeaveFeedback,
  isCancelling = false,
  session,
}: Readonly<SessionDetailsModalProps>) {
  if (!session) return null;

  let statusTextClass = "text-gray-600";
  if (session.status === "Upcoming") {
    statusTextClass = "text-green-600";
  } else if (session.status === "Pending") {
    statusTextClass = "text-amber-600";
  }

  // 1. Primary Action: completed sessions show feedback CTA.
  let primaryAction: React.ReactNode = null;
  if (session.status === "Completed") {
    primaryAction = (
      <TouchableOpacity
        className="bg-indigo-600 py-4 rounded-xl items-center mb-3 shadow-sm"
        onPress={() => {
          onClose();
          if (onLeaveFeedback) {
            setTimeout(() => onLeaveFeedback(), 300);
          }
        }}
      >
        <Text className="text-white font-bold text-lg">Leave Feedback</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white w-full rounded-t-3xl p-6 pb-12 shadow-2xl"
        >
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header Area */}
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-2xl font-extrabold text-gray-900 flex-1 pr-2">
              {session.topic || "Mentorship Session"}
            </Text>
          </View>

          <Text className="text-lg text-gray-500 mb-6 font-medium">
            with {session.user}
          </Text>

          {/* Details Box */}
          <View className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-8">
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-500 font-medium">Date</Text>
              <Text className="text-gray-900 font-semibold">
                {session.date}
              </Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-500 font-medium">Start Time</Text>
              <Text className="text-gray-900 font-semibold">
                {session.time}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-500 font-medium">Status</Text>
              <Text className={`font-bold ${statusTextClass}`}>
                {session.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Dynamic Primary Action Button */}
          {primaryAction}

          {/* 2. Secondary Actions: Hidden completely if session has started or is completed */}
          {!session.isSessionStarted && session.status !== "Completed" && (
            <View className="flex-row justify-between gap-3 mb-2 mt-2">
              
              {/* RESCHEDULE BUTTON: Only for Mentees */}
              {session.myRole === "Mentee" && (
                <TouchableOpacity
                  className="flex-1 bg-white py-3 rounded-xl items-center border border-gray-300"
                  disabled={isCancelling}
                  onPress={() => {
                    if (onReschedule) {
                      onClose();
                      setTimeout(() => onReschedule(), 300);
                    }
                  }}
                >
                  <Text className="text-gray-700 font-bold text-base">
                    Reschedule
                  </Text>
                </TouchableOpacity>
              )}

              {/* CANCEL BUTTON */}
              <TouchableOpacity
                className="flex-1 bg-white py-3 rounded-xl items-center border border-gray-300"
                disabled={isCancelling}
                onPress={() => {
                  Alert.alert(
                    "Cancel Session",
                    "Are you sure you want to cancel this session?",
                    [
                      { text: "Keep Session", style: "cancel" },
                      {
                        text: "Cancel Session",
                        style: "destructive",
                        onPress: () => {
                          if (onCancelSession) {
                            onCancelSession();
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Text className="font-bold text-base text-red-600">
                    Cancel
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
