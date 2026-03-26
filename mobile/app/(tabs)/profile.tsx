import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SkillsCloud } from '@/components/profile/SkillsCloud';
import { ViewAllSkillsModal } from '@/components/profile/ViewAllSkillsModal';
import { AvailabilityPreview } from '@/components/profile/AvailabilityPreview';

const MOCK_PROFILE_DATA = {
  user: {
    name: 'Ali Aydın',
    bio: 'Computer Engineering student passionate about full-stack development, system design, and helping others learn React Native.',
    rating: 4.8,
    reviewCount: 12,
  },
  commonData: {
    expertise: ['React Native', 'System Design', 'Django', 'SQL', 'Data Structures', 'Algorithms', 'Git', 'Agile Methodologies'],
    learningGoals: ['Machine Learning', 'Advanced Algorithms'],
    availability: [
      { day: 'Monday', times: ['10:00 - 12:00', '15:00 - 17:00'] },
      { day: 'Wednesday', times: ['14:00 - 18:00'] },
      { day: 'Friday', times: ['09:00 - 10:30'] }
    ]
  },
  preferences: {
    showAvailability: true,
    showGivenLectures: true,
    showEnrolledLectures: false,
  }
};

export default function ProfileScreen() {
  const { preferences, commonData } = MOCK_PROFILE_DATA;

  const [skillsModalConfig, setSkillsModalConfig] = useState<{
    visible: boolean;
    title: string;
    skills: string[];
    variant: 'mentor' | 'mentee';
  }>({ visible: false, title: '', skills: [], variant: 'mentor' });

  // Helper function to easily open the modal
  const openSkillsModal = (title: string, skills: string[], variant: 'mentor' | 'mentee') => {
    setSkillsModalConfig({ visible: true, title, skills, variant });
  };

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
            onViewAll={() => openSkillsModal('Expertise', commonData.expertise, 'mentor')}
          />

          <SkillsCloud 
            title="Learning Goals"
            skills={commonData.learningGoals}
            variant="mentee"
            onEdit={() => console.log('TODO: Open EditSkillsModal for Mentee Learning Goals')}
            onViewAll={() => openSkillsModal('Learning Goals', commonData.learningGoals, 'mentee')}
          />
          </View>
          
          {/* Optional: Availability (Mentor focus) */}
          {preferences.showAvailability && (
            <AvailabilityPreview 
              schedule={commonData.availability}
              onEdit={() => console.log('TODO: Open EditAvailabilityModal')}
            />
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

      {/* The Reusable Bottom Sheet */}
      <ViewAllSkillsModal
        visible={skillsModalConfig.visible}
        title={skillsModalConfig.title}
        skills={skillsModalConfig.skills}
        variant={skillsModalConfig.variant}
        onClose={() => setSkillsModalConfig(prev => ({ ...prev, visible: false }))}
      />

    </View>
  );
}