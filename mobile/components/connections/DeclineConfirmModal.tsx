import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";

interface DeclineConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeclineConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: Readonly<DeclineConfirmModalProps>) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Pressable
          style={StyleSheet.absoluteFill}
          className="bg-black/40"
          onPress={onCancel}
        />

        <View className="w-full max-w-sm bg-white rounded-2xl p-5 border border-divider/20">
          <Text className="text-lg font-bold text-on-surface mb-2">
            Decline request?
          </Text>
          <Text className="text-sm text-on-surface-soft mb-5">
            This action will reject the mentorship request.
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCancel}
              className="flex-1 py-3 rounded-lg border border-divider items-center"
            >
              <Text className="font-semibold text-on-surface">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onConfirm}
              className="flex-1 py-3 rounded-lg bg-red-500 items-center"
            >
              <Text className="font-semibold text-white">Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
