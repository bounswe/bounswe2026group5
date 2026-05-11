import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { ProfilePostsPreview } from "@/components/profile/ProfilePostsPreview";
import { ProfileReviews } from "@/components/profile/ProfileReviews";
import { SkillsCloud } from "@/components/profile/SkillsCloud";
import { ReportSheet } from "@/components/report/ReportSheet";

import { ViewAllSkillsModal } from "@/components/profile/ViewAllSkillsModal";
import { ConfirmationSheet } from "@/components/ui/ConfirmationSheet";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/ToastProvider";
import { API_BASE_URL } from "@/constants/api";
import { useAuthStore } from "@/lib/auth/store";
import {
  isEmailVerificationRequiredError,
  useResendEmailVerificationMutation,
} from "@/lib/queries/auth";
import {
  useAvailabilitySlotsQuery,
  useBookAvailabilitySlotMutation,
  useCreateMentorshipRequestMutation,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
} from "@/lib/queries/mentorship";
import {
  type ProfileReview,
  useProfileRatingQuery,
  useProfileReviewsQuery,
} from "@/lib/queries/profile";
import { useSubmitReportMutation } from "@/lib/queries/reporting";
import { useJoinCommunityWorkshopMutation } from "@/lib/queries/workshops";

interface PublicProfileResponse {
  username: string;
  full_name: string;
  bio: string;
  hidden: boolean;
  picture_url: string;
  title: string;
  show_initials_only: boolean;
  app_usage_mode?: "MENTOR" | "MENTEE";
  skills?: string[];
  average_rating: string;
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
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_.\s]+/g, "");
}

function isFutureOpenSlot(slot: {
  date: string;
  startTime: string;
  status: "AVAILABLE" | "PENDING" | "BOOKED";
}): boolean {
  if (slot.status !== "AVAILABLE") {
    return false;
  }

  return new Date(`${slot.date}T${slot.startTime}`) > new Date();
}

