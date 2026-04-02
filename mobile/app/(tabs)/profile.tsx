import React, { useEffect, useState } from "react";
import { View, ScrollView, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";
import {
  MentorshipOfferings,
  Offering,
} from "@/components/profile/MentorshipOfferings";
import { EditSkillsModal } from "@/components/profile/EditSkillsModal";
import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";
import {
  EditProfileModal,
  UserProfileData,
} from "@/components/profile/EditProfileModal";
import { BookingModal } from "@/components/profile/BookingModal";
import { ManageOfferingsModal } from "@/components/profile/ManageOfferingsModal";
import {
  mapAvailabilityToSchedule,
  useAvailabilitySlotsQuery,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";

// Mock Data from centralized file
import { MOCK_AVAILABILITY, MOCK_OFFERINGS } from "@/constants/mockData";

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
  const currentUsername = useAuthStore((state) => state.user?.username);
  const availabilityQuery = useAvailabilitySlotsQuery(currentUsername || '');

  const [availabilityData, setAvailabilityData] = useState(MOCK_AVAILABILITY);
  const [offeringsData, setOfferingsData] = useState<Offering[]>(
    MOCK_OFFERINGS as Offering[],
  );
  const [expertiseData, setExpertiseData] = useState(commonData.expertise);
  const [learningGoalsData, setLearningGoalsData] = useState(
    commonData.learningGoals,
  );

  const [userData, setUserData] = useState<UserProfileData>({
    name: MOCK_PROFILE_DATA.user.name,
    bio: MOCK_PROFILE_DATA.user.bio,
  });

  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(
    null,
  );
  const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isManageOfferingsModalOpen, setManageOfferingsModalOpen] =
    useState(false);

  useEffect(() => {
    if (availabilityQuery.data) {
      setAvailabilityData(mapAvailabilityToSchedule(availabilityQuery.data));
    }
  }, [availabilityQuery.data]);

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
          <TouchableOpacity
            onPress={() => router.push("/settings" as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
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
                onEdit={() => setManageOfferingsModalOpen(true)}
                onSelectOffering={(offering) => setSelectedOffering(offering)}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <ViewAllSkillsModal
        visible={skillsModalConfig.visible}
        title={skillsModalConfig.title}
        skills={skillsModalConfig.skills}
        variant={skillsModalConfig.variant}
        onClose={() =>
          setSkillsModalConfig((prev) => ({ ...prev, visible: false }))
        }
      />
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
      <EditAvailabilityModal
        visible={isAvailabilityModalOpen}
        initialSchedule={availabilityData}
        onSave={setAvailabilityData}
        onClose={() => setAvailabilityModalOpen(false)}
      />
      <EditProfileModal
        visible={isEditProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
        initialData={userData}
        onSave={(updatedData) => {
          setUserData(updatedData);
          setEditProfileModalOpen(false);
        }}
      />
      <ManageOfferingsModal
        visible={isManageOfferingsModalOpen}
        offerings={offeringsData}
        onClose={() => setManageOfferingsModalOpen(false)}
        onAdd={(newOffering) =>
          setOfferingsData([...offeringsData, newOffering])
        }
        onDelete={(id) =>
          setOfferingsData(offeringsData.filter((o) => o.id !== id))
        }
        onReorder={(newOrder) => setOfferingsData(newOrder)}
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
