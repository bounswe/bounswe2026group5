import React, { useState } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, TextInput, Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Offering } from './MentorshipOfferings';

interface ManageOfferingsModalProps {
  visible: boolean;
  offerings: Offering[];
  onClose: () => void;
  onAdd: (newOffering: Offering) => void;
  onDelete: (id: string) => void;
  onReorder: (newOrder: Offering[]) => void;
}

const DURATIONS = ['30 min', '45 min', '60 min', '90 min'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'bulb-outline', 'code-slash-outline', 'server-outline', 
  'rocket-outline', 'logo-react', 'laptop-outline', 'bug-outline'
];

export function ManageOfferingsModal({ 
  visible, offerings, onClose, onAdd, onDelete, onReorder 
}: ManageOfferingsModalProps) {
  const insets = useSafeAreaInsets();
  
  // Composer State
  const [title, setTitle] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('60 min');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('bulb-outline');

  const handleAdd = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your package a title.');
      return;
    }
    const newOffering: Offering = {
      id: Date.now().toString(), 
      title: title.trim(),
      duration: selectedDuration,
      level: selectedLevel,
      icon: selectedIcon,
    };
    onAdd(newOffering);
    
    // Reset composer
    setTitle('');
    setSelectedDuration('60 min');
    setSelectedLevel('All Levels');
    setSelectedIcon('bulb-outline');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === offerings.length - 1) return;

    const newOfferings = [...offerings];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap elements
    [newOfferings[index], newOfferings[swapIndex]] = [newOfferings[swapIndex], newOfferings[index]];
    onReorder(newOfferings);
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-100 z-10">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">Manage Offerings</Text>
          <View className="w-8" /> 
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1" keyboardShouldPersistTaps="handled">
            
            {/* 1. QUICK COMPOSER SECTION */}
            <View className="bg-white px-6 pt-6 pb-8 border-b border-gray-100 mb-2">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Create New</Text>
              
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Offering Title (e.g., React Review)"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 font-bold mb-4"
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2 mb-4">
                {DURATIONS.map(dur => (
                  <TouchableOpacity
                    key={dur} onPress={() => setSelectedDuration(dur)}
                    className={`mr-2 py-2 px-4 rounded-full border ${selectedDuration === dur ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`font-bold text-xs ${selectedDuration === dur ? 'text-white' : 'text-gray-600'}`}>{dur}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2 mb-4">
                {LEVELS.map(lvl => (
                  <TouchableOpacity
                    key={lvl} onPress={() => setSelectedLevel(lvl)}
                    className={`mr-2 py-2 px-4 rounded-full border ${selectedLevel === lvl ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`font-bold text-xs ${selectedLevel === lvl ? 'text-white' : 'text-gray-600'}`}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2 mb-6">
                {ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon} onPress={() => setSelectedIcon(icon)}
                    className={`w-10 h-10 rounded-full items-center justify-center border mr-2 ${selectedIcon === icon ? 'bg-indigo-100 border-indigo-600' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Ionicons name={icon} size={20} color={selectedIcon === icon ? '#4f46e5' : '#9ca3af'} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity onPress={handleAdd} className="bg-gray-900 py-3.5 rounded-xl items-center">
                <Text className="text-white font-bold text-base">+ Add Offering</Text>
              </TouchableOpacity>
            </View>

            {/* 2. EXISTING OFFERINGS LIST */}
            <View className="px-6 pb-12 pt-4">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Your Active Offerings ({offerings.length})</Text>
              
              {offerings.map((item, index) => (
                <View key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 flex-row items-center mb-3 shadow-sm">
                  
                  <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mr-3">
                    <Ionicons name={item.icon} size={20} color="#4f46e5" />
                  </View>
                  
                  <View className="flex-1 mr-2">
                    <Text className="font-bold text-gray-900 mb-0.5" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-xs text-gray-500 font-medium">{item.duration} • {item.level}</Text>
                  </View>

                  {/* Controls: Up, Down, Delete */}
                  <View className="flex-row items-center gap-1 border-l border-gray-100 pl-2">
                    <View>
                      <TouchableOpacity onPress={() => moveItem(index, 'up')} disabled={index === 0} className="p-1">
                        <Ionicons name="chevron-up" size={20} color={index === 0 ? '#d1d5db' : '#4b5563'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveItem(index, 'down')} disabled={index === offerings.length - 1} className="p-1">
                        <Ionicons name="chevron-down" size={20} color={index === offerings.length - 1 ? '#d1d5db' : '#4b5563'} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => onDelete(item.id)} className="p-2 ml-1 bg-red-50 rounded-lg">
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  
                </View>
              ))}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}