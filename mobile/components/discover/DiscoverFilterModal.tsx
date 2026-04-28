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
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { type CommunityTag } from "@/lib/queries/communityTags";

interface DiscoverFilterModalProps {
  visible: boolean;
  allSkills: string[];
  communityTags: CommunityTag[];
  selectedSkills: Set<string>;
  selectedCommunityTags: Set<string>;
  onToggleSkill: (skill: string) => void;
  onToggleCommunityTag: (tagSlug: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function DiscoverFilterModal({
  visible,
  allSkills,
  communityTags,
  selectedSkills,
  selectedCommunityTags,
  onToggleSkill,
  onToggleCommunityTag,
  onClear,
  onClose,
}: Readonly<DiscoverFilterModalProps>) {
  const [skillQuery, setSkillQuery] = useState("");
  const selectedList = useMemo(
    () => Array.from(selectedSkills).sort((a, b) => a.localeCompare(b)),
    [selectedSkills],
  );

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
            className="bg-surface-card dark:bg-surface-card-dark rounded-t-3xl p-5 pb-8 max-h-[80%] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-divider dark:border-divider-dark"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-on-surface dark:text-on-surface-dark">
                Filter Mentors
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 rounded-full bg-surface dark:bg-surface-dark"
              >
                <Ionicons name="close" size={18} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <DiscoverSearchBar
              testID="skill-search-input"
              value={skillQuery}
              onChangeText={setSkillQuery}
              placeholder="Search skills..."
              className="h-10 mb-4"
            />

            {selectedList.length > 0 && (
              <SkillsCloud
                title="Selected Skills"
                skills={selectedList}
                variant="mentor"
              />
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {communityTags.length > 0 ? (
                <View className="mb-5">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-muted dark:text-on-surface-muted-dark">
                    Communities
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {communityTags.map((tag) => {
                      const selected = selectedCommunityTags.has(tag.slug);

                      return (
                        <TouchableOpacity
                          testID={`community-filter-${tag.slug}`}
                          activeOpacity={1}
                          key={tag.id}
                          onPress={() => onToggleCommunityTag(tag.slug)}
                          className={`px-3 py-2 rounded-full border ${
                            selected
                              ? "bg-primary border-primary"
                              : "bg-surface-card dark:bg-surface-card-dark border-divider dark:border-divider-dark"
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              selected
                                ? "text-white"
                                : "text-on-surface dark:text-on-surface-dark"
                            }`}
                          >
                            {tag.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-muted dark:text-on-surface-muted-dark">
                Skills
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {filteredSkills.map((skill) => {
                  const selected = selectedSkills.has(skill);

                  return (
                    <TouchableOpacity
                      testID={`skill-${skill}`}
                      activeOpacity={1}
                      key={skill}
                      onPress={() => onToggleSkill(skill)}
                      className={`px-3 py-2 rounded-full border ${
                        selected
                          ? "bg-primary border-primary"
                          : "bg-surface-card dark:bg-surface-card-dark border-divider dark:border-divider-dark"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selected
                            ? "text-white"
                            : "text-on-surface dark:text-on-surface-dark"
                        }`}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {filteredSkills.length === 0 && (
                <View testID="no-results-state" className="py-6 items-center">
                  <Text className="text-on-surface-soft dark:text-on-surface-soft-dark text-sm">
                    No matching skills found.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View className="flex-row gap-2 mt-5">
              <TouchableOpacity
                testID="clear-button"
                onPress={onClear}
                className="flex-1 py-3 rounded-xl border border-divider dark:border-divider-dark items-center"
              >
                <Text className="font-semibold text-on-surface dark:text-on-surface-dark">
                  Clear
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="apply-button"
                onPress={onClose}
                className="flex-1 py-3 rounded-xl bg-primary items-center"
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
