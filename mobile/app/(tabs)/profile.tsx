import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SkillsCloud } from '@/components/profile/SkillsCloud';
import { ViewAllSkillsModal } from '@/components/profile/ViewAllSkillsModal';
import { AvailabilityPreview } from '@/components/profile/AvailabilityPreview';
import { MentorshipOfferings, Offering } from '@/components/profile/MentorshipOfferings';

const MOCK_PROFILE_DATA = {
  user: {
    name: 'Ali Aydın',
    bio: 'Computer Engineering student passionate about full-stack development, system design, and helping others learn React Native.',
    rating: 4.8,
    reviewCount: 12,
  },
  commonData: {
    expertise: ['React Native', 'System Design', 'Django', 'SQL'],
    learningGoals: ['Machine Learning', 'Advanced Algorithms'],
    availability: [
      { day: 'Monday', times: ['10:00 - 12:00', '15:00 - 17:00'] },
      { day: 'Wednesday', times: ['14:00 - 18:00'] }
    ],
    offerings: [
      { id: '1', title: 'React Native Architecture Review', duration: '45 min', level: 'Intermediate', icon: 'logo-react' },
      { id: '2', title: 'System Design Mock Interview', duration: '60 min', level: 'Advanced', icon: 'server-outline' },
    ] as Offering[]
  },
  preferences: {
    showAvailability: true,
    showOfferings: true, 
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

          {preferences.showOfferings && (
            <View className="-mx-4"> 
              <MentorshipOfferings 
                offerings={commonData.offerings}
                onEdit={() => console.log('TODO: Edit Offerings')}
                onSelectOffering={(offering) => console.log('TODO: Open Offering Modal for:', offering.title)}
              />
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