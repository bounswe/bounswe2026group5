import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  name: string;
  bio: string;
  rating?: number;
  reviewCount?: number;
  // TODO: [Backend] Swap these to a real image URI 
  imageUrl?: string; 
  coverUrl?: string; // Added cover photo support
}

export function ProfileHeader({ name, bio, rating, reviewCount, imageUrl, coverUrl }: ProfileHeaderProps) {
  return (
    <View className="bg-white mb-6">
      
      {/* 1. Cover Photo Area */}
      <View className="h-32 bg-indigo-100 w-full">
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} className="w-full h-full" />
        ) : (
          <View className="flex-1 bg-indigo-50 border-b border-indigo-100" />
        )}
      </View>

      {/* 2. Top Row: Avatar & Top-Right Actions */}
      <View className="flex-row justify-between px-4 -mt-12">
        
        {/* Left: Overlapping Avatar */}
        <View className="w-24 h-24 bg-white rounded-full p-1 shadow-sm">
          <View className="w-full h-full bg-gray-200 rounded-full items-center justify-center overflow-hidden">
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} className="w-full h-full" />
            ) : (
              <Text className="text-3xl font-bold text-gray-400">{name.charAt(0)}</Text>
            )}
          </View>
        </View>

        {/* Right: Rating & Settings Gear */}
        <View className="flex-row items-center pt-14 gap-2"> 
          {rating && reviewCount ? (
            <View className="h-8 flex-row items-center bg-amber-50 px-2 rounded-lg border border-amber-100">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-700 font-bold text-xs ml-1">{rating.toFixed(1)}</Text>
            </View>
          ) : null}
          
          {/* Added h-8 w-8, reduced icon size slightly to 18 to fit perfectly */}
          <TouchableOpacity className="h-8 w-8 items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
            <Ionicons name="settings-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
        </View>

      </View>

      {/* 3. Name & Minimal Edit Button */}
      {/* TODO: [Mobile] Wire this up to the EditProfileModal Bottom Sheet */}
      <View className="px-4 mt-2 items-start">
        <Text className="text-2xl font-extrabold text-gray-900">{name}</Text>
        <TouchableOpacity className="mt-0.5 py-1">
          <Text className="text-blue-600 font-medium text-sm">Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Bio below everything */}
      <View className="px-4 mt-3">
        <Text className="text-base text-gray-600 leading-relaxed">
          {bio}
        </Text>
      </View>

    </View>
  );
}