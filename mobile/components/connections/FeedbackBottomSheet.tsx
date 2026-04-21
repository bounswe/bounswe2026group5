import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface FeedbackBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, text?: string) => Promise<void>;
  otherUserName: string;
  yourRole: "Mentor" | "Mentee";
  isSubmitting?: boolean;
}

export function FeedbackBottomSheet({
  visible,
  onClose,
  onSubmit,
  otherUserName,
  yourRole,
  isSubmitting = false,
}: Readonly<FeedbackBottomSheetProps>): React.ReactNode {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    try {
      setError(null);
      await onSubmit(rating, text.trim() || undefined);
      setRating(0);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
    }
  };

  const renderStars = () => {
    return (
      <View className="flex-row justify-center gap-4 my-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            testID={`star-${star}`}
            onPress={() => {
              setRating(star);
              setError(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={rating >= star ? "star" : "star-outline"}
              size={40}
              color={rating >= star ? "#fbbf24" : "#d1d5db"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
          className="bg-white dark:bg-gray-900 w-full rounded-t-3xl shadow-2xl max-h-[85%]"
        >
          {/* Drag Handle Component */}
          <View className="items-center pt-4 pb-2">
            <View className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="border-b border-gray-200 dark:border-gray-700 px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Add Review
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Rate your session with {otherUserName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content (Removed flex-1 so it stops collapsing) */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingVertical: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Role Badge */}
            <View className="flex-row items-center gap-2 mb-6">
              <View
                testID={`role-badge-${yourRole.toLowerCase()}`}
                className={`px-3 py-1 rounded-full ${
                  yourRole === "Mentor"
                    ? "bg-indigo-100 dark:bg-indigo-900"
                    : "bg-emerald-100 dark:bg-emerald-900"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    yourRole === "Mentor"
                      ? "text-indigo-700 dark:text-indigo-200"
                      : "text-emerald-700 dark:text-emerald-200"
                  }`}
                >
                  As {yourRole}
                </Text>
              </View>
            </View>

            {/* Star Rating */}
            <View className="mb-2">
              <Text className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">
                How was your session?
              </Text>
              {renderStars()}
              {rating > 0 && (
                <Text className="text-center text-gray-600 dark:text-gray-400 text-sm font-bold">
                  {
                    ["Poor", "Fair", "Good", "Very Good", "Excellent"][
                      rating - 1
                    ]
                  }
                </Text>
              )}
            </View>

            {/* Text Input */}
            <View className="mb-6 mt-4">
              <Text className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">
                Comments (optional)
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white text-base"
                placeholder="Share your thoughts about the session..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                maxLength={500}
                value={text}
                onChangeText={setText}
                editable={!isSubmitting}
                textAlignVertical="top"
                style={{ minHeight: 100 }}
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                {text.length}/500 characters
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View testID="error-message" className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-3 mb-6">
                <Text className="text-red-600 dark:text-red-200 text-sm font-medium">
                  {error}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 gap-3">
            <TouchableOpacity
              testID="submit-review-button"
              className="bg-indigo-600 py-4 rounded-xl items-center active:opacity-90 shadow-sm" // <-- Fixed color and padding
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator testID="submitting-indicator" size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="cancel-button"
              className="bg-white dark:bg-gray-700 py-4 rounded-xl items-center border border-gray-300 dark:border-gray-600"
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text className="text-gray-700 dark:text-white font-bold text-lg">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}