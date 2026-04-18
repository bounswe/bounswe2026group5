import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AvailabilityPreview,
  type AvailabilitySlot,
} from "@/components/profile/AvailabilityPreview";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { API_BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/lib/auth/store";
import {
  useAvailabilitySlotsQuery,
  useBookAvailabilitySlotMutation,
  useCreateMentorshipRequestMutation,
  useMentorshipMatchesQuery,
} from "@/lib/queries/mentorship";
import { useProfileRatingQuery } from "@/lib/queries/profile";

interface PublicProfileResponse {
  full_name: string;
  bio: string;
  hidden: boolean;
  picture_url: string;
  title: string;
  show_initials_only: boolean;
  app_usage_mode?: "MENTOR" | "MENTEE";
  skills?: string[];
  rating: number;
  total_mentee_count: number;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
});

type SelectedSlot = {
  id: string;
  day: string;
  label: string;
};

function getUsernameParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeUsernameIdentifier(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/[-_.\s]+/g, "");
}

function groupSlotsByWeekday(
  slots: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    is_booked: boolean;
  }[],
): AvailabilitySlot[] {
  const grouped = new Map<
    string,
    { id: string; label: string; isBooked?: boolean; date?: string }[]
  >();

  slots.forEach((slot) => {
    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const dayTimes = grouped.get(day) ?? [];
    dayTimes.push({
      id: slot.id,
      label: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      isBooked: slot.is_booked,
      date: slot.date,
    });
    grouped.set(day, dayTimes);
  });

  return Array.from(grouped.entries()).map(([day, times]) => ({ day, times }));
}

type BodyContentProps = {
  loading: boolean;
  error: string | null;
  profile: PublicProfileResponse | null;
  liveRating?: number;
  liveReviewCount?: number;
  menteesHelpedCount: number;
  requestFeedback: string | null;
  canRequestMentorship: boolean;
  isViewedMentor: boolean;
  availability: AvailabilitySlot[];
  selectedSlot: SelectedSlot | null;
  hasExistingMentorConnection: boolean;
  coverLetter: string;
  setCoverLetter: (value: string) => void;
  onOpenSkillsModal: (
    title: string,
    skills: string[],
    variant: "mentor" | "mentee",
  ) => void;
  onSelectSlot: (payload: {
    day: string;
    time: string;
    slotId?: string;
  }) => void;
  onSubmit: () => void;
  isRequestPending: boolean;
};

