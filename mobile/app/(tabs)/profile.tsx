import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SkillsCloud } from '@/components/profile/SkillsCloud';

const MOCK_PROFILE_DATA = {
  user: {
    name: 'Ali Aydın',
    bio: 'Computer Engineering student passionate about full-stack development, system design, and helping others learn React Native.',
    rating: 4.8,
    reviewCount: 12,
  },
  commonData: {
    expertise: ['React Native', 'System Design', 'Django', 'SQL'],
    learningGoals: ['Machine Learning', 'Advanced Algorithms', 'DevOps'],
  },
  preferences: {
    showAvailability: true,
    showGivenLectures: true,
    showEnrolledLectures: false,
  }
};

export default function ProfileScreen() {
  const { preferences, commonData } = MOCK_PROFILE_DATA;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} bounces={false}>
        
        <ProfileHeader 
          name={MOCK_PROFILE_DATA.user.name}
          bio={MOCK_PROFILE_DATA.user.bio}
          rating={MOCK_PROFILE_DATA.user.rating}
          reviewCount={MOCK_PROFILE_DATA.user.reviewCount}
        />

        <View className="px-4 pb-12 mt-4">

          <View className="mb-6">
            <SkillsCloud 
            title="Expertise"
            skills={commonData.expertise}
            variant="mentor"
            onEdit={() => console.log('TODO: Open EditSkillsModal for Mentor Expertise')}
          />

          <SkillsCloud 
            title="Learning Goals"
            skills={commonData.learningGoals}
            variant="mentee"
            onEdit={() => console.log('TODO: Open EditSkillsModal for Mentee Learning Goals')}
          />
          </View>
          
          {preferences.showAvailability && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">Availability</Text>
              <View className="bg-gray-50 p-4 rounded-xl border border-gray-100 h-32 justify-center items-center">
                <Text className="text-gray-400 font-medium">Time-Chip Availability Placeholder</Text>
              </View>
            </View>
          )}

          {preferences.showGivenLectures && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">Offered Lectures</Text>
              <View className="bg-gray-50 p-4 rounded-xl border border-gray-100 h-24 justify-center items-center">
                <Text className="text-gray-400 font-medium">Lectures Storefront Placeholder</Text>
              </View>
            </View>
          )}

          {preferences.showEnrolledLectures && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">Enrolled Lectures</Text>
              <View className="bg-gray-50 p-4 rounded-xl border border-gray-100 h-24 justify-center items-center">
                <Text className="text-gray-400 font-medium">Enrolled List Placeholder</Text>
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}