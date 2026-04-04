import React, { useEffect, useState } from "react";
import { Alert, View, ScrollView, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";
import { EditSkillsModal } from "@/components/profile/EditSkillsModal";
import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";
import {
  EditProfileModal,
  UserProfileData,
} from "@/components/profile/EditProfileModal";

import { API_BASE_URL } from "@/constants/api";
import {
  mapAvailabilityToSchedule,
  useAvailabilitySlotsQuery,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";
import { useProfileVisibilityStore } from "@/lib/profile/preferences";
import { useUpdateOwnProfileMutation } from "@/lib/queries/profile";

const PROFILE_DEFAULTS = {
  rating: 0,
  reviewCount: 0,
  expertise: [] as string[],
  eagerToLearn: [] as string[],
};

interface OwnProfileResponse {
  full_name: string;
  bio: string;
  picture_url: string;
  expertises?: string[];
  eager_to_learn?: string[];
}

function includesMentor(mode?: string): boolean {
  return mode === "MENTOR" || mode === "BOTH";
}

function includesMentee(mode?: string): boolean {
  return mode === "MENTEE" || mode === "BOTH";
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const availabilityQuery = useAvailabilitySlotsQuery(currentUsername || "");
  const updateProfileMutation = useUpdateOwnProfileMutation();

  const showExpertise = useProfileVisibilityStore((state) => state.showExpertise);
  const showEagerToLearn = useProfileVisibilityStore((state) => state.showEagerToLearn);
  const showAvailability = useProfileVisibilityStore((state) => state.showAvailability);
  const showOfferings = useProfileVisibilityStore((state) => state.showOfferings);

  const [availabilityData, setAvailabilityData] = useState<
    { day: string; times: string[] }[]
  >([]);
  const [expertiseData, setExpertiseData] = useState<string[]>(
    PROFILE_DEFAULTS.expertise,
  );
  const [eagerToLearnData, setEagerToLearnData] = useState<string[]>(
    PROFILE_DEFAULTS.eagerToLearn,
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

  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);

  const hasExpertiseData = expertiseData.length > 0;
  const hasEagerToLearnData = eagerToLearnData.length > 0;
  const isMentorMode = includesMentor(appUsageMode) || (!appUsageMode && hasExpertiseData);
  const isMenteeMode = includesMentee(appUsageMode) || (!appUsageMode && hasEagerToLearnData);

  useEffect(() => {
    let mounted = true;

    if (!currentUsername) {
      return () => {
        mounted = false;
      };
    }

    fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(currentUsername)}/`, {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load profile.");
        }

        const payload = (await response.json()) as OwnProfileResponse;
        if (!mounted) {
          return;
        }

        setUserData((prev) => ({
          ...prev,
          name: payload.full_name || prev.name,
          bio: payload.bio || "",
        }));

        if (Array.isArray(payload.expertises)) {
          setExpertiseData(payload.expertises);
        }

        if (Array.isArray(payload.eager_to_learn)) {
          setEagerToLearnData(payload.eager_to_learn);
        }
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentUsername]);

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
        const payload = (await response.json()) as
          | { name: string }[]
          | string[];
        if (!mounted) {
          return;
        }

        const normalized = payload
          .map((skill) => (typeof skill === "string" ? skill : skill.name))
          .filter(Boolean);

        setAvailableSkills(normalized);
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

  const handleSaveProfileHeader = async (updatedData: UserProfileData) => {
    if (!currentUsername) {
      setUserData(updatedData);
      return;
    }

    try {
      const response = await updateProfileMutation.mutateAsync({
        username: currentUsername,
        display_name: updatedData.name,
        bio: updatedData.bio,
      });
      setUserData({
        name: response.display_name || updatedData.name,
        bio: response.bio || updatedData.bio,
      });
    } catch (error) {
      Alert.alert(
        "Profile Update Failed",
        error instanceof Error ? error.message : "Could not update profile details.",
      );
    }
  };

  const handleSaveSkills = async (
    variant: "mentor" | "mentee",
    nextSkills: string[],
  ) => {
    if (variant === "mentor") {
      setExpertiseData(nextSkills);
    } else {
      setEagerToLearnData(nextSkills);
    }

    if (!currentUsername) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        username: currentUsername,
        ...(variant === "mentor"
          ? { expertises: nextSkills }
          : { eager_to_learn: nextSkills }),
      });
    } catch (error) {
      Alert.alert(
        "Skill Update Failed",
        error instanceof Error ? error.message : "Could not update skills.",
      );
    }
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
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-900 mb-2">Profile Role</Text>
            <View className="flex-row gap-2">
              {isMentorMode && (
                <View className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                  <Text className="text-indigo-700 font-semibold text-xs uppercase tracking-wide">
                    Mentor
                  </Text>
                </View>
              )}
              {isMenteeMode && (
                <View className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                  <Text className="text-emerald-700 font-semibold text-xs uppercase tracking-wide">
                    Mentee
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="mb-6">
            {isMentorMode && showExpertise && (
              <SkillsCloud
                title="Expertise"
                skills={expertiseData}
                variant="mentor"
                onEdit={() =>
                  openEditModal(
                    "Expertise",
                    expertiseData,
                    "mentor",
                    (newSkills) => {
                      void handleSaveSkills("mentor", newSkills);
                    },
                  )
                }
                onViewAll={() =>
                  openSkillsModal("Expertise", expertiseData, "mentor")
                }
              />
            )}

            {isMenteeMode && showEagerToLearn && (
              <SkillsCloud
                title="Eager to Learn"
                skills={eagerToLearnData}
                variant="mentee"
                onEdit={() =>
                  openEditModal(
                    "Eager to Learn",
                    eagerToLearnData,
                    "mentee",
                    (newSkills) => {
                      void handleSaveSkills("mentee", newSkills);
                    },
                  )
                }
                onViewAll={() =>
                  openSkillsModal("Eager to Learn", eagerToLearnData, "mentee")
                }
              />
            )}
          </View>

          {isMentorMode && showAvailability && (
            <AvailabilityPreview
              schedule={availabilityData}
              onEdit={() => setAvailabilityModalOpen(true)}
            />
          )}

          {!showOfferings && (
            <View className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <Text className="text-amber-800 font-semibold text-sm">
                Mentorship offerings are hidden in MVP and will return in a later release.
              </Text>
            </View>
          )}

          {showOfferings && (
            <View className="-mx-4">
              <Text className="px-4 text-gray-500">Offerings are currently disabled.</Text>
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
          void handleSaveProfileHeader(updatedData);
          setEditProfileModalOpen(false);
        }}
      />
    </View>
  );
}