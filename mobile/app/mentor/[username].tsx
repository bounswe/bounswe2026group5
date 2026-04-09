import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { API_BASE_URL } from "@/constants/api";
import {
  AvailabilityPreview,
  type AvailabilitySlot,
} from "@/components/profile/AvailabilityPreview";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import {
  useCreateMentorshipRequestMutation,
  useMentorshipMatchesQuery,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";

interface MentorProfileResponse {
  full_name: string;
  bio: string;
  hidden: boolean;
  picture_url: string;
  title: string;
  show_initials_only: boolean;
  expertises: string[];
  rating: number;
  total_mentee_count: number;
  available_slots: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    is_booked: boolean;
  }[];
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });

function groupSlotsByWeekday(
  slots: MentorProfileResponse["available_slots"],
): AvailabilitySlot[] {
  const grouped = new Map<
    string,
    { id: string; label: string; isBooked?: boolean }[]
  >();

  slots.forEach((slot) => {
    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const dayTimes = grouped.get(day) ?? [];
    dayTimes.push({
      id: slot.id,
      label: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      isBooked: slot.is_booked,
    });
    grouped.set(day, dayTimes);
  });

  return Array.from(grouped.entries()).map(([day, times]) => ({ day, times }));
}

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

function getRequestSuccessFeedback(hasExistingMentorConnection: boolean): {
  feedback: string;
  title: string;
  description: string;
} {
  if (hasExistingMentorConnection) {
    return {
      feedback: "Session booked successfully.",
      title: "Session Booked",
      description: "Your session has been booked successfully.",
    };
  }

  return {
    feedback: "Request sent successfully.",
    title: "Request Sent",
    description: "Your mentorship request was sent successfully.",
  };
}

function getSubmitButtonLabel(
  isPending: boolean,
  hasExistingMentorConnection: boolean,
): string {
  if (isPending) {
    return hasExistingMentorConnection ? "Booking..." : "Sending...";
  }

  return hasExistingMentorConnection ? "Book Session" : "Send Request";
}

type BodyContentProps = {
  loading: boolean;
  error: string | null;
  profile: MentorProfileResponse | null;
  requestFeedback: string | null;
  canRequestMentorship: boolean;
  availability: AvailabilitySlot[];
  selectedSlot: SelectedSlot | null;
  hasExistingMentorConnection: boolean;
  coverLetter: string;
  setCoverLetter: (value: string) => void;
  onViewAllSkills: () => void;
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
  requestFeedback,
  canRequestMentorship,
  availability,
  selectedSlot,
  hasExistingMentorConnection,
  coverLetter,
  setCoverLetter,
  onViewAllSkills,
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
  const submitButtonLabel = getSubmitButtonLabel(
    isRequestPending,
    hasExistingMentorConnection,
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingBottom: 160 }}
    >
      <ProfileHeader
        name={profile.full_name}
        bio={profile.bio}
        rating={profile.rating}
        reviewCount={profile.total_mentee_count}
        imageUrl={profile.picture_url || undefined}
      />

      <View className="px-4 mt-4">
        <SkillsCloud
          title="Expertise"
          skills={profile.expertises}
          variant="mentor"
          onViewAll={onViewAllSkills}
        />

        {!canRequestMentorship && (
          <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
            <Text className="text-amber-800 text-sm font-semibold">
              Enable mentee mode in Settings to send requests.
            </Text>
          </View>
        )}

        {!!requestFeedback && (
          <Text className="text-sm text-gray-600 mb-4">{requestFeedback}</Text>
        )}

        <AvailabilityPreview
          schedule={availability}
          selectedSlot={selectedSlotPreview}
          onSelectSlot={onSelectSlot}
        />

        {selectedSlot && canRequestMentorship && (
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
  const createRequestMutation = useCreateMentorshipRequestMutation();
  const mentorshipMatchesQuery = useMentorshipMatchesQuery(currentUsername);

  const [profile, setProfile] = useState<MentorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [skillsModalVisible, setSkillsModalVisible] = useState(false);

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

        return (await response.json()) as MentorProfileResponse;
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

  const availability = useMemo(
    () => groupSlotsByWeekday(profile?.available_slots ?? []),
    [profile?.available_slots],
  );

  const hasExistingMentorConnection = useMemo(() => {
    return (
      Boolean(username) &&
      (mentorshipMatchesQuery.data ?? []).some(
        (match) => match.is_active && match.mentor.username === username,
      )
    );
  }, [mentorshipMatchesQuery.data, username]);

  const canRequestMentorship =
    appUsageMode === "MENTEE" || appUsageMode === "BOTH";

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
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              available_slots: prev.available_slots.filter(
                (slot) => slot.id !== payload.slotId,
              ),
            }
          : prev,
      );
      const successMessage = getRequestSuccessFeedback(
        hasExistingMentorConnection,
      );
      setRequestFeedback(successMessage.feedback);
      Alert.alert(successMessage.title, successMessage.description);
      setSelectedSlot(null);
      setCoverLetter("");
    } catch (mutationError) {
      setRequestFeedback(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to send mentorship request.",
      );
    }
  };

  const submitCoverLetter = async () => {
    if (!selectedSlot) {
      return;
    }

    if (!hasExistingMentorConnection && coverLetter.trim().length < 10) {
      setRequestFeedback(
        "Please provide at least 10 characters about what you want to discuss.",
      );
      return;
    }

    await handleCreateRequest({
      slotId: selectedSlot.id,
      coverLetter: hasExistingMentorConnection ? undefined : coverLetter.trim(),
    });
  };

  const bodyContent = renderBodyContent({
    loading,
    error,
    profile,
    requestFeedback,
    canRequestMentorship,
    availability,
    selectedSlot,
    hasExistingMentorConnection,
    coverLetter,
    setCoverLetter,
    onViewAllSkills: () => setSkillsModalVisible(true),
    onSelectSlot: handleSelectSlot,
    onSubmit: submitCoverLetter,
    isRequestPending: createRequestMutation.isPending,
  });

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
            Mentor Profile
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
        visible={skillsModalVisible}
        title="Expertise"
        skills={profile?.expertises ?? []}
        variant="mentor"
        onClose={() => setSkillsModalVisible(false)}
      />
    </View>
  );
}
