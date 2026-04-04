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

// Combined imports from both branches
import { API_BASE_URL } from "@/constants/api";
import {
  mapAvailabilityToSchedule,
  useAvailabilitySlotsQuery,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";

const PROFILE_DEFAULTS = {
  rating: 0,
  reviewCount: 0,
  expertise: [] as string[],
  learningGoals: [] as string[],
  preferences: {
    showAvailability: true,
    showOfferings: true,
  },
};

export default function ProfileScreen() {
  const { preferences } = PROFILE_DEFAULTS;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const availabilityQuery = useAvailabilitySlotsQuery(currentUsername || "");

  const [availabilityData, setAvailabilityData] = useState<
    { day: string; times: string[] }[]
  >([]);
  const [offeringsData, setOfferingsData] = useState<Offering[]>([]);
  const [expertiseData, setExpertiseData] = useState<string[]>(
    PROFILE_DEFAULTS.expertise,
  );
  const [learningGoalsData, setLearningGoalsData] = useState<string[]>(
    PROFILE_DEFAULTS.learningGoals,
  );

  const [userData, setUserData] = useState<UserProfileData>({
    name: authUser?.username ?? "User",
    bio: "",
  });

  useEffect(() => {
    setUserData((prev) => ({
      ...prev,
      name: authUser?.username ?? prev.name,
    }));
  }, [authUser?.username]);

  const [selectedOffering, setSelectedOffering] = useState<Offering | null>(
    null,
  );
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isManageOfferingsModalOpen, setManageOfferingsModalOpen] =
    useState(false);

  // From feat/mobile-discovery-profile-skills: Load available skills
  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/api/profiles/skills/`, {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load skills.");
        }
        const payload = (await response.json()) as Array<{ name: string }>;
        if (!mounted) {
          return;
        }
        setAvailableSkills(payload.map((skill) => skill.name));
      })
      .catch(() => {
        if (mounted) {
          setAvailableSkills([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // From feat/mobile-react-query-backend-wireup: Sync availability data
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
          rating={PROFILE_DEFAULTS.rating}
          reviewCount={PROFILE_DEFAULTS.reviewCount}
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
        availableSkills={availableSkills}
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