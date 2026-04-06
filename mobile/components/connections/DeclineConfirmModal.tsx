import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeclineConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeclineConfirmModal({ visible, onCancel, onConfirm }: DeclineConfirmModalProps) {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onCancel}>
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-6"
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white w-full rounded-xl overflow-hidden"
          style={{ maxWidth: 360 }}
        >
          <View className="p-8 items-center">
            {/* Icon */}
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-6">
              <Ionicons name="help-circle-outline" size={40} color="#ba1a1a" />
            </View>

            {/* Title */}
            <Text className="text-[18px] font-bold text-on-surface mb-3 text-center">
              Are you sure?
            </Text>

            {/* Body */}
            <Text className="text-[14px] text-on-surface-variant leading-[22px] text-center mb-8">
              Do you want to decline this mentorship request? This action cannot be undone.
            </Text>

            {/* Action Buttons */}
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onCancel}
                className="flex-1 py-3.5 rounded-full bg-gray-100 items-center justify-center"
              >
                <Text className="font-bold text-on-surface-variant text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onConfirm}
                className="flex-1 py-3.5 rounded-full bg-error items-center justify-center"
              >
                <Text className="font-bold text-white text-sm">Confirm Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}