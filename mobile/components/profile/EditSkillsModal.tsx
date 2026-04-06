import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, Pressable, 
  TextInput, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_SKILLS_DB = [
  'React Native', 'React', 'JavaScript', 'TypeScript', 'Node.js', 
  'Python', 'Django', 'SQL', 'PostgreSQL', 'System Design', 
  'Machine Learning', 'AWS', 'Docker', 'GraphQL', 'Swift', 'Kotlin'
].sort((a, b) => a.localeCompare(b));

interface EditSkillsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  initialSkills: string[];
  variant: 'mentor' | 'mentee';
  availableSkills?: string[];
  onSave: (newSkills: string[]) => void;
}

export function EditSkillsModal({
  visible,
  onClose,
  title,
  initialSkills,
  variant,
  availableSkills = [],
  onSave,
}: Readonly<EditSkillsModalProps>) {
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (visible) {
      setCurrentSkills(initialSkills);
      setInputText('');
    }
  }, [visible, initialSkills]);

  const isMentor = variant === 'mentor';
  const bgClass = isMentor ? 'bg-indigo-50 border-indigo-200' : 'bg-emerald-50 border-emerald-200';
  const textClass = isMentor ? 'text-indigo-700' : 'text-emerald-700';

  const suggestionsCatalog =
    availableSkills.length > 0
      ? [...availableSkills].sort((a, b) => a.localeCompare(b))
      : MOCK_SKILLS_DB;

  const filteredSuggestions = suggestionsCatalog.filter(skill => 
    skill.toLowerCase().includes(inputText.toLowerCase()) && 
    !currentSkills.includes(skill)
  );

  const handleSelectSkill = (skill: string) => {
    setCurrentSkills([...currentSkills, skill]);
    setInputText(''); // Clear search after picking
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCurrentSkills(currentSkills.filter(skill => skill !== skillToRemove));
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
          <Pressable 
            onPress={(e) => e.stopPropagation()} 
            className="bg-white w-full rounded-t-3xl p-6 pb-8 shadow-2xl h-[85%]"
          >
            
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-extrabold text-gray-900">Edit {title}</Text>
              <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                <Ionicons name="close" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {/* 1. Selected Skills */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {currentSkills.length === 0 ? (
                <Text className="text-gray-400 font-medium italic py-1">No {title.toLowerCase()} selected.</Text>
              ) : (
                currentSkills.map((skill) => ( 
                  <View key={skill} className={`px-3 py-1.5 rounded-full border flex-row items-center ${bgClass}`}>
                    <Text className={`text-sm font-semibold mr-1.5 ${textClass}`}>{skill}</Text>
                    <TouchableOpacity onPress={() => handleRemoveSkill(skill)} className="p-0.5 bg-white/60 rounded-full">
                      <Ionicons name="close" size={12} color={isMentor ? '#4338ca' : '#047857'} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* 2. Search Input */}
            <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center mb-4">
              <Ionicons name="search" size={18} color="#9ca3af" className="mr-2" />
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Search for a skill..."
                className="flex-1 text-base text-gray-900"
                autoCorrect={false}
              />
              {inputText.length > 0 && (
                <TouchableOpacity onPress={() => setInputText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* 3. Filtered Suggestions List */}
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4" keyboardShouldPersistTaps="handled">
              {filteredSuggestions.length === 0 ? (
                <Text className="text-center text-gray-400 mt-4">No matching skills found.</Text>
              ) : (
                filteredSuggestions.map((skill) => ( 
                  <TouchableOpacity 
                    key={skill} 
                    onPress={() => handleSelectSkill(skill)}
                    className="flex-row items-center justify-between py-3 border-b border-gray-100"
                  >
                    <Text className="text-base text-gray-700 font-medium">{skill}</Text>
                    <Ionicons name="add-circle-outline" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity 
              onPress={() => { onSave(currentSkills); onClose(); }}
              className="bg-gray-900 py-4 rounded-xl items-center mt-auto"
            >
              <Text className="text-white text-lg font-bold">Save Changes</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}