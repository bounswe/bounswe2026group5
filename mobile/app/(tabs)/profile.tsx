import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvailabilityPreview } from "@/components/profile/AvailabilityPreview";
import { EditAvailabilityModal } from "@/components/profile/EditAvailabilityModal";
import {
  EditProfileModal,
  UserProfileData,
} from "@/components/profile/EditProfileModal";
import { EditSkillsModal } from "@/components/profile/EditSkillsModal";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { API_BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/lib/auth/store";
import { useProfileVisibilityStore } from "@/lib/profile/preferences";
import {
  mapAvailabilityToSchedule,
  useAvailabilitySlotsQuery,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
} from "@/lib/queries/mentorship";
import {
  useProfileRatingQuery,
  useUpdateOwnProfileMutation,
} from "@/lib/queries/profile";

const PROFILE_DEFAULTS = {
  skills: [] as string[],
};

interface OwnProfileResponse {
  full_name: string;
  bio: string;
  picture_url: string;
  skills?: string[];
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const availabilityQuery = useAvailabilitySlotsQuery(currentUsername || "");
  const mentorshipMatchesQuery = useMentorshipMatchesQuery(
    currentUsername || "",
  );
  const mentorshipRequestsQuery = useMentorshipRequestsQuery(
    currentUsername || "",
  );
  const updateProfileMutation = useUpdateOwnProfileMutation();
  const profileRatingQuery = useProfileRatingQuery(currentUsername);

  const showExpertise = useProfileVisibilityStore(
    (state) => state.showExpertise,
  );
  const showEagerToLearn = useProfileVisibilityStore(
    (state) => state.showEagerToLearn,
  );
  const showAvailability = useProfileVisibilityStore(
    (state) => state.showAvailability,
  );

  const [menteesCount, setMenteesCount] = useState<number>(0);
  const [skillsData, setSkillsData] = useState<string[]>(
    PROFILE_DEFAULTS.skills,
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
  const [pageError, setPageError] = useState<string | null>(null);
  const [isAvailabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);

  const isMentorMode = appUsageMode === "MENTOR";
  const isMenteeMode = appUsageMode === "MENTEE";
  const shouldShowSkills = isMentorMode ? showExpertise : showEagerToLearn;

  useEffect(() => {
    let mounted = true;

    if (!currentUsername) {
      return () => {
        mounted = false;
      };
    }

    fetch(
      `${API_BASE_URL}/api/profiles/${encodeURIComponent(currentUsername)}/`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load profile.");
        }

        const payload = (await response.json()) as OwnProfileResponse;
        if (!mounted) {
          return;
        }
        setPageError(null);

        setUserData((prev) => ({
          ...prev,
          name: payload.full_name || prev.name,
          bio: payload.bio || "",
        }));

        setSkillsData(payload.skills ?? []);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setPageError("Failed to load profile.");
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

  const availabilityData = useMemo(
    () => mapAvailabilityToSchedule(availabilityQuery.data ?? []),
    [availabilityQuery.data],
  );

  useEffect(() => {
    if (mentorshipMatchesQuery.data) {
      const uniqueMentees = new Set(
        mentorshipMatchesQuery.data
          .filter((match) => match.is_active)
          .map((match) => match.mentee.username),
      );
      setMenteesCount(uniqueMentees.size);
    }
  }, [mentorshipMatchesQuery.data]);

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
      setPageError(null);
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
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not update profile details.",
      );
    }
  };

  const handleSaveSkills = async (
    variant: "mentor" | "mentee",
    nextSkills: string[],
  ) => {
    setSkillsData(nextSkills);

    if (!currentUsername) {
      return;
    }

    try {
      setPageError(null);
      await updateProfileMutation.mutateAsync({
        username: currentUsername,
        skills: nextSkills,
      });
    } catch (error) {
      setPageError(
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

  const normalizedRating = Number.parseFloat(
    profileRatingQuery.data?.average_rating ?? "0",
  );
  const rating = Number.isFinite(normalizedRating) ? normalizedRating : 0;
  const reviewCount = profileRatingQuery.data?.review_count ?? 0;

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Profile
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/settings" as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {pageError ? (
          <View className="px-4 pt-4">
            <ErrorBanner message={pageError} />
          </View>
        ) : null}

        <ProfileHeader
          name={userData.name}
          bio={userData.bio}
          reviewCount={reviewCount}
          rating={rating}
          totalSessions={0}
          menteesHelped={isMentorMode ? menteesCount : 0}
          showMenteesHelped={isMentorMode}
          onEdit={() => setEditProfileModalOpen(true)}
        />

        <View className="px-4 mt-4">
          <View className="mb-6">
            {(isMentorMode || isMenteeMode) && shouldShowSkills && (
              <SkillsCloud
                title="Skills"
                skills={skillsData}
                variant={isMentorMode ? "mentor" : "mentee"}
                onEdit={() =>
                  openEditModal(
                    "Skills",
                    skillsData,
                    isMentorMode ? "mentor" : "mentee",
                    (newSkills) => {
                      void handleSaveSkills(isMentorMode ? "mentor" : "mentee", newSkills);
                    },
                  )
                }
                onViewAll={() =>
                  openSkillsModal("Skills", skillsData, isMentorMode ? "mentor" : "mentee")
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
        username={currentUsername || ""}
        slots={availabilityQuery.data ?? []}
        requests={(mentorshipRequestsQuery.data ?? [])
          .filter((request) => request.mentor.username === currentUsername)
          .map((request) => ({
            id: request.id,
            slotId: request.slot_id,
            status: request.status,
          }))}
        onChanged={() => {
          availabilityQuery.refetch();
          mentorshipRequestsQuery.refetch();
        }}
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
