import React, { useState } from "react";
import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";
import { MentorshipOfferings, Offering } from "@/components/profile/MentorshipOfferings";
import { EditSkillsModal } from "@/components/profile/EditSkillsModal";
import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";
import {
  EditProfileModal,
  UserProfileData,
} from "@/components/profile/EditProfileModal";
import { BookingModal } from "@/components/profile/BookingModal";
import { AddOfferingModal } from "@/components/profile/AddOfferingModal";

const MOCK_PROFILE_DATA = {
  user: {
    name: "Ali Aydın",
    bio: "Computer Engineering student passionate about full-stack development, system design, and helping others learn React Native.",
    rating: 4.8,
    reviewCount: 12,
  },
  commonData: {
    expertise: ["React Native", "System Design", "Django", "SQL"],
    learningGoals: ["Machine Learning", "Advanced Algorithms"],
    availability: [
      { day: "Monday", times: ["10:00 - 12:00", "15:00 - 17:00"] },
      { day: "Wednesday", times: ["14:00 - 18:00"] },
    ],
    offerings: [
      {
        id: "1",
        title: "React Native Architecture Review",
        duration: "45 min",
        level: "Intermediate",
        icon: "logo-react",
      },
      {
        id: "2",
        title: "System Design Mock Interview",
        duration: "60 min",
        level: "Advanced",
        icon: "server-outline",
      },
    ] as Offering[],
  },
  preferences: {
    showAvailability: true,
    showOfferings: true,
  },
};

export default function ProfileScreen() {
  const { preferences, commonData } = MOCK_PROFILE_DATA;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(
    null,
  );

  const [userData, setUserData] = useState<UserProfileData>({
    name: MOCK_PROFILE_DATA.user.name,
    bio: MOCK_PROFILE_DATA.user.bio,
  });

  const [skillsModalConfig, setSkillsModalConfig] = useState<{
    visible: boolean;
    title: string;
    skills: string[];
    variant: "mentor" | "mentee";
  }>({ visible: false, title: "", skills: [], variant: "mentor" });

  const [editModalConfig, setEditModalConfig] = useState<{
    visible: boolean;
    title: string;
    skills: string[];
    variant: "mentor" | "mentee";
    onSave: (newSkills: string[]) => void;
  }>({
    visible: false,
    title: "",
    skills: [],
    variant: "mentor",
    onSave: () => {},
  });

  const [expertiseData, setExpertiseData] = useState(commonData.expertise);
  const [learningGoalsData, setLearningGoalsData] = useState(
    commonData.learningGoals,
  );
  const [availabilityData, setAvailabilityData] = useState(
    commonData.availability,
  );
  const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [offeringsData, setOfferingsData] = useState<Offering[]>(
    commonData.offerings,
  );
  const [isAddOfferingModalOpen, setAddOfferingModalOpen] = useState(false);

  const openEditModal = (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
    saveHandler: (s: string[]) => void,
  ) => {
    setEditModalConfig({
      visible: true,
      title,
      skills,
      variant,
      onSave: saveHandler,
    });
  };

  const openSkillsModal = (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
  ) => {
    setSkillsModalConfig({ visible: true, title, skills, variant });
  };

  return (
    <View className="flex-1 bg-white">
      <View 
        className="bg-white z-10 shadow-sm border-b border-gray-100" 
        style={{ paddingTop: insets.top }} 
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-xl font-extrabold text-gray-900">Profile</Text>
          
          {/* THE UPDATED GEAR ICON */}
          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. THE SCROLLVIEW */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        // 3. THE BOTTOM FIX: We use a massive bottom padding to force the content over the tab bar
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <ProfileHeader
          name={userData.name}
          bio={userData.bio}
          rating={MOCK_PROFILE_DATA.user.rating}
          reviewCount={MOCK_PROFILE_DATA.user.reviewCount}
          onEdit={() => setEditProfileModalOpen(true)}
        />

        <View className="px-4 mt-4">
          <View className="mb-6">
            <SkillsCloud
              title="Expertise"
              skills={expertiseData}
              variant="mentor"
              onEdit={() =>
                openEditModal(
                  "Expertise",
                  expertiseData,
                  "mentor",
                  setExpertiseData,
                )
              }
              onViewAll={() =>
                openSkillsModal("Expertise", expertiseData, "mentor")
              }
            />

            <SkillsCloud
              title="Learning Goals"
              skills={learningGoalsData}
              variant="mentee"
              onEdit={() =>
                openEditModal(
                  "Learning Goals",
                  learningGoalsData,
                  "mentee",
                  setLearningGoalsData,
                )
              }
              onViewAll={() =>
                openSkillsModal("Learning Goals", learningGoalsData, "mentee")
              }
            />
          </View>

          {preferences.showAvailability && (
            <AvailabilityPreview
              schedule={availabilityData}
              onEdit={() => setAvailabilityModalOpen(true)}
            />
          )}

          {preferences.showOfferings && (
            <View className="-mx-4">
              <MentorshipOfferings
                offerings={offeringsData}
                onEdit={() => setAddOfferingModalOpen(true)}
                onSelectOffering={(offering) => setSelectedOffering(offering)}
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
        onClose={() =>
          setSkillsModalConfig((prev) => ({ ...prev, visible: false }))
        }
      />

      {/* The Reusable Edit Skills Sheet */}
      <EditSkillsModal
        visible={editModalConfig.visible}
        title={editModalConfig.title}
        initialSkills={editModalConfig.skills}
        variant={editModalConfig.variant}
        onSave={editModalConfig.onSave}
        onClose={() =>
          setEditModalConfig((prev) => ({ ...prev, visible: false }))
        }
      />

      {/* The Availability Manager Sheet */}
      <EditAvailabilityModal
        visible={isAvailabilityModalOpen}
        initialSchedule={availabilityData}
        onSave={setAvailabilityData}
        onClose={() => setAvailabilityModalOpen(false)}
      />

      {/* The Edit Profile Modal */}
      <EditProfileModal
        visible={isEditProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        initialData={userData}
        onSave={(updatedData) => {
          setUserData(updatedData);
          setEditProfileModalOpen(false);
        }}
      />

      {/* The Add Offering Modal */}
      <AddOfferingModal
        visible={isAddOfferingModalOpen}
        onClose={() => setAddOfferingModalOpen(false)}
        onSave={(newOffering) => {
          setOfferingsData([...offeringsData, newOffering]);
          setAddOfferingModalOpen(false);
        }}
      />

      <BookingModal 
        visible={!!selectedOffering}
        offering={selectedOffering}
        availability={availabilityData} 
        onClose={() => setSelectedOffering(null)}
      />
    </View>
  );
}
