import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SkillsCloudProps {
  title: string;
  skills: string[];
  variant: 'mentor' | 'mentee';
  // TODO: [Navigation] Pass the function to open the EditSkillsModal here
  onEdit?: () => void; 
}

export function SkillsCloud({ title, skills, variant, onEdit }: SkillsCloudProps) {
  // Dynamically assign shadcn-style Tailwind colors based on the user's role context
  const isMentor = variant === 'mentor';
  const pillBgClass = isMentor ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100';
  const pillTextClass = isMentor ? 'text-indigo-700' : 'text-emerald-700';
  
  // Custom empty states
  const emptyPrompt = isMentor ? '+ Add topics you can teach' : '+ Add topics you want to learn';

  return (
    <View className="mb-6">
      
      {/* Header Row with Edit Button */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
        
        {/* TODO: [Feature] Trigger bottom sheet to edit these specific skills */}
        <TouchableOpacity 
          onPress={onEdit} 
          className="p-1.5 bg-gray-50 rounded-md border border-gray-200"
        >
          <Ionicons name="pencil" size={14} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Cloud Container */}
      <View className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row flex-wrap gap-2 min-h-[80px]">
        
        {/* TODO: [Backend] Ensure API returns an empty array [] rather than null if no skills exist */}
        {skills.length === 0 ? (
          <TouchableOpacity 
            onPress={onEdit} 
            className="py-2 px-4 border border-dashed border-gray-300 rounded-full"
          >
            <Text className="text-gray-500 font-medium">{emptyPrompt}</Text>
          </TouchableOpacity>
        ) : (
          skills.map((skill, index) => (
            <View 
              key={index} 
              className={`px-3 py-1.5 rounded-full border ${pillBgClass}`}
            >
              <Text className={`text-sm font-semibold ${pillTextClass}`}>{skill}</Text>
            </View>
          ))
        )}
        
      </View>
    </View>
  );
}