function groupSlotsByWeekday(
  slots: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: "AVAILABLE" | "PENDING" | "BOOKED";
  }[],
): AvailabilitySlot[] {
  const grouped = new Map<
    string,
    {
      id: string;
      label: string;
      isBooked?: boolean;
      isPending?: boolean;
      date?: string;
    }[]
  >();

  slots.forEach((slot) => {
    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const dayTimes = grouped.get(day) ?? [];
    dayTimes.push({
      id: slot.id,
      label: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      isBooked: slot.status === "BOOKED",
      isPending: slot.status === "PENDING",
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
  openSlotsCount: number;
  menteesHelpedCount: number;
  requestFeedback: string | null;
  requestFeedbackVariant?: "error" | "warning" | "info" | "success";
  showResendVerificationAction?: boolean;
  isResendVerificationPending?: boolean;
  canRequestMentorship: boolean;
  isViewedMentor: boolean;
  reviews: ProfileReview[];
  reviewsTotalCount: number;
  reviewsError: string | null;
  isReviewsLoading: boolean;
  isReviewsLoadingMore: boolean;
  onLoadMoreReviews: () => void;
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
  userWorkshops?: {
    id: string;
    title: string;
    community_id: string;
    scheduled_at: string;
  }[];
  onJoinWorkshop?: (payload: {
    tagId: string;
    workshopId: string;
  }) => Promise<void>;
  onSelectSlot: (payload: {
    day: string;
    time: string;
    slotId?: string;
  }) => void;
  onResendVerification?: () => void;
  onSubmit: () => void;
  isRequestPending: boolean;
  /** Username used to load the posts preview strip. */
  postsUsername: string;
  /** Called when the user taps "View All Posts". */
  onViewAllPosts: () => void;
};

function renderBodyContent({
  loading,
  error,
  profile,
  liveRating,
  liveReviewCount,
  openSlotsCount,
  menteesHelpedCount,
  requestFeedback,
  requestFeedbackVariant = "info",
  showResendVerificationAction = false,
  isResendVerificationPending = false,
  canRequestMentorship,
  isViewedMentor,
  reviews,
  reviewsTotalCount,
  reviewsError,
  isReviewsLoading,
  isReviewsLoadingMore,
  onLoadMoreReviews,
  availability,
  selectedSlot,
  hasExistingMentorConnection,
  coverLetter,
  setCoverLetter,
  onOpenSkillsModal,
  userWorkshops,
  onJoinWorkshop,
  onSelectSlot,
  onResendVerification,
  onSubmit,
  isRequestPending,
  postsUsername,
  onViewAllPosts,
}: BodyContentProps): React.ReactNode {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-3">Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-surface dark:bg-surface-dark">
        <ErrorBanner title="Unable to open profile" message={error} />
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
  const roleVariant =
    profile?.app_usage_mode === "MENTEE" ? "mentee" : "mentor";
  const skillsTitle = roleVariant === "mentor" ? "Expertise" : "Eager to Learn";

  return (
    <ScrollView
      className="flex-1 bg-surface dark:bg-surface-dark"
      contentContainerStyle={{ paddingBottom: 160 }}
    >
      <ProfileHeader
        name={profile.full_name}
        bio={profile.bio}
        rating={liveRating ?? Number(profile.average_rating) ?? 0}
        reviewCount={liveReviewCount ?? 0}
        openSlots={isViewedMentor ? openSlotsCount : 0}
        menteesHelped={isViewedMentor ? menteesHelpedCount : 0}
        showStats={isViewedMentor}
        showRating={isViewedMentor}
        showMenteesHelped={isViewedMentor}
        imageUrl={profile.picture_url || undefined}
        showInitialsOnly={profile.show_initials_only}
      />

      <View className="px-4 mt-4">
        {userSkills.length > 0 && (
          <View className="mb-6 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4 pt-4">
            <SkillsCloud
              title={skillsTitle}
              skills={userSkills}
              variant={roleVariant}
              onViewAll={() =>
                onOpenSkillsModal(skillsTitle, userSkills, roleVariant)
              }
            />
          </View>
        )}

        {isViewedMentor && (
          <View className="mb-6 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark px-4 pt-4">
            <AvailabilityPreview
              schedule={availability}
              selectedSlot={selectedSlotPreview}
              onSelectSlot={onSelectSlot}
            />
          </View>
        )}

        {/* Profile posts preview (PrP + public MCTE) — hidden when empty */}
        <ProfilePostsPreview
          username={postsUsername}
          onViewAll={onViewAllPosts}
        />

        {userWorkshops && userWorkshops.length > 0 && (
          <View className="mb-6 rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
                Workshops
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {userWorkshops.map((w) => (
                <View
                  key={w.id}
                  className="mr-4 w-56 rounded-xl border border-divider p-3 bg-white dark:bg-surface-card-dark"
                >
                  <Text className="font-semibold text-gray-900 mb-1">
                    {w.title}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-3">
                    {new Date(w.scheduled_at).toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      onJoinWorkshop &&
                      onJoinWorkshop({
                        tagId: w.community_id,
                        workshopId: w.id,
                      })
                    }
                    className="bg-indigo-600 rounded-lg py-2 items-center"
                  >
                    <Text className="text-white font-semibold">Join</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {!!requestFeedback && (
          <View className="mb-4">
            <ErrorBanner
              message={requestFeedback}
              variant={requestFeedbackVariant}
            />
            {showResendVerificationAction && onResendVerification ? (
              <TouchableOpacity
                testID="profile-resend-verification-button"
                activeOpacity={0.85}
                disabled={isResendVerificationPending}
                onPress={onResendVerification}
                className="self-start mt-2 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-900/60"
              >
                <Text className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {isResendVerificationPending
                    ? "Sending..."
                    : "Resend Verification Email"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
              testID="send-mentorship-request-button"
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

        {isViewedMentor && (
          <View className="mt-6">
            <Text className="mb-3 text-lg font-bold text-gray-900">
              Reviews
            </Text>
            <ProfileReviews
              reviews={reviews}
              totalCount={reviewsTotalCount}
              errorMessage={reviewsError}
              isLoading={isReviewsLoading}
              isLoadingMore={isReviewsLoadingMore}
              onLoadMore={onLoadMoreReviews}
              emptyMessage="No public reviews yet. Reviews appear once privacy thresholds are met."
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const REVIEWS_PAGE_SIZE = 6;

export default function MentorProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const params = useLocalSearchParams<{
    username?: string;
    from?: string | string[];
    tagId?: string | string[];
  }>();
  const username = getUsernameParam(params.username);
  const source = getUsernameParam(params.from);
  const sourceTagId = getUsernameParam(params.tagId);

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selfScopedQueryUsername =
    currentUsername ?? profile?.username ?? username;

  const createRequestMutation = useCreateMentorshipRequestMutation();
  const mentorshipMatchesQuery = useMentorshipMatchesQuery(
    selfScopedQueryUsername,
  );
  const mentorshipRequestsQuery = useMentorshipRequestsQuery(
    selfScopedQueryUsername,
  );
  const bookSlotMutation = useBookAvailabilitySlotMutation(
    selfScopedQueryUsername,
  );
  const resendVerificationMutation = useResendEmailVerificationMutation();
  const submitReportMutation = useSubmitReportMutation();
  const availabilitySlotsQuery = useAvailabilitySlotsQuery(
    username ?? "",
    profile?.app_usage_mode === "MENTOR",
  );
  const ratingQuery = useProfileRatingQuery(username ?? "");
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const reviewsQuery = useProfileReviewsQuery(
    username ?? "",
    reviewsPage,
    REVIEWS_PAGE_SIZE,
    profile?.app_usage_mode === "MENTOR",
  );

  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [requestFeedbackVariant, setRequestFeedbackVariant] = useState<
    "error" | "warning" | "info" | "success"
  >("info");
  const [showResendVerificationAction, setShowResendVerificationAction] =
    useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
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

  const [userWorkshops, setUserWorkshops] = useState<
    { id: string; title: string; community_id: string; scheduled_at: string }[]
  >([]);
  const joinWorkshopMutation =
    useJoinCommunityWorkshopMutation(currentUsername);

  useEffect(() => {
    let mounted = true;
    if (!username) return;

    fetch(
      `${API_BASE_URL}/api/profiles/${encodeURIComponent(username)}/workshops/?limit=50`,
      {
        headers: { Accept: "application/json" },
      },
    )
      .then(async (res) => {
        if (!res.ok) return [];
        const payload = await res.json();
        // expect either list or paginated { results }
        const rows = Array.isArray(payload) ? payload : (payload.results ?? []);
        return rows;
      })
      .then((rows) => {
        if (!mounted) return;
        const normalized = (rows ?? []).map((r: any) => ({
          id: r.id,
          title: r.title,
          community_id: r.community_id ?? r.communityId ?? r.community_id,
          scheduled_at: r.scheduled_at ?? r.scheduledAt ?? r.scheduled_at,
        }));
        setUserWorkshops(normalized);
      })
      .catch(() => {
        if (!mounted) return;
        setUserWorkshops([]);
      });

    return () => {
      mounted = false;
    };
  }, [username]);

  useEffect(() => {
    if (!reviewsQuery.data) {
      return;
    }

    setReviews((prev) => {
      const nextReviews =
        reviewsPage === 1
          ? reviewsQuery.data.results
          : [...prev, ...reviewsQuery.data.results];

      const isSameCollection =
        prev.length === nextReviews.length &&
        prev.every((review, index) => {
          const nextReview = nextReviews[index];
          return (
            review?.rating === nextReview?.rating &&
            review?.text === nextReview?.text &&
            review?.created_at === nextReview?.created_at
          );
        });

      return isSameCollection ? prev : nextReviews;
    });
  }, [reviewsPage, reviewsQuery.data]);

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
    const pendingRequestedSlotIds = new Set(
      (mentorshipRequestsQuery.data ?? [])
        .filter(
          (request) =>
            request.status === "PENDING" &&
            request.mentor.username === username &&
            request.mentee.username === currentUsername &&
            Boolean(request.slot_id),
        )
        .map((request) => request.slot_id as string),
    );

    const normalized = sourceSlots
      .map((slot) => {
        const legacySlot = slot as {
          start_time?: unknown;
          end_time?: unknown;
        };
        const legacyStart =
          typeof legacySlot.start_time === "string"
            ? legacySlot.start_time
            : undefined;
        const legacyEnd =
          typeof legacySlot.end_time === "string"
            ? legacySlot.end_time
            : undefined;
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
          status: slot.status,
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
          status: "AVAILABLE" | "PENDING" | "BOOKED";
        } => Boolean(slot),
      );

    return groupSlotsByWeekday(normalized);
  }, [
    availabilitySlotsQuery.data,
    currentUsername,
    mentorshipRequestsQuery.data,
    username,
  ]);
  const openSlotsCount = useMemo(
    () =>
      availability
        .flatMap((day) => day.times)
        .filter((entry) => {
          if (typeof entry === "string" || !entry.date) {
            return false;
          }

          const startTime = entry.label.split(" - ")[0] ?? "00:00";
          return isFutureOpenSlot({
            date: entry.date,
            startTime,
            status: entry.isBooked
              ? "BOOKED"
              : entry.isPending
                ? "PENDING"
                : "AVAILABLE",
          });
        }).length,
    [availability],
  );

  const isViewedMentor = useMemo(() => {
    return profile?.app_usage_mode === "MENTOR";
  }, [profile?.app_usage_mode]);

  const menteesHelpedCount = useMemo(() => {
    if (!isViewedMentor) {
      return 0;
    }

    const normalizedCurrentUsername =
      normalizeUsernameIdentifier(currentUsername);
    const viewedIdentifiers = [
      username,
      profile?.username,
      profile?.full_name,
    ].map(normalizeUsernameIdentifier);
    const activeMatches = (mentorshipMatchesQuery.data ?? []).filter(
      (match) => match.is_active,
    );

    if (
      normalizedCurrentUsername &&
      viewedIdentifiers.includes(normalizedCurrentUsername)
    ) {
      const ownActiveMentees = new Set(
        activeMatches.map((match) => match.mentee.username),
      );

      return Math.max(profile?.total_mentee_count ?? 0, ownActiveMentees.size);
    }

    const normalizedViewedUsername =
      normalizeUsernameIdentifier(profile?.username) ||
      normalizeUsernameIdentifier(username);
    const activeMenteesForViewedMentor = new Set(
      activeMatches
        .filter(
          (match) =>
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
    currentUsername,
    mentorshipMatchesQuery.data,
    profile?.full_name,
    profile?.total_mentee_count,
    profile?.username,
    username,
  ]);

  const hasExistingMentorConnection = useMemo(() => {
    const normalizedViewedUsername = normalizeUsernameIdentifier(username);
    return (
      Boolean(username) &&
      (mentorshipMatchesQuery.data ?? []).some(
        (match) =>
          match.is_active &&
          normalizeUsernameIdentifier(match.mentor.username) ===
            normalizedViewedUsername,
      )
    );
  }, [mentorshipMatchesQuery.data, username]);

  const canRequestMentorship = appUsageMode === "MENTEE";

  const handleSelectSlot = (payload: {
    day: string;
    time: string;
    slotId?: string;
  }) => {
    if (!canRequestMentorship) {
      return;
    }

    if (!payload.slotId) {
      setRequestFeedbackVariant("error");
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
    setShowResendVerificationAction(false);
  };

  const handleCreateRequest = async (payload: {
    slotId: string;
    coverLetter?: string;
  }) => {
    if (!username) {
      return;
    }

    setRequestFeedback(null);
    setRequestFeedbackVariant("info");
    setShowResendVerificationAction(false);
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

      setRequestFeedbackVariant("success");
      setRequestFeedback("Request sent successfully.");
      setSelectedSlot(null);
      setCoverLetter("");
      availabilitySlotsQuery.refetch();
    } catch (mutationError) {
      if (isEmailVerificationRequiredError(mutationError)) {
        setRequestFeedbackVariant("warning");
        setShowResendVerificationAction(true);
        setRequestFeedback(
          "Verify your email before sending mentorship requests. You can resend the verification email from here.",
        );
      } else {
        setRequestFeedbackVariant("error");
        setRequestFeedback(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to send mentorship request.",
        );
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await resendVerificationMutation.mutateAsync();
      setRequestFeedbackVariant("info");
      setRequestFeedback(response.detail);
      setShowResendVerificationAction(false);
    } catch (resendError) {
      setRequestFeedbackVariant("error");
      setRequestFeedback(
        resendError instanceof Error
          ? resendError.message
          : "Could not send verification email.",
      );
    }
  };

  const handleBookConnectedSession = async (slot: SelectedSlot) => {
    if (!username) {
      return;
    }

    setRequestFeedback(null);
    setRequestFeedbackVariant("info");
    try {
      await bookSlotMutation.mutateAsync({
        mentorUsername: username,
        slotId: slot.id,
      });

      setProfile((prev) => prev);

      setSelectedSlot(null);
      toast.success("Session booked successfully.");
      availabilitySlotsQuery.refetch();
    } catch (mutationError) {
      setRequestFeedbackVariant("error");
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
      setShowBookingConfirmation(true);
      return;
    }

    if (coverLetter.trim().length < 10) {
      setRequestFeedbackVariant("warning");
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

  const handleSubmitReport = async ({
    reason,
    description,
  }: {
    reason: "SPAM" | "HARASSMENT" | "INAPPROPRIATE_CONTENT" | "OTHER";
    description: string;
  }) => {
    const reportedUsername = profile?.username ?? username;
    if (!reportedUsername) {
      return;
    }

    setReportError(null);
    try {
      await submitReportMutation.mutateAsync({
        reported_username: reportedUsername,
        reason,
        description,
      });
      setShowReportSheet(false);
      setRequestFeedbackVariant("success");
      setRequestFeedback(
        "Report submitted. Thank you for helping keep the community safe.",
      );
    } catch (reportSubmitError) {
      setReportError(
        reportSubmitError instanceof Error
          ? reportSubmitError.message
          : "Failed to submit report.",
      );
    }
  };

  const bodyContent = renderBodyContent({
    loading,
    error,
    profile,
    liveRating: ratingQuery.data
      ? Number(ratingQuery.data.average_rating)
      : undefined,
    liveReviewCount: ratingQuery.data?.review_count,
    openSlotsCount,
    menteesHelpedCount,
    requestFeedback,
    requestFeedbackVariant,
    showResendVerificationAction,
    isResendVerificationPending: resendVerificationMutation.isPending,
    canRequestMentorship,
    isViewedMentor,
    reviews,
    reviewsTotalCount: reviewsQuery.data?.count ?? reviews.length,
    reviewsError:
      reviewsQuery.error instanceof Error ? reviewsQuery.error.message : null,
    isReviewsLoading: reviewsQuery.isLoading && reviewsPage === 1,
    isReviewsLoadingMore: reviewsQuery.isFetching && reviewsPage > 1,
    onLoadMoreReviews: () => setReviewsPage((prev) => prev + 1),
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
    onResendVerification: () => {
      void handleResendVerification();
    },
    onSubmit: submitCoverLetter,
    isRequestPending:
      createRequestMutation.isPending || bookSlotMutation.isPending,
    postsUsername: username ?? "",
    onViewAllPosts: () => {
      if (username) {
        router.push(
          `/(tabs)/user/${encodeURIComponent(username)}/posts` as any,
        );
      }
    },
    userWorkshops: userWorkshops,
    onJoinWorkshop: async ({ tagId, workshopId }) => {
      try {
        await joinWorkshopMutation.mutateAsync({ tagId, workshopId });
        toast.success("Joined workshop — check the workshop page for details.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to join workshop.",
        );
      }
    },
  });

  const screenTitle = isViewedMentor ? "Mentor Profile" : "Profile";
  const canReportProfile =
    Boolean(profile) &&
    Boolean(currentUsername) &&
    profile?.username !== currentUsername;
  const handleBackPress = () => {
    if (source === "community" && sourceTagId) {
      router.replace(
        `/(tabs)/community/${encodeURIComponent(sourceTagId)}?from=community` as any,
      );
      return;
    }

    router.back();
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-white border-b border-gray-100"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            testID="user-profile-back-button"
            onPress={handleBackPress}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="chevron-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-gray-900 flex-1">
            {screenTitle}
          </Text>
          {canReportProfile ? (
            <TouchableOpacity
              testID="profile-report-button"
              activeOpacity={0.8}
              onPress={() => {
                setReportError(null);
                setShowReportSheet(true);
              }}
              className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
            >
              <Ionicons name="flag-outline" size={19} color="#dc2626" />
            </TouchableOpacity>
          ) : null}
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

      <ConfirmationSheet
        visible={showBookingConfirmation}
        title="Book this session?"
        message={
          selectedSlot
            ? `Book this session on ${selectedSlot.day} at ${selectedSlot.label}?`
            : "Confirm this booking?"
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onCancel={() => setShowBookingConfirmation(false)}
        onConfirm={() => {
          const slot = selectedSlot;
          setShowBookingConfirmation(false);
          if (slot) {
            void handleBookConnectedSession(slot);
          }
        }}
      />

      <ReportSheet
        visible={showReportSheet}
        title={`Report ${profile?.full_name || profile?.username || "user"}`}
        isSubmitting={submitReportMutation.isPending}
        errorMessage={reportError}
        onClose={() => {
          if (!submitReportMutation.isPending) {
            setShowReportSheet(false);
          }
        }}
        onSubmit={(payload) => {
          void handleSubmitReport(payload);
        }}
      />
    </View>
  );
}
