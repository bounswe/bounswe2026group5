import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ViewAllSkillsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  skills: string[];
  variant: 'mentor' | 'mentee';
}

export function ViewAllSkillsModal({ visible, onClose, title, skills, variant }: ViewAllSkillsModalProps) {
  // Use the same dynamic styling logic so the modal matches the section that opened it
  const isMentor = variant === 'mentor';
  const pillBgClass = isMentor ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100';
  const pillTextClass = isMentor ? 'text-indigo-700' : 'text-emerald-700';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/40 justify-end" 
        onPress={onClose}
      >
        <Pressable 
          onPress={(e) => e.stopPropagation()} 
          className="bg-white w-full rounded-t-3xl p-6 pb-12 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] max-h-[80%]"
        >
          
          {/* Drag Handle */}
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Header Row */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-extrabold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <Ionicons name="close" size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Scrollable List of ALL Skills */}
          <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
            <View className="flex-row flex-wrap gap-3 pb-8">
              {skills.map((skill, index) => (
                <View 
                  key={index} 
                  className={`px-4 py-2.5 rounded-full border ${pillBgClass}`}
                >
                  <Text className={`text-base font-semibold ${pillTextClass}`}>{skill}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}