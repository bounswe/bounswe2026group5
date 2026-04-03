import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";

import { DiscoverSearchBar } from "@/components/discover/DiscoverSearchBar";

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
  const [skillQuery, setSkillQuery] = useState("");

  useEffect(() => {
    if (visible) {
      setSkillQuery("");
    }
  }, [visible]);

  const filteredSkills = useMemo(() => {
    const normalized = skillQuery.trim().toLowerCase();
    if (!normalized) {
      return allSkills;
    }

    return allSkills.filter((skill) =>
      skill.toLowerCase().includes(normalized),
    );
  }, [allSkills, skillQuery]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
          <Pressable
            className="bg-white rounded-t-3xl p-5 pb-8 max-h-[80%] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
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

            <DiscoverSearchBar
              value={skillQuery}
              onChangeText={setSkillQuery}
              placeholder="Search skills..."
              className="h-10 bg-gray-50 mb-4"
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="flex-row flex-wrap gap-2">
                {filteredSkills.map((skill) => {
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
              {filteredSkills.length === 0 && (
                <View className="py-6 items-center">
                  <Text className="text-gray-500 text-sm">
                    No matching skills found.
                  </Text>
                </View>
              )}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
