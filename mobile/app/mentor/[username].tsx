import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
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
import {
  SlotRequestComposer,
  type RequestableSlot,
} from "@/components/profile/SlotRequestComposer";
import { useCreateMentorshipRequestMutation } from "@/lib/queries/mentorship";
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
  const grouped = new Map<string, string[]>();

  slots.forEach((slot) => {
    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const range = `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`;
    const dayTimes = grouped.get(day) ?? [];
    dayTimes.push(range);
    grouped.set(day, dayTimes);
  });

  return Array.from(grouped.entries()).map(([day, times]) => ({ day, times }));
}

export default function MentorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const params = useLocalSearchParams<{ username?: string }>();
  const username = Array.isArray(params.username)
    ? params.username[0]
    : params.username;
  const createRequestMutation = useCreateMentorshipRequestMutation();

  const [profile, setProfile] = useState<MentorProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);

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

  const canRequestMentorship = appUsageMode === "MENTEE" || appUsageMode === "BOTH";

  const requestableSlots = useMemo<RequestableSlot[]>(
    () => profile?.available_slots ?? [],
    [profile?.available_slots],
  );

  const handleCreateRequest = async (payload: {
    slotId: string;
    coverLetter: string;
  }) => {
    if (!username) {
      return;
    }

    setRequestFeedback(null);
    try {
      await createRequestMutation.mutateAsync({
        mentor_username: username,
        slot_id: payload.slotId,
        cover_letter: payload.coverLetter,
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
      setRequestFeedback("Request sent successfully.");
    } catch (mutationError) {
      setRequestFeedback(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to send mentorship request.",
      );
    }
  };

  let bodyContent: React.ReactNode = null;

  if (loading) {
    bodyContent = (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-3">Loading profile...</Text>
      </View>
    );
  } else if (error) {
    bodyContent = (
      <View className="flex-1 items-center justify-center px-4">
        <View className="bg-white border border-gray-200 rounded-2xl p-5 w-full">
          <Text className="text-gray-900 font-bold text-base mb-2">
            Unable to open profile
          </Text>
          <Text className="text-gray-500">{error}</Text>
        </View>
      </View>
    );
  } else if (profile) {
    bodyContent = (
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
          />

          <AvailabilityPreview schedule={availability} />

          <SlotRequestComposer
            canRequest={canRequestMentorship}
            slots={requestableSlots}
            isSubmitting={createRequestMutation.isPending}
            feedbackMessage={requestFeedback}
            onSubmit={handleCreateRequest}
          />
        </View>
      </ScrollView>
    );
  }

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
    </View>
  );
}
