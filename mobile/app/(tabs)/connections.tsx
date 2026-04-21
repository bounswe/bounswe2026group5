import { useRouter, type Href } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  MessageCard,
  MessageCardProps,
} from "@/components/connections/MessageCard";
import {
  PendingRequestCard,
  PendingRequestCardProps,
} from "@/components/connections/PendingRequestCard";
import { RequestDetailSheet } from "@/components/connections/RequestDetailSheet";
import { RequestCard } from "@/components/dashboard/RequestCard";
import { RequestDetailsModal } from "@/components/dashboard/RequestDetailsModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessCard } from "@/components/ui/SuccessCard";

import { useAuthStore } from "@/lib/auth/store";
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
// Mock data - messaging has no API yet
// ---------------------------------------------------------------------------

const MOCK_MESSAGES: MessageCardProps[] = [
  {
    id: "msg-1",
    name: "Sarah Chen",
    messagePreview:
      '"I\'ve finished the draft for the system architecture. Could we schedule a review soon?"',
    timeAgo: "2m ago",
    hasUnread: true,
  },
  {
    id: "msg-2",
    name: "Marcus Wright",
    messagePreview:
      '"The interview went really well! They asked about distributed caches and I nailed it."',
    timeAgo: "1h ago",
  },
  {
    id: "msg-3",
    name: "Elena Rodriguez",
    messagePreview:
      '"Just shared my portfolio link. Looking forward to your feedback!"',
    timeAgo: "4h ago",
  },
];

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

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const respondMutation = useRespondToMentorshipRequestMutation();
  const deactivateMatchMutation = useDeactivateMatchMutation(currentUsername);

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

  const handleMessage = (_name: string) => {
    // NOTE: Route to messaging thread when chat screen is implemented.
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

      {/* Section: Upcoming Messages */}
      <View className="mb-8">
        <View className="flex-row justify-between items-end mb-3.5">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Recent Updates
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Upcoming Messages
            </Text>
          </View>
          <TouchableOpacity>
            <Text className="text-[13px] font-bold text-primary">View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {MOCK_MESSAGES.map((msg) => (
            <MessageCard
              key={msg.id}
              {...msg}
              onPress={() => handleMessage(msg.name)}
            />
          ))}
        </ScrollView>
      </View>

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
          <ErrorBanner message="Failed to load requests." />
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
                    onAccept={() => handleAccept(req.id)}
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
          <ErrorBanner message="Failed to load mentees." />
        )}
        {displayedMentees.map((mentee) => (
          <MenteeCard
            key={mentee.id}
            id={mentee.id}
            name={mentee.name}
            subtitle={mentee.subtitle}
            avatarUrl={mentee.avatarUrl}
            onPress={() => pushUserProfile(router, mentee.username)}
            onMessage={() => handleMessage(mentee.name)}
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
    useState<DashboardRequestItem | null>(null);
  const [managedMentor, setManagedMentor] = useState<{
    name: string;
    username: string;
    matchIds: string[];
  } | null>(null);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const deactivateMatchMutation = useDeactivateMatchMutation(currentUsername);

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

  const handleMessage = (_name: string) => {
    // NOTE: Route to messaging thread when chat screen is implemented.
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

  const displayedMentors = showAllMentors
    ? mentors
    : mentors.slice(0, MENTORS_PREVIEW_COUNT);

  return (
    <>
      <RequestDetailsModal
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onCancelOutgoing={() => setSelectedRequest(null)}
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

      {/* Section: Upcoming Messages */}
      <View className="mb-8">
        <View className="flex-row justify-between items-end mb-3.5">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Recent Updates
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Upcoming Messages
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85}>
            <Text className="text-[13px] font-bold text-primary">View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {MOCK_MESSAGES.map((msg) => (
            <MessageCard
              key={msg.id}
              {...msg}
              onPress={() => handleMessage(msg.name)}
            />
          ))}
        </ScrollView>
      </View>

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
          <ErrorBanner message="Failed to load requests." />
        )}
        {pendingRequests.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {pendingRequests.map((request) => (
              <View key={request.id} style={{ width: 320, marginRight: 12 }}>
                <RequestCard
                  user={request.user}
                  topic={request.topic}
                  type={request.type}
                  isReschedule={request.isReschedule}
                  onPress={() => setSelectedRequest(request)}
                  onShowProfile={() => {
                    const targetUsername =
                      request.type === "incoming"
                        ? request.menteeUsername
                        : request.mentorUsername;
                    pushUserProfile(router, targetUsername);
                  }}
                />
              </View>
            ))}
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
          <ErrorBanner message="Failed to load mentors." />
        )}
        {displayedMentors.map((mentor) => (
          <MenteeCard
            key={mentor.id}
            id={mentor.id}
            name={mentor.name}
            subtitle={mentor.subtitle}
            avatarUrl={mentor.avatarUrl}
            onPress={() => pushUserProfile(router, mentor.username)}
            onMessage={() => handleMessage(mentor.name)}
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
  const { user } = useAuthStore();

  const submitFeedbackMutation = useSubmitMatchFeedbackMutation();
  const [feedbackConnection, setFeedbackConnection] = useState<{
    matchId: string;
    userName: string;
    role: "Mentor" | "Mentee";
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Connections
          </Text>
          <NotificationBell />
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
