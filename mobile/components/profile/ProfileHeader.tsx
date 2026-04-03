import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ProfileHeaderProps {
  name: string;
  bio: string;
  rating?: number;
  reviewCount?: number;
  // NEW: Impact Stats
  totalSessions?: number;
  menteesHelped?: number;
  imageUrl?: string;
  coverUrl?: string;
  onEdit?: () => void;
}

export function ProfileHeader({
  name,
  bio,
  rating,
  reviewCount,
  totalSessions = 24, // Mock default
  menteesHelped = 15, // Mock default
  imageUrl,
  coverUrl,
  onEdit,
}: Readonly<ProfileHeaderProps>) {
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
              <Text className="text-3xl font-bold text-gray-400">
                {name.charAt(0)}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Rating & Edit Button */}
        <View className="flex-row items-center pt-14 gap-2">
          {rating ? (
            <View className="h-8 flex-row items-center bg-amber-50 px-2 rounded-lg border border-amber-100">
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text className="text-amber-700 font-bold text-xs ml-1">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}

          {onEdit ? (
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center bg-gray-100 rounded-lg border border-gray-200"
              onPress={onEdit}
            >
              <Ionicons name="pencil" size={18} color="#4b5563" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 3. Name */}
      <View className="px-4 mt-2 items-start">
        <Text className="text-2xl font-extrabold text-gray-900">{name}</Text>
      </View>

      {/* 4. Bio */}
      <View className="px-4 mt-3">
        <Text className="text-base text-gray-600 leading-relaxed">{bio}</Text>
      </View>

      {/* 5. NEW: Impact Stats Row */}
      <View className="px-4 mt-6">
        <View className="flex-row items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <View className="items-center flex-1 border-r border-gray-200">
            <Text className="text-xl font-extrabold text-indigo-600 mb-0.5">
              {totalSessions}
            </Text>
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Sessions
            </Text>
          </View>

          <View className="items-center flex-1 border-r border-gray-200">
            <Text className="text-xl font-extrabold text-emerald-600 mb-0.5">
              {menteesHelped}
            </Text>
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Mentees
            </Text>
          </View>

          <View className="items-center flex-1">
            <Text className="text-xl font-extrabold text-gray-900 mb-0.5">
              {reviewCount || 0}
            </Text>
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Reviews
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
