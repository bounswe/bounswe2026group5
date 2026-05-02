import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConnectionActionsSheet } from "@/components/connections/ConnectionActionsSheet";
import { DeclineConfirmModal } from "@/components/connections/DeclineConfirmModal";
import { FeedbackBottomSheet } from "@/components/connections/FeedbackBottomSheet";
import { MenteeCard } from "@/components/connections/MenteeCard";
import {
  PendingRequestCard,
  PendingRequestCardProps,
} from "@/components/connections/PendingRequestCard";
import { RequestDetailSheet } from "@/components/connections/RequestDetailSheet";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessCard } from "@/components/ui/SuccessCard";

import { useAuthStore } from "@/lib/auth/store";
import { useAutoClearMessage } from "@/hooks/use-auto-clear-message";
import {
  MENTOR_MENTEE_CAPACITY_WARNING,
  shouldWarnBeforeAcceptingMentee,
} from "@/lib/mentorship/capacity";
import { useConversations } from "@/lib/queries/MessagingQueries";
import {
  mapRequestsToDashboard,
  useDeactivateMatchMutation,
  useMatchFeedbackQuery,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
  useRespondToMentorshipRequestMutation,
  useSubmitMatchFeedbackMutation,
  type DashboardRequestItem,
  type MentorshipRequest,
} from "@/lib/queries/mentorship";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWithin24h(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function mapRequestToCardProps(
  req: MentorshipRequest,
): PendingRequestCardProps {
  return {
    id: req.id,
    username: req.mentee.username,
    name: req.mentee.display_name,
    cover_letter: req.cover_letter,
    slot_date: req.slot_date,
    slot_start_time: req.slot_start_time,
    slot_end_time: req.slot_end_time,
    avatarUrl: req.mentee.picture_url || undefined,
    isNew: isWithin24h(req.created_at),
  };
}

function mapDashboardRequestToCardProps(
  request: DashboardRequestItem,
): PendingRequestCardProps {
  return {
    id: request.requestId,
    username:
      request.type === "incoming"
        ? request.menteeUsername
        : request.mentorUsername,
    name: request.user,
    cover_letter: request.message ?? "",
    slot_date: null,
    slot_start_time: request.proposedDate ?? null,
    slot_end_time: null,
    requestType: request.type,
    isReschedule: request.isReschedule,
  };
}

async function deactivateConnection(params: {
  matchIds: string[];
  name: string;
  mutateAsync: (matchId: string) => Promise<unknown>;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}): Promise<void> {
  try {
    for (const matchId of params.matchIds) {
      await params.mutateAsync(matchId);
    }
    params.onSuccess?.(`${params.name} has been removed.`);
  } catch (error) {
    params.onError?.(
      error instanceof Error
        ? error.message
        : "Could not remove this connection.",
    );
  }
}


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENTEES_PREVIEW_COUNT = 2;
const MENTORS_PREVIEW_COUNT = 2;

type ConnectionViewProps = Readonly<{
  onOpenFeedback: (
    matchId: string,
    name: string,
    myRole: "Mentor" | "Mentee",
  ) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}>;

function pushUserProfile(
  router: ReturnType<typeof useRouter>,
  username: string,
): void {
  router.push(`/user/${encodeURIComponent(username)}` as Href);
}

function pushMatchJourney(
  router: ReturnType<typeof useRouter>,
  matchId: string,
): void {
  router.push(
    `/(tabs)/connections/timeline/${encodeURIComponent(matchId)}` as Href,
  );
}

function getQueryErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function MatchJourneyPickerSheet({
  visible,
  name,
  matchIds,
  onClose,
  onSelect,
}: Readonly<{
  visible: boolean;
  name: string;
  matchIds: string[];
  onClose: () => void;
  onSelect: (matchId: string) => void;
}>) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="bg-surface dark:bg-surface-dark rounded-t-3xl px-5 pt-3 pb-8 border-t border-divider/20">
          <View className="items-center pb-3">
            <View className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>
          <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-muted mb-1">
            Select Journey
          </Text>
          <Text className="text-[22px] font-extrabold text-on-surface dark:text-white mb-2">
            {name}
          </Text>
          <Text className="text-[13px] text-on-surface-soft mb-4">
            This connection has multiple mentorship records. Choose which journey to view.
          </Text>
          {matchIds.map((matchId, index) => (
            <TouchableOpacity
              key={matchId}
              testID={`journey-match-${matchId}`}
              activeOpacity={0.85}
              onPress={() => onSelect(matchId)}
              className="flex-row items-center justify-between px-4 py-3.5 rounded-lg bg-gray-100 dark:bg-gray-800 mb-3"
            >
              <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Journey {index + 1}
              </Text>
              <Text className="text-xs font-semibold text-on-surface-muted">
                {matchId.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} className="items-center justify-center py-4">
            <Text className="text-on-surface-soft dark:text-gray-400 font-bold">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Mentor View
// ---------------------------------------------------------------------------

function MentorConnections({
  onOpenFeedback,
  onError,
  onSuccess,
}: ConnectionViewProps) {
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const [selectedRequest, setSelectedRequest] =
    useState<PendingRequestCardProps | null>(null);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [showAllMentees, setShowAllMentees] = useState(false);
  const [managedMentee, setManagedMentee] = useState<{
    name: string;
    username: string;
    matchIds: string[];
  } | null>(null);
  const [journeyPicker, setJourneyPicker] = useState<{
    name: string;
    matchIds: string[];
  } | null>(null);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const respondMutation = useRespondToMentorshipRequestMutation();
  const deactivateMatchMutation = useDeactivateMatchMutation(currentUsername);
  const { data: conversations = [] } = useConversations();

  // CHECK FEEDBACK FOR SELECTED MENTEE
  const activeMatchId = managedMentee?.matchIds[0];
  const matchFeedbackQuery = useMatchFeedbackQuery(activeMatchId);
  const hasReviewed = useMemo(() => {
    if (!matchFeedbackQuery.data || !currentUsername) return false;
    return matchFeedbackQuery.data.some(
      (feedback: any) => feedback.submitted_by.username === currentUsername,
    );
  }, [matchFeedbackQuery.data, currentUsername]);

  const requests = requestsQuery.data ?? [];
  const matches = matchesQuery.data ?? [];
  const requestsLoading = requestsQuery.isLoading;
  const requestsError = requestsQuery.isError;
  const matchesLoading = matchesQuery.isLoading;
  const matchesError = matchesQuery.isError;

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const mentees = Array.from(
    matches
      .reduce(
        (acc, match) => {
          const key = match.mentee.username;
          const existing = acc.get(key);
          if (existing) {
            existing.matchIds.push(match.id);
            return acc;
          }

          acc.set(key, {
            id: key,
            username: match.mentee.username,
            name: match.mentee.display_name,
            subtitle: match.mentee.title ?? "",
            avatarUrl: match.mentee.picture_url || undefined,
            matchIds: [match.id],
          });
          return acc;
        },
        new Map<
          string,
          {
            id: string;
            username: string;
            name: string;
            subtitle: string;
            avatarUrl?: string;
            matchIds: string[];
          }
        >(),
      )
      .values(),
  );

  const handleMessage = (username: string) => {
    const conv = conversations.find(
      (c) => c.mentor.username === username || c.mentee.username === username,
    );
    if (conv) {
      router.push(`/messages/${conv.id}` as Href);
    }
  };

  const handleMenteeMore = ({
    name,
    username,
    matchIds,
  }: {
    name: string;
    username: string;
    matchIds: string[];
  }) => {
    setManagedMentee({ name, username, matchIds });
  };

  const handleViewJourney = () => {
    if (!managedMentee) {
      return;
    }

    const target = managedMentee;
    setManagedMentee(null);
    if (target.matchIds.length === 1) {
      pushMatchJourney(router, target.matchIds[0]);
      return;
    }

    setJourneyPicker({ name: target.name, matchIds: target.matchIds });
  };

  const handleAccept = async (id: string) => {
    try {
      await respondMutation.mutateAsync({ requestId: id, action: "accept" });
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const handleDeclineConfirmed = async () => {
    if (declineTargetId) {
      try {
        await respondMutation.mutateAsync({
          requestId: declineTargetId,
          action: "reject",
        });
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    }
    setDeclineTargetId(null);
    setSelectedRequest(null);
  };

  const displayedMentees = showAllMentees
    ? mentees
    : mentees.slice(0, MENTEES_PREVIEW_COUNT);
  const shouldShowCapacityWarning = shouldWarnBeforeAcceptingMentee(
    mentees.length,
  );

  const handleRequestCardAccept = (cardProps: PendingRequestCardProps) => {
    if (shouldShowCapacityWarning) {
      setSelectedRequest(cardProps);
      return;
    }

    void handleAccept(cardProps.id);
  };

  return (
    <>
      <DeclineConfirmModal
        visible={declineTargetId !== null}
        onCancel={() => setDeclineTargetId(null)}
        onConfirm={handleDeclineConfirmed}
        isLoading={respondMutation.isPending}
      />

      <RequestDetailSheet
        request={selectedRequest}
        visible={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        onAccept={handleAccept}
        onDecline={(id) => setDeclineTargetId(id)}
        disabled={respondMutation.isPending}
        acceptanceWarning={
          shouldShowCapacityWarning ? MENTOR_MENTEE_CAPACITY_WARNING : undefined
        }
      />

      <ConnectionActionsSheet
        visible={managedMentee !== null}
        name={managedMentee?.name ?? ""}
        onClose={() => setManagedMentee(null)}
        isCheckingReview={matchFeedbackQuery.isLoading}
        hasReviewed={hasReviewed}
        onLeaveReview={() => {
          if (activeMatchId && managedMentee) {
            onOpenFeedback(activeMatchId, managedMentee.name, "Mentor");
            setManagedMentee(null);
          }
        }}
        onViewProfile={() => {
          if (!managedMentee) {
            return;
          }
          const target = managedMentee;
          setManagedMentee(null);
          pushUserProfile(router, target.username);
        }}
        onViewJourney={handleViewJourney}
        onRemoveConnection={() => {
          if (!managedMentee) {
            return;
          }
          const target = managedMentee;
          setManagedMentee(null);
          void deactivateConnection({
            matchIds: target.matchIds,
            name: target.name,
            mutateAsync: deactivateMatchMutation.mutateAsync,
            onError,
            onSuccess,
          });
        }}
      />

      <MatchJourneyPickerSheet
        visible={journeyPicker !== null}
        name={journeyPicker?.name ?? ""}
        matchIds={journeyPicker?.matchIds ?? []}
        onClose={() => setJourneyPicker(null)}
        onSelect={(matchId) => {
          setJourneyPicker(null);
          pushMatchJourney(router, matchId);
        }}
      />


      {/* Section: Pending Requests */}
      <View className="mb-8">
        <View className="mb-3.5">
          <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
            New Inbound
          </Text>
          <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
            Pending Requests
          </Text>
        </View>

        {requestsLoading && <ActivityIndicator className="mt-4" />}
        {requestsError && (
          <ErrorBanner
            message={getQueryErrorMessage(
              requestsQuery.error,
              "Failed to load requests.",
            )}
          />
        )}
        {pendingRequests.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {pendingRequests.map((req) => {
              const cardProps = mapRequestToCardProps(req);
              return (
                <View key={req.id} style={{ width: 330, marginRight: 12 }}>
                  <PendingRequestCard
                    {...cardProps}
                    onPress={() => setSelectedRequest(cardProps)}
                    onAccept={() => handleRequestCardAccept(cardProps)}
                    onDecline={() => setDeclineTargetId(req.id)}
                    disabled={respondMutation.isPending}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
        {!requestsLoading && !requestsError && pendingRequests.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">
            No pending requests.
          </Text>
        )}
      </View>

      {/* Section: Active Mentees */}
      <View className="mb-10">
        <View className="flex-row justify-between items-end mb-3.5">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Direct Mentorship
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Mentees
            </Text>
          </View>
          {mentees.length > MENTEES_PREVIEW_COUNT && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setShowAllMentees((prev) => !prev)}
            >
              <Text className="text-[13px] font-bold text-primary">
                {showAllMentees ? "Show Less" : `View All (${mentees.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {matchesLoading && <ActivityIndicator className="mt-4" />}
        {matchesError && (
          <ErrorBanner
            message={getQueryErrorMessage(
              matchesQuery.error,
              "Failed to load mentees.",
            )}
          />
        )}
        {displayedMentees.map((mentee) => (
          <MenteeCard
            key={mentee.id}
            id={mentee.id}
            name={mentee.name}
            subtitle={mentee.subtitle}
            avatarUrl={mentee.avatarUrl}
            onPress={() => pushUserProfile(router, mentee.username)}
            onMessage={() => handleMessage(mentee.username)}
            onMore={() =>
              handleMenteeMore({
                name: mentee.name,
                username: mentee.username,
                matchIds: mentee.matchIds,
              })
            }
          />
        ))}
        {!matchesLoading && !matchesError && mentees.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">
            No active mentees yet.
          </Text>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mentee View
// ---------------------------------------------------------------------------

function MenteeConnections({
  onOpenFeedback,
  onError,
  onSuccess,
}: ConnectionViewProps) {
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const [showAllMentors, setShowAllMentors] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<PendingRequestCardProps | null>(null);
  const [managedMentor, setManagedMentor] = useState<{
    name: string;
    username: string;
    matchIds: string[];
  } | null>(null);
  const [journeyPicker, setJourneyPicker] = useState<{
    name: string;
    matchIds: string[];
  } | null>(null);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const deactivateMatchMutation = useDeactivateMatchMutation(currentUsername);
  const { data: conversations = [] } = useConversations();

  // CHECK FEEDBACK FOR SELECTED MENTOR
  const activeMatchId = managedMentor?.matchIds[0];
  const matchFeedbackQuery = useMatchFeedbackQuery(activeMatchId);
  const hasReviewed = useMemo(() => {
    if (!matchFeedbackQuery.data || !currentUsername) return false;
    return matchFeedbackQuery.data.some(
      (feedback: any) => feedback.submitted_by.username === currentUsername,
    );
  }, [matchFeedbackQuery.data, currentUsername]);

  const requests = requestsQuery.data ?? [];
  const requestsLoading = requestsQuery.isLoading;
  const requestsError = requestsQuery.isError;
  const matches = matchesQuery.data ?? [];
  const matchesLoading = matchesQuery.isLoading;
  const matchesError = matchesQuery.isError;
  const dashboardRequests = mapRequestsToDashboard(
    requests,
    currentUsername ?? "",
  );
  const activeMentorUsernames = new Set(
    matches
      .filter((match) => match.is_active)
      .map((match) => match.mentor.username),
  );
  const pendingRequests = dashboardRequests.filter(
    (request) =>
      request.status === "PENDING" &&
      !(
        request.type === "outgoing" &&
        activeMentorUsernames.has(request.mentorUsername)
      ),
  );

  const mentors = Array.from(
    matches
      .reduce(
        (acc, match) => {
          const key = match.mentor.username;
          const existing = acc.get(key);
          if (existing) {
            existing.matchIds.push(match.id);
            return acc;
          }

          acc.set(key, {
            id: key,
            username: match.mentor.username,
            name: match.mentor.display_name,
            subtitle: match.mentor.title ?? "",
            avatarUrl: match.mentor.picture_url || undefined,
            matchIds: [match.id],
          });
          return acc;
        },
        new Map<
          string,
          {
            id: string;
            username: string;
            name: string;
            subtitle: string;
            avatarUrl?: string;
            matchIds: string[];
          }
        >(),
      )
      .values(),
  );

  const handleMessage = (username: string) => {
    const conv = conversations.find(
      (c) => c.mentor.username === username || c.mentee.username === username,
    );
    if (conv) {
      router.push(`/messages/${conv.id}` as Href);
    }
  };

  const handleMore = ({
    name,
    username,
    matchIds,
  }: {
    name: string;
    username: string;
    matchIds: string[];
  }) => {
    setManagedMentor({ name, username, matchIds });
  };

  const handleViewJourney = () => {
    if (!managedMentor) {
      return;
    }

    const target = managedMentor;
    setManagedMentor(null);
    if (target.matchIds.length === 1) {
      pushMatchJourney(router, target.matchIds[0]);
      return;
    }

    setJourneyPicker({ name: target.name, matchIds: target.matchIds });
  };

  const displayedMentors = showAllMentors
    ? mentors
    : mentors.slice(0, MENTORS_PREVIEW_COUNT);

  return (
    <>
      <RequestDetailSheet
        visible={selectedRequest !== null}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onShowProfile={(targetUsername) => {
          if (targetUsername) {
            setSelectedRequest(null);
            pushUserProfile(router, targetUsername);
          }
        }}
      />

      <ConnectionActionsSheet
        visible={managedMentor !== null}
        name={managedMentor?.name ?? ""}
        onClose={() => setManagedMentor(null)}
        isCheckingReview={matchFeedbackQuery.isLoading}
        hasReviewed={hasReviewed}
        onLeaveReview={() => {
          if (activeMatchId && managedMentor) {
            onOpenFeedback(activeMatchId, managedMentor.name, "Mentee");
            setManagedMentor(null);
          }
        }}
        onViewProfile={() => {
          if (!managedMentor) {
            return;
          }
          const target = managedMentor;
          setManagedMentor(null);
          pushUserProfile(router, target.username);
        }}
        onViewJourney={handleViewJourney}
        onRemoveConnection={() => {
          if (!managedMentor) {
            return;
          }
          const target = managedMentor;
          setManagedMentor(null);
          void deactivateConnection({
            matchIds: target.matchIds,
            name: target.name,
            mutateAsync: deactivateMatchMutation.mutateAsync,
            onError,
            onSuccess,
          });
        }}
      />

      <MatchJourneyPickerSheet
        visible={journeyPicker !== null}
        name={journeyPicker?.name ?? ""}
        matchIds={journeyPicker?.matchIds ?? []}
        onClose={() => setJourneyPicker(null)}
        onSelect={(matchId) => {
          setJourneyPicker(null);
          pushMatchJourney(router, matchId);
        }}
      />


      {/* Section: Requests */}
      <View className="mb-8">
        <View className="mb-3.5">
          <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
            Request Activity
          </Text>
          <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
            Pending Requests
          </Text>
        </View>

        {requestsLoading && <ActivityIndicator className="mt-4" />}
        {requestsError && (
          <ErrorBanner
            message={getQueryErrorMessage(
              requestsQuery.error,
              "Failed to load requests.",
            )}
          />
        )}
        {pendingRequests.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {pendingRequests.map((request) => {
              const cardProps = mapDashboardRequestToCardProps(request);
              return (
                <View key={request.id} style={{ width: 320, marginRight: 12 }}>
                  <PendingRequestCard
                    {...cardProps}
                    onPress={() => setSelectedRequest(cardProps)}
                    onShowProfile={() => {
                      if (cardProps.username) {
                        pushUserProfile(router, cardProps.username);
                      }
                    }}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
        {!requestsLoading && !requestsError && pendingRequests.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">
            No pending requests.
          </Text>
        )}
      </View>

      {/* Section: Active Mentors */}
      <View className="mb-10">
        <View className="flex-row justify-between items-end mb-3.5">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Direct Mentorship
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Mentors
            </Text>
          </View>
          {mentors.length > MENTORS_PREVIEW_COUNT && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowAllMentors((prev) => !prev)}
            >
              <Text className="text-[13px] font-bold text-primary">
                {showAllMentors ? "Show Less" : `View All (${mentors.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {matchesLoading && <ActivityIndicator className="mt-4" />}
        {matchesError && (
          <ErrorBanner
            message={getQueryErrorMessage(
              matchesQuery.error,
              "Failed to load mentors.",
            )}
          />
        )}
        {displayedMentors.map((mentor) => (
          <MenteeCard
            key={mentor.id}
            id={mentor.id}
            name={mentor.name}
            subtitle={mentor.subtitle}
            avatarUrl={mentor.avatarUrl}
            onPress={() => pushUserProfile(router, mentor.username)}
            onMessage={() => handleMessage(mentor.username)}
            onMore={() =>
              handleMore({
                name: mentor.name,
                username: mentor.username,
                matchIds: mentor.matchIds,
              })
            }
          />
        ))}
        {!matchesLoading && !matchesError && mentors.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">
            No active mentors yet.
          </Text>
        )}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const submitFeedbackMutation = useSubmitMatchFeedbackMutation();
  const [feedbackConnection, setFeedbackConnection] = useState<{
    matchId: string;
    userName: string;
    role: "Mentor" | "Mentee";
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useAutoClearMessage(successMessage, setSuccessMessage);

  const handleFeedbackSubmit = async (rating: number, text?: string) => {
    if (!feedbackConnection?.matchId) return;

    try {
      setActionError(null);
      setSuccessMessage(null);
      await submitFeedbackMutation.mutateAsync({
        matchId: feedbackConnection.matchId,
        rating,
        text,
      });
      setFeedbackConnection(null);
      setSuccessMessage("Thank you for your feedback!");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not submit feedback.",
      );
    }
  };

  const isMentor = user?.app_usage_mode !== "MENTEE";

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {/* Fixed Header - paddingTop is dynamic (safe area inset) */}
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Connections
          </Text>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/messages" as Href)}
              className="w-10 h-10 items-center justify-center rounded-full bg-surface-active dark:bg-surface-active-dark"
            >
              <Ionicons name="chatbubble-outline" size={20} color="#4a7c6f" />
            </TouchableOpacity>
            <NotificationBell />
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {actionError ? (
          <View className="mb-4">
            <ErrorBanner message={actionError} />
          </View>
        ) : null}

        {successMessage ? (
          <View className="mb-4">
            <SuccessCard message={successMessage} />
          </View>
        ) : null}

        {isMentor ? (
          <MentorConnections
            onError={setActionError}
            onSuccess={setSuccessMessage}
            onOpenFeedback={(matchId, name, role) =>
              setFeedbackConnection({ matchId, userName: name, role })
            }
          />
        ) : (
          <MenteeConnections
            onError={setActionError}
            onSuccess={setSuccessMessage}
            onOpenFeedback={(matchId, name, role) =>
              setFeedbackConnection({ matchId, userName: name, role })
            }
          />
        )}
      </ScrollView>

      <FeedbackBottomSheet
        visible={!!feedbackConnection}
        onClose={() => setFeedbackConnection(null)}
        onSubmit={handleFeedbackSubmit}
        otherUserName={feedbackConnection?.userName || ""}
        isSubmitting={submitFeedbackMutation.isPending}
      />
    </View>
  );
}
