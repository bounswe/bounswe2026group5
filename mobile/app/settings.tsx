import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SettingItem } from '@/components/settings/SettingItem'; 

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // TODO: Replace with real user preferences from backend
  const [prefs, setPrefs] = useState({
    showAvailability: true,
    showOfferings: true,
    notifRequests: true,
    notifReminders: true,
    notifUpdates: false,
  });

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAccountDeletion = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log('Account deleted') }
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      
      {/* 1. FORCE HIDE DEFAULT HEADER */}
      <Stack.Screen options={{ headerShown: false, headerBackVisible: false }} />

      {/* 2. ONLY ONE CUSTOM HEADER */}
      <View className="bg-white z-10 shadow-sm border-b border-gray-100" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 pb-3 pt-2">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="p-2 -ml-2 mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Section: Profile Visibility */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-4 mt-6 mb-2">Profile Visibility</Text>
        <View className="bg-white border-t border-gray-100">
          <SettingItem 
            type="toggle" icon="calendar-outline" label="Show Availability Schedule" 
            isToggled={prefs.showAvailability} onToggle={() => togglePref('showAvailability')} 
          />
          <SettingItem 
            type="toggle" icon="library-outline" label="Show Mentorship Offerings" 
            isToggled={prefs.showOfferings} onToggle={() => togglePref('showOfferings')} 
          />
        </View>

        {/* Section: Preferences */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-4 mt-8 mb-2">Preferences</Text>
        <View className="bg-white border-t border-gray-100">
          <SettingItem 
            icon="time-outline" label="Timezone" value="Europe/Istanbul" 
            onPress={() => console.log('Open Timezone Picker')} 
          />
          <SettingItem 
            icon="globe-outline" label="Language" value="English" 
            onPress={() => console.log('Open Language Picker')} 
          />
        </View>

        {/* Section: Notifications */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-4 mt-8 mb-2">Notifications</Text>
        <View className="bg-white border-t border-gray-100">
          <SettingItem 
            type="toggle" icon="person-add-outline" label="New Mentorship Requests" 
            isToggled={prefs.notifRequests} onToggle={() => togglePref('notifRequests')} 
          />
          <SettingItem 
            type="toggle" icon="alarm-outline" label="Session Reminders" 
            isToggled={prefs.notifReminders} onToggle={() => togglePref('notifReminders')} 
          />
          <SettingItem 
            type="toggle" icon="megaphone-outline" label="Platform Updates" 
            isToggled={prefs.notifUpdates} onToggle={() => togglePref('notifUpdates')} 
          />
        </View>

        {/* Section: Account & About */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-4 mt-8 mb-2">Account</Text>
        <View className="bg-white border-t border-gray-100">
          <SettingItem icon="lock-closed-outline" label="Privacy Policy" onPress={() => console.log('Open Privacy')} />
          <SettingItem icon="document-text-outline" label="Terms of Service" onPress={() => console.log('Open ToS')} />
          <SettingItem 
            icon="trash-outline" label="Delete Account" 
            isDestructive={true} onPress={handleAccountDeletion} 
          />
        </View>

        <Text className="text-center text-gray-400 font-medium text-xs mt-8">Version 1.0.0 (MVP)</Text>
      </ScrollView>

    </View>
  );
}