import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DiscoverFilterModalProps {
  visible: boolean;
  allSkills: string[];
  selectedSkills: Set<string>;
  onToggleSkill: (skill: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function DiscoverFilterModal({
  visible,
  allSkills,
  selectedSkills,
  onToggleSkill,
  onClear,
  onClose,
}: Readonly<DiscoverFilterModalProps>) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-3xl p-5 pb-8 max-h-[80%]"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">
              Filter Skills
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full bg-gray-100"
            >
              <Ionicons name="close" size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-2">
              {allSkills.map((skill) => {
                const selected = selectedSkills.has(skill);

                return (
                  <TouchableOpacity
                    key={skill}
                    onPress={() => onToggleSkill(skill)}
                    className={`px-3 py-2 rounded-full border ${
                      selected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {skill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className="flex-row gap-2 mt-5">
            <TouchableOpacity
              onPress={onClear}
              className="flex-1 py-3 rounded-xl border border-gray-300 items-center"
            >
              <Text className="font-semibold text-gray-700">Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 rounded-xl bg-indigo-600 items-center"
            >
              <Text className="font-semibold text-white">Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
