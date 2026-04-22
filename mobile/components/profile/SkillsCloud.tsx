import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SkillsCloudProps {
  title: string;
  skills: string[];
  variant: "mentor" | "mentee";
  onEdit?: () => void;
  onViewAll?: () => void;
}

export function SkillsCloud({
  title,
  skills,
  variant,
  onEdit,
  onViewAll,
}: Readonly<SkillsCloudProps>) {
  const isMentor = variant === "mentor";
  const pillBgClass = isMentor
    ? "bg-indigo-50 border-indigo-100"
    : "bg-emerald-50 border-emerald-100";
  const pillTextClass = isMentor ? "text-indigo-700" : "text-emerald-700";
  const emptyPrompt = isMentor
    ? "+ Add topics you can teach"
    : "+ Add topics you want to learn";

  const MAX_VISIBLE = 5;
  const visibleSkills = skills.slice(0, MAX_VISIBLE);
  const hiddenCount = skills.length - MAX_VISIBLE;

  let emptyStateContent: React.ReactNode = null;
  if (onEdit) {
    emptyStateContent = (
      <TouchableOpacity
        testID="empty-state"
        onPress={onEdit}
        className="py-2 px-4 border border-dashed border-gray-300 rounded-full"
      >
        <Text className="text-gray-500 font-medium">{emptyPrompt}</Text>
      </TouchableOpacity>
    );
  } else {
    emptyStateContent = <Text testID="empty-state" className="text-gray-500 font-medium">No skills listed.</Text>;
  }

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        {onEdit ? (
          <TouchableOpacity
            onPress={onEdit}
            className="p-1.5 bg-gray-50 rounded-md border border-gray-200"
            testID="edit-button"
          >
            <Ionicons name="pencil" size={14} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row flex-wrap gap-2 min-h-[80px]">
        {skills.length === 0 ? (
          emptyStateContent
        ) : (
          <>
            {/* Render only the sliced visible skills */}
            {visibleSkills.map((skill) => (
              <View
                key={skill}
                className={`px-3 py-1.5 rounded-full border ${pillBgClass}`}
              >
                <Text className={`text-sm font-semibold ${pillTextClass}`}>
                  {skill}
                </Text>
              </View>
            ))}

            {/* Render the "+X more" pill if there are hidden skills */}
            {hiddenCount > 0 && (
              <TouchableOpacity
                testID="view-all-button"
                onPress={onViewAll}
                className="px-3 py-1.5 rounded-full border bg-gray-200 border-gray-300"
              >
                <Text className="text-sm font-bold text-gray-700">
                  +{hiddenCount} more
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}
