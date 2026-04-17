import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AvailableSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  is_booked: boolean;
}

interface RescheduleBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  slots: AvailableSlot[];
  isLoading?: boolean;
  onSelectSlot: (slotId: string) => void;
  currentSlotId?: string;
}

const formatSlotDisplay = (slot: AvailableSlot): string => {
  const date = new Date(`${slot.date}T00:00:00`);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  const startTime = slot.startTime.slice(0, 5);
  const endTime = slot.endTime.slice(0, 5);
  return `${dateStr}  •  ${startTime}–${endTime}`;
};

/**
 * RescheduleBottomSheet
 * Compact bottom sheet modal for selecting alternative mentorship session slots.
 * Supports scrolling through more than 6 slots with clear visual feedback.
 */
export function RescheduleBottomSheet({
  visible,
  onClose,
  slots,
  isLoading = false,
  onSelectSlot,
  currentSlotId,
}: Readonly<RescheduleBottomSheetProps>): React.ReactNode {
  const availableSlots = slots.filter(
    (slot) => !slot.is_booked && slot.id !== currentSlotId,
  );
  const slotCountLabel = availableSlots.length === 1 ? "slot" : "slots";

  const handleSelectSlot = (slotId: string) => {
    onSelectSlot(slotId);
    onClose();
  };

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-gray-500 dark:text-gray-400 mt-3 text-sm">
          Loading available slots...
        </Text>
      </View>
    );
  } else if (availableSlots.length === 0) {
    content = (
      <View className="py-12 items-center justify-center px-6">
        <Ionicons name="calendar-clear" size={32} color="#9ca3af" />
        <Text className="text-gray-600 dark:text-gray-400 mt-3 font-medium text-center">
          No Available Slots
        </Text>
        <Text className="text-gray-500 dark:text-gray-500 text-sm text-center mt-2">
          This mentor has no future availability. Please contact them or try
          another time.
        </Text>
      </View>
    );
  } else {
    content = (
      <FlatList
        data={availableSlots}
        keyExtractor={(slot) => slot.id}
        scrollEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
        ListFooterComponent={<View className="h-6" />}
        renderItem={({ item: slot }) => (
          <TouchableOpacity
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:bg-gray-100 dark:active:bg-gray-700"
            onPress={() => handleSelectSlot(slot.id)}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-medium text-base">
                  {formatSlotDisplay(slot)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        )}
      />
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
          className="bg-white dark:bg-gray-900 w-full rounded-t-3xl shadow-2xl max-h-[75%]"
        >
          {/* Header */}
          <View className="border-b border-gray-200 dark:border-gray-700 px-6 pt-6">
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Reschedule Session
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {availableSlots.length} available {slotCountLabel}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {content}

          {/* Action Button */}
          <View className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
            <TouchableOpacity
              className="bg-white dark:bg-gray-700 py-3 rounded-xl items-center border border-gray-300 dark:border-gray-600"
              onPress={onClose}
            >
              <Text className="text-gray-700 dark:text-white font-semibold text-base">
                Keep Current Slot
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
