import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MenteeTag {
  label: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

export interface MenteeCardProps {
  id: string;
  name: string;
  subtitle: string;
  tags?: MenteeTag[];
  avatarUrl?: string;
  onMessage?: () => void;
}

export function MenteeCard({ name, subtitle, tags = [], avatarUrl, onMessage }: MenteeCardProps) {
  return (
    <View className="bg-white p-5 rounded-xl shadow-sm mb-3">

      {/* Avatar + Name Row */}
      <View className="flex-row items-center gap-3.5 mb-3.5">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="w-20 h-20 rounded-full" />
        ) : (
          <View className="w-20 h-20 rounded-full bg-surface-active items-center justify-center">
            <Text className="text-[22px] font-bold text-primary">{name.charAt(0)}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-bold text-on-surface">{name}</Text>
          <Text className="text-[13px] text-on-surface-soft mt-0.5">{subtitle}</Text>
        </View>
      </View>

      {/* Tags Row */}
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-3.5">
          {tags.map((tag, index) => (
            <View
              key={index}
              className={`px-2.5 py-1 rounded ${tag.variant === 'accent' ? 'bg-emerald-100' : 'bg-indigo-100'}`}
            >
              <Text className={`text-[10px] font-extrabold uppercase tracking-wide ${tag.variant === 'accent' ? 'text-emerald-800' : 'text-indigo-800'}`}>
                {tag.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Message Button */}
      {/* TODO: API connection — navigate to messaging screen for this mentee */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onMessage}
        className="flex-row items-center justify-center gap-2 bg-primary py-3 rounded-full"
      >
        <Ionicons name="chatbubble" size={16} color="#ffffff" />
        <Text className="text-white font-bold text-sm">Message</Text>
      </TouchableOpacity>

    </View>
  );
}