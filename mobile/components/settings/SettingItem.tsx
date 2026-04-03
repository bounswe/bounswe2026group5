import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  // Use 'toggle' for switches, 'link' for navigation/clicks
  type?: 'link' | 'toggle';
  // For 'link' type: optional text to show on the right (e.g., "English")
  value?: string;
  // For 'toggle' type
  isToggled?: boolean;
  onToggle?: (val: boolean) => void;
  // Action for 'link' type
  onPress?: () => void;
  // Styling
  isDestructive?: boolean;
}

export function SettingItem({ 
  icon, label, type = 'link', value, isToggled, onToggle, onPress, isDestructive 
}: Readonly<SettingItemProps>) {
  
  const content = (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100 bg-white px-4">
      <View className="flex-row items-center">
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isDestructive ? 'bg-red-50' : 'bg-gray-50'}`}>
          <Ionicons name={icon} size={18} color={isDestructive ? '#ef4444' : '#4b5563'} />
        </View>
        <Text className={`text-base font-semibold ${isDestructive ? 'text-red-500' : 'text-gray-900'}`}>
          {label}
        </Text>
      </View>

      <View className="flex-row items-center">
        {type === 'link' && (
          <>
            {value && <Text className="text-gray-500 font-medium mr-2">{value}</Text>}
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </>
        )}
        {type === 'toggle' && (
          <Switch 
            value={isToggled} 
            onValueChange={onToggle}
            trackColor={{ false: '#e5e7eb', true: '#4f46e5' }}
            thumbColor={'#ffffff'}
          />
        )}
      </View>
    </View>
  );

  if (type === 'toggle') {
    return <View>{content}</View>; // Toggles shouldn't have row-level opacity feedback
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}