import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, TextInput, Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Offering } from './MentorshipOfferings';

interface AddOfferingModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newOffering: Offering) => void;
}

const DURATIONS = ['30 min', '45 min', '60 min', '90 min'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

// 1. EXPANDED ICON LIST
const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'bulb-outline', 'code-slash-outline', 'server-outline', 
  'rocket-outline', 'logo-react', 'laptop-outline', 'bug-outline',
  'briefcase-outline', 'chatbubbles-outline', 'color-palette-outline',
  'globe-outline', 'calculator-outline', 'stats-chart-outline',
  'terminal-outline', 'book-outline', 'people-outline', 'shield-checkmark-outline'
];

export function AddOfferingModal({ visible, onClose, onSave }: AddOfferingModalProps) {
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('60 min');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('bulb-outline');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setSelectedDuration('60 min');
      setSelectedLevel('All Levels');
      setSelectedIcon('bulb-outline');
    }
  }, [visible]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your mentorship package a short, catchy title.');
      return;
    }
    
    if (title.length > 50) {
      Alert.alert('Title Too Long', 'Please keep the title under 50 characters.');
      return;
    }

    const newOffering: Offering = {
      id: Date.now().toString(), 
      title: title.trim(),
      description: description.trim(),
      duration: selectedDuration,
      level: selectedLevel,
      icon: selectedIcon,
    };

    onSave(newOffering);
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 mb-2">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">Add Offering</Text>
          <TouchableOpacity onPress={handleSave} className="bg-gray-900 px-5 py-2 rounded-full">
            <Text className="text-white font-bold text-sm">Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-4" keyboardShouldPersistTaps="handled">
            
            {/* Title Input */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Offering Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., React Native Code Review"
                maxLength={50}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 font-bold"
              />
            </View>

            {/* Quick Selectors: Duration & Level */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Duration</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
                {DURATIONS.map(duration => (
                  <TouchableOpacity
                    key={duration}
                    activeOpacity={0.8}
                    onPress={() => setSelectedDuration(duration)}
                    className={`mr-3 py-2.5 px-5 rounded-full border ${
                      selectedDuration === duration ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`font-bold text-sm ${selectedDuration === duration ? 'text-white' : 'text-gray-600'}`}>
                      {duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Target Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
                {LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    activeOpacity={0.8}
                    onPress={() => setSelectedLevel(level)}
                    className={`mr-3 py-2.5 px-5 rounded-full border ${
                      selectedLevel === level ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`font-bold text-sm ${selectedLevel === level ? 'text-white' : 'text-gray-600'}`}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 2. ICON PICKER */}
            <View className="mb-6">
              <Text className="text-sm font-bold text-gray-700 mb-2 ml-1">Choose an Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
                {ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    activeOpacity={0.8}
                    onPress={() => setSelectedIcon(icon)}
                    // Added mr-3 for spacing between the scrolled items
                    className={`w-12 h-12 rounded-full items-center justify-center border mr-3 ${
                      selectedIcon === icon ? 'bg-indigo-100 border-indigo-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Ionicons 
                      name={icon} 
                      size={24} 
                      color={selectedIcon === icon ? '#4f46e5' : '#9ca3af'} 
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description Input */}
            <View className="mb-12">
              <View className="flex-row justify-between items-end mb-2 ml-1 mr-1">
                <Text className="text-sm font-bold text-gray-700">Description (Optional)</Text>
                <Text className="text-xs text-gray-400 font-medium">{description.length}/200</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What will mentees learn or achieve during this session?"
                multiline={true}
                maxLength={200}
                textAlignVertical="top"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 h-32"
              />
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

      </View>
    </Modal>
  );
}