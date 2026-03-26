import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, ScrollView, 
  Switch, TextInput, KeyboardAvoidingView, Platform, Pressable 
} from 'react-native';
// 1. Import the hook from the modern, correct library!
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AvailabilitySlot } from './AvailabilityPreview';

interface EditAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
  initialSchedule: AvailabilitySlot[];
  onSave: (newSchedule: AvailabilitySlot[]) => void;
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DayState = {
  enabled: boolean;
  slots: { id: string; start: string; end: string }[];
};

export function EditAvailabilityModal({ visible, onClose, initialSchedule, onSave }: EditAvailabilityModalProps) {
  const [scheduleState, setScheduleState] = useState<Record<string, DayState>>({});
  
  // 2. Initialize the hook to get the exact pixel height of the notch/status bar
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      const parsedState: Record<string, DayState> = {};
      WEEK_DAYS.forEach(day => {
        const existingDay = initialSchedule.find(s => s.day === day);
        if (existingDay && existingDay.times.length > 0) {
          parsedState[day] = {
            enabled: true,
            slots: existingDay.times.map((timeStr, index) => {
              const [start, end] = timeStr.split(' - ');
              return { id: `${day}-${index}`, start: start || '09:00', end: end || '17:00' };
            })
          };
        } else {
          parsedState[day] = { enabled: false, slots: [{ id: `${day}-default`, start: '09:00', end: '17:00' }] };
        }
      });
      setScheduleState(parsedState);
    }
  }, [visible, initialSchedule]);

  const toggleDay = (day: string) => {
    setScheduleState(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));
  };

  const addSlot = (day: string) => {
    setScheduleState(prev => ({
      ...prev,
      [day]: { ...prev[day], slots: [...prev[day].slots, { id: Date.now().toString(), start: '09:00', end: '17:00' }] }
    }));
  };

  const removeSlot = (day: string, slotId: string) => {
    setScheduleState(prev => ({
      ...prev,
      [day]: { ...prev[day], slots: prev[day].slots.filter(slot => slot.id !== slotId) }
    }));
  };

  const updateTime = (day: string, slotId: string, field: 'start' | 'end', value: string) => {
    setScheduleState(prev => ({
      ...prev,
      [day]: { ...prev[day], slots: prev[day].slots.map(slot => slot.id === slotId ? { ...slot, [field]: value } : slot) }
    }));
  };

  const handleSave = () => {
    const finalSchedule: AvailabilitySlot[] = [];
    WEEK_DAYS.forEach(day => {
      const dayData = scheduleState[day];
      if (dayData && dayData.enabled && dayData.slots.length > 0) {
        finalSchedule.push({ day, times: dayData.slots.map(slot => `${slot.start} - ${slot.end}`) });
      }
    });
    onSave(finalSchedule);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      {/* 3. Apply the padding dynamically instead of relying on SafeAreaView components */}
      <View 
        className="flex-1 bg-white" 
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100 mb-2">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">Weekly Hours</Text>
          <TouchableOpacity onPress={handleSave} className="bg-gray-900 px-5 py-2 rounded-full">
            <Text className="text-white font-bold text-sm">Save</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1 px-6"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-y-6 pb-12 mt-4">
              {WEEK_DAYS.map(day => {
                const isEnabled = scheduleState[day]?.enabled;
                const slots = scheduleState[day]?.slots || [];

                return (
                  <View key={day} className="border-b border-gray-100 pb-6">
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-row items-center">
                        <View style={{ transform: [{ scale: 0.85 }] }} className="mr-2">
                          <Switch 
                            value={isEnabled} 
                            onValueChange={() => toggleDay(day)}
                            trackColor={{ false: '#e5e7eb', true: '#4f46e5' }}
                          />
                        </View>
                        <Text className={`text-base font-bold ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                          {day}
                        </Text>
                      </View>
                      {!isEnabled && (
                        <Text className="text-sm font-medium text-gray-400">Unavailable</Text>
                      )}
                    </View>

                    {isEnabled && (
                      <View className="pl-14">
                        {slots.map((slot) => (
                          <View key={slot.id} className="flex-row items-center gap-2 mb-3">
                            <TextInput 
                              value={slot.start}
                              onChangeText={(val) => updateTime(day, slot.id, 'start', val)}
                              keyboardType="numbers-and-punctuation"
                              className="bg-gray-50 border border-gray-200 py-3 px-2 rounded-lg flex-1 text-center text-gray-700 font-bold"
                            />
                            <Text className="text-gray-400 font-medium">-</Text>
                            <TextInput 
                              value={slot.end}
                              onChangeText={(val) => updateTime(day, slot.id, 'end', val)}
                              keyboardType="numbers-and-punctuation"
                              className="bg-gray-50 border border-gray-200 py-3 px-2 rounded-lg flex-1 text-center text-gray-700 font-bold"
                            />
                            <TouchableOpacity onPress={() => removeSlot(day, slot.id)} className="p-3 bg-red-50 rounded-lg ml-1">
                              <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        
                        {/* 4. The Pressable Fix: Static className, Dynamic style */}
                        <Pressable 
                          onPress={() => addSlot(day)} 
                          className="flex-row items-center mt-1 py-2"
                          style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
                        >
                          <Ionicons name="add" size={18} color="#4f46e5" />
                          <Text className="text-indigo-600 font-semibold ml-1">Add hours</Text>
                        </Pressable>
                        
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

      </View>
    </Modal>
  );
}