function renderBodyContent({
  loading,
  error,
  profile,
  liveRating,
  liveReviewCount,
  menteesHelpedCount,
  requestFeedback,
  canRequestMentorship,
  isViewedMentor,
  availability,
  selectedSlot,
  hasExistingMentorConnection,
  coverLetter,
  setCoverLetter,
  onOpenSkillsModal,
  onSelectSlot,
  onSubmit,
  isRequestPending,
}: BodyContentProps): React.ReactNode {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-3">Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <View className="bg-white border border-gray-200 rounded-2xl p-5 w-full">
          <Text className="text-gray-900 font-bold text-base mb-2">
            Unable to open profile
          </Text>
          <Text className="text-gray-500">{error}</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const selectedSlotPreview = selectedSlot
    ? {
        day: selectedSlot.day,
        time: selectedSlot.label,
      }
    : null;

  const sessionTitle = hasExistingMentorConnection
    ? "Book a Session"
    : "Request a Session";

  let submitButtonLabel = "";

  if (isRequestPending) {
    if (hasExistingMentorConnection) {
      submitButtonLabel = "Booking...";
    } else {
      submitButtonLabel = "Sending...";
    }
  } else if (hasExistingMentorConnection) {
    submitButtonLabel = "Book Session";
  } else {
    submitButtonLabel = "Send Request";
  }

  const userSkills = profile.skills ?? [];
  const roleVariant = profile?.app_usage_mode === "MENTEE" ? "mentee" : "mentor";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 160 }}
    >
      <ProfileHeader
        name={profile.full_name}
        bio={profile.bio}
        rating={liveRating ?? profile.rating ?? 0}
        reviewCount={liveReviewCount ?? 0}
        menteesHelped={isViewedMentor ? menteesHelpedCount : 0}
        showMenteesHelped={isViewedMentor}
        imageUrl={profile.picture_url || undefined}
      />

      <View className="px-4 mt-4">
        {userSkills.length > 0 && (
          <SkillsCloud
            title="Skills"
            skills={userSkills}
            variant={roleVariant}
            onViewAll={() =>
              onOpenSkillsModal("Skills", userSkills, roleVariant)
            }
          />
        )}

        {isViewedMentor && !canRequestMentorship && (
          <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
            <Text className="text-amber-800 text-sm font-semibold">
              Enable mentee mode in Settings to send requests.
            </Text>
          </View>
        )}

        {!!requestFeedback && (
          <Text className="text-sm text-gray-600 mb-4">{requestFeedback}</Text>
        )}

        {isViewedMentor && (
          <AvailabilityPreview
            schedule={availability}
            selectedSlot={selectedSlotPreview}
            onSelectSlot={onSelectSlot}
          />
        )}

        {isViewedMentor && selectedSlot && canRequestMentorship && (
          <View className="mb-6 bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              {sessionTitle}
            </Text>

            <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
              <Text className="text-indigo-700 font-semibold">
                {selectedSlot.day}
              </Text>
              <Text className="text-gray-900 font-bold mt-1">
                {selectedSlot.label}
              </Text>
            </View>

            {hasExistingMentorConnection ? (
              <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-1">
                <Text className="text-emerald-800 text-sm font-semibold">
                  You are already connected with this mentor. Cover letter is
                  not required.
                </Text>
              </View>
            ) : (
              <TextInput
                value={coverLetter}
                onChangeText={setCoverLetter}
                placeholder="Describe what you want to learn in this session"
                multiline
                textAlignVertical="top"
                className="bg-white border border-gray-200 rounded-xl px-3 py-3 min-h-[120px] text-gray-900"
              />
            )}

            <TouchableOpacity
              disabled={isRequestPending}
              onPress={onSubmit}
              className={`mt-4 rounded-xl py-3 items-center ${
                isRequestPending ? "bg-gray-300" : "bg-indigo-600"
              }`}
            >
              <Text className="text-white font-semibold">
                {submitButtonLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default function MentorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const params = useLocalSearchParams<{ username?: string }>();
  const username = getUsernameParam(params.username);

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createRequestMutation = useCreateMentorshipRequestMutation();
  const mentorshipMatchesQuery = useMentorshipMatchesQuery(currentUsername);
  const bookSlotMutation = useBookAvailabilitySlotMutation(currentUsername);
  const availabilitySlotsQuery = useAvailabilitySlotsQuery(
    username ?? "",
    profile?.app_usage_mode === "MENTOR",
  );
  const ratingQuery = useProfileRatingQuery(username ?? "");

  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [skillsModalConfig, setSkillsModalConfig] = useState<{
    visible: boolean;
    title: string;
    skills: string[];
    variant: "mentor" | "mentee";
  }>({
    visible: false,
    title: "Expertise",
    skills: [],
    variant: "mentor",
  });

  useEffect(() => {
    let mounted = true;

    if (!username) {
      setLoading(false);
      setError("Missing mentor username.");
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(username)}/`, {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load mentor profile.");
        }

        return (await response.json()) as PublicProfileResponse;
      })
      .then((payload) => {
        if (mounted) {
          setProfile(payload);
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load mentor profile.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [username]);

  const availability = useMemo(() => {
    const sourceSlots = availabilitySlotsQuery.data ?? [];

    const normalized = sourceSlots
      .map((slot) => {
        const legacyStart = "start_time" in slot ? slot.start_time : undefined;
        const legacyEnd = "end_time" in slot ? slot.end_time : undefined;
        const date = slot.date ?? legacyStart?.split("T")[0];
        const startTime =
          slot.startTime ?? legacyStart?.split("T")[1]?.slice(0, 8);
        const endTime = slot.endTime ?? legacyEnd?.split("T")[1]?.slice(0, 8);

        if (!date || !startTime || !endTime) {
          return null;
        }

        return {
          id: slot.id,
          date,
          startTime,
          endTime,
          is_booked: slot.is_booked,
        };
      })
      .filter(
        (
          slot,
        ): slot is {
          id: string;
          date: string;
          startTime: string;
          endTime: string;
          is_booked: boolean;
        } => Boolean(slot),
      );

    return groupSlotsByWeekday(normalized);
  }, [availabilitySlotsQuery.data]);

  const isViewedMentor = useMemo(() => {
    return profile?.app_usage_mode === "MENTOR";
  }, [profile?.app_usage_mode]);

  const menteesHelpedCount = useMemo(() => {
    if (!isViewedMentor) {
      return 0;
    }

    const normalizedViewedUsername = normalizeUsernameIdentifier(username);
    const activeMenteesForViewedMentor = new Set(
      (mentorshipMatchesQuery.data ?? [])
        .filter(
          (match) =>
            match.is_active &&
            normalizeUsernameIdentifier(match.mentor.username) ===
              normalizedViewedUsername,
        )
        .map((match) => match.mentee.username),
    );

    return Math.max(
      profile?.total_mentee_count ?? 0,
      activeMenteesForViewedMentor.size,
    );
  }, [
    isViewedMentor,
    mentorshipMatchesQuery.data,
    profile?.total_mentee_count,
    username,
  ]);

  const hasExistingMentorConnection = useMemo(() => {
    return (
      Boolean(username) &&
      (mentorshipMatchesQuery.data ?? []).some(
        (match) => match.is_active && match.mentor.username === username,
      )
    );
  }, [mentorshipMatchesQuery.data, username]);

  const canRequestMentorship =
    appUsageMode === "MENTEE";

  const handleSelectSlot = (payload: {
    day: string;
    time: string;
    slotId?: string;
  }) => {
    if (!canRequestMentorship) {
      setRequestFeedback("Enable mentee mode in Settings to send requests.");
      return;
    }

    if (!payload.slotId) {
      setRequestFeedback(
        "Selected slot could not be resolved. Please refresh and try again.",
      );
      return;
    }

    setSelectedSlot({
      id: payload.slotId,
      day: payload.day,
      label: payload.time,
    });
  };

  const handleCreateRequest = async (payload: {
    slotId: string;
    coverLetter?: string;
  }) => {
    if (!username) {
      return;
    }

    setRequestFeedback(null);
    try {
      await createRequestMutation.mutateAsync({
        mentor_username: username,
        slot_id: payload.slotId,
        ...(payload.coverLetter
          ? {
              cover_letter: payload.coverLetter,
            }
          : {}),
      });

      setProfile((prev) => prev);

      setRequestFeedback("Request sent successfully.");
      Alert.alert(
        "Request Sent",
        "Your mentorship request was sent successfully.",
      );
      setSelectedSlot(null);
      setCoverLetter("");
      availabilitySlotsQuery.refetch();
    } catch (mutationError) {
      setRequestFeedback(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to send mentorship request.",
      );
    }
  };

  const handleBookConnectedSession = async (slot: SelectedSlot) => {
    if (!username) {
      return;
    }

    setRequestFeedback(null);
    try {
      await bookSlotMutation.mutateAsync({
        mentorUsername: username,
        slotId: slot.id,
      });

      setProfile((prev) => prev);

      setSelectedSlot(null);
      setRequestFeedback("Session booked successfully.");
      Alert.alert(
        "Session Booked",
        "Your session has been booked successfully.",
      );
      availabilitySlotsQuery.refetch();
    } catch (mutationError) {
      setRequestFeedback(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to book the selected session.",
      );
    }
  };

  const submitCoverLetter = async () => {
    if (!selectedSlot) {
      return;
    }

    if (hasExistingMentorConnection) {
      Alert.alert(
        "Confirm Session Booking",
        `Book this session on ${selectedSlot.day} at ${selectedSlot.label}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () => {
              void handleBookConnectedSession(selectedSlot);
            },
          },
        ],
      );
      return;
    }

    if (coverLetter.trim().length < 10) {
      setRequestFeedback(
        "Please provide at least 10 characters about what you want to discuss.",
      );
      return;
    }

    await handleCreateRequest({
      slotId: selectedSlot.id,
      coverLetter: coverLetter.trim(),
    });
  };

  const bodyContent = renderBodyContent({
    loading,
    error,
    profile,
    liveRating: ratingQuery.data
      ? Number(ratingQuery.data.average_rating)
      : undefined,
    liveReviewCount: ratingQuery.data?.review_count,
    menteesHelpedCount,
    requestFeedback,
    canRequestMentorship,
    isViewedMentor,
    availability,
    selectedSlot,
    hasExistingMentorConnection,
    coverLetter,
    setCoverLetter,
    onOpenSkillsModal: (title, skills, variant) =>
      setSkillsModalConfig({
        visible: true,
        title,
        skills,
        variant,
      }),
    onSelectSlot: handleSelectSlot,
    onSubmit: submitCoverLetter,
    isRequestPending:
      createRequestMutation.isPending || bookSlotMutation.isPending,
  });

  const screenTitle = isViewedMentor ? "Mentor Profile" : "Profile";

  return (
    <View className="flex-1 bg-white">
      <View
        className="bg-white border-b border-gray-100"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="chevron-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900">
            {screenTitle}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {bodyContent}
      </KeyboardAvoidingView>

      <ViewAllSkillsModal
        visible={skillsModalConfig.visible}
        title={skillsModalConfig.title}
        skills={skillsModalConfig.skills}
        variant={skillsModalConfig.variant}
        onClose={() =>
          setSkillsModalConfig((prev) => ({ ...prev, visible: false }))
        }
      />
    </View>
  );
}
