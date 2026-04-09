import React from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ConnectionActionsSheetProps {
  visible: boolean;
  name: string;
  onClose: () => void;
  onViewProfile: () => void;
  onRemoveConnection: () => void;
}

export function ConnectionActionsSheet({
  visible,
  name,
  onClose,
  onViewProfile,
  onRemoveConnection,
}: Readonly<ConnectionActionsSheetProps>) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

        <View className="bg-white rounded-t-3xl px-5 pt-3 pb-8 border-t border-gray-100">
          <View className="items-center pb-3">
            <View className="w-12 h-1.5 rounded-full bg-gray-300" />
          </View>

          <Text className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
            Manage Connection
          </Text>
          <Text className="text-2xl font-extrabold text-gray-900 mb-4">
            {name}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onViewProfile}
            className="flex-row items-center gap-3 px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 mb-2"
          >
            <View className="w-9 h-9 rounded-full bg-indigo-100 items-center justify-center">
              <Ionicons name="person-outline" size={18} color="#3730a3" />
            </View>
            <Text className="text-base font-semibold text-gray-900">
              View Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onRemoveConnection}
            className="flex-row items-center gap-3 px-4 py-4 rounded-2xl bg-red-50 border border-red-100"
          >
            <View className="w-9 h-9 rounded-full bg-red-100 items-center justify-center">
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
            </View>
            <Text className="text-base font-semibold text-red-700">
              Remove Connection
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            className="items-center justify-center py-4 mt-3"
          >
            <Text className="text-gray-500 font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
