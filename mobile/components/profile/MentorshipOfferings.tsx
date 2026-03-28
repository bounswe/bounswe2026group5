import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Offering {
  id: string;
  title: string;
  duration: string;
  level: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string; // NEW!
}

interface MentorshipOfferingsProps {
  offerings: Offering[];
  // TODO: [Navigation] Wire this up to the AddOfferingModal
  onEdit?: () => void; 
  // TODO: [Navigation] Wire this to open the specific Lecture/Offering Details Bottom Sheet
  onSelectOffering?: (offering: Offering) => void; 
}

export function MentorshipOfferings({ offerings, onEdit, onSelectOffering }: MentorshipOfferingsProps) {
  return (
    <View className="mb-8">
      
      {/* Header Row */}
      <View className="flex-row justify-between items-center mb-4 px-4">
        <Text className="text-lg font-bold text-gray-900">Mentorship Offerings</Text>
        <TouchableOpacity 
          onPress={onEdit} 
          className="p-1.5 bg-gray-50 rounded-md border border-gray-200"
        >
          <Ionicons name="pencil" size={14} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Storefront */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {offerings.length === 0 ? (
          <TouchableOpacity 
            onPress={onEdit} 
            className="w-64 h-32 border-2 border-dashed border-gray-300 rounded-2xl items-center justify-center bg-gray-50"
          >
            <Text className="text-gray-500 font-medium">+ Add a mentorship package</Text>
          </TouchableOpacity>
        ) : (
          offerings.map((offering) => (
            <TouchableOpacity 
              key={offering.id}
              onPress={() => onSelectOffering && onSelectOffering(offering)}
              activeOpacity={0.8}
              className="w-64 bg-white border border-gray-200 rounded-2xl p-4 mr-4 shadow-sm"
            >
              {/* Icon & Duration Row */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center">
                  <Ionicons name={offering.icon} size={20} color="#4f46e5" />
                </View>
                <View className="bg-gray-100 px-2 py-1 rounded-md flex-row items-center">
                  <Ionicons name="time-outline" size={12} color="#6b7280" />
                  <Text className="text-xs font-medium text-gray-600 ml-1">{offering.duration}</Text>
                </View>
              </View>

              {/* Title */}
              <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                {offering.title}
              </Text>

              {/* Level Badge */}
              <Text className="text-sm font-medium text-indigo-600 mt-auto">
                {offering.level} Level
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}