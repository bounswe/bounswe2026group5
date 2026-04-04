import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
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
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
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

  const upcomingSlotCards = useMemo(
    () =>
      (profile?.available_slots ?? []).map((slot) => ({
        id: slot.id,
        label: `${slot.date}  ${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      })),
    [profile?.available_slots],
  );

  const handleCreateRequest = async () => {
    if (!username || !selectedSlotId) {
      return;
    }

    setRequestFeedback(null);
    try {
      await createRequestMutation.mutateAsync({
        mentor_username: username,
        slot_id: selectedSlotId,
        cover_letter: coverLetter.trim(),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              available_slots: prev.available_slots.filter(
                (slot) => slot.id !== selectedSlotId,
              ),
            }
          : prev,
      );
      setRequestFeedback("Request sent successfully.");
      setSelectedSlotId(null);
      setCoverLetter("");
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

          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">Request a Session</Text>

            {!canRequestMentorship && (
              <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                <Text className="text-amber-800 text-sm font-semibold">
                  Enable mentee mode in Settings to send requests.
                </Text>
              </View>
            )}

            {upcomingSlotCards.length === 0 ? (
              <View className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <Text className="text-gray-600 text-sm">No upcoming slots available.</Text>
              </View>
            ) : (
              <View className="gap-2 mb-3">
                {upcomingSlotCards.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={!canRequestMentorship}
                      onPress={() => setSelectedSlotId(slot.id)}
                      className={`rounded-xl border p-3 ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={isSelected ? "text-white font-semibold" : "text-gray-900 font-semibold"}>
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TextInput
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholder="Optional cover letter"
              multiline
              textAlignVertical="top"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 min-h-[88px] text-gray-900"
            />

            <TouchableOpacity
              disabled={!canRequestMentorship || !selectedSlotId || createRequestMutation.isPending}
              onPress={handleCreateRequest}
              className={`mt-3 rounded-xl py-3 items-center ${
                !canRequestMentorship || !selectedSlotId || createRequestMutation.isPending
                  ? "bg-gray-300"
                  : "bg-indigo-600"
              }`}
            >
              <Text className="text-white font-semibold">
                {createRequestMutation.isPending ? "Sending..." : "Send Request"}
              </Text>
            </TouchableOpacity>

            {!!requestFeedback && (
              <Text className="text-sm text-gray-600 mt-2">{requestFeedback}</Text>
            )}
          </View>
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

      {bodyContent}
    </View>
  );
}
