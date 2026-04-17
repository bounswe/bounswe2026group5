<<<<<<< Updated upstream
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConnectionActionsSheet } from "@/components/connections/ConnectionActionsSheet";
import { DeclineConfirmModal } from "@/components/connections/DeclineConfirmModal";
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
import { FeedbackBottomSheet } from "@/components/connections/FeedbackBottomSheet"; 

import { useAuthStore } from "@/lib/auth/store";
import {
  mapRequestsToDashboard,
  useDeactivateMatchMutation,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
  useRespondToMentorshipRequestMutation,
  useSubmitMatchFeedbackMutation,
  useMatchFeedbackQuery,
  type DashboardRequestItem,
  type MentorshipRequest,
} from "@/lib/queries/mentorship";
=======
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeclineConfirmModal } from "@/components/connections/DeclineConfirmModal";
import {
  MenteeCard,
  MenteeCardProps,
} from "@/components/connections/MenteeCard";
import { MentorCard } from "@/components/connections/MentorCard";
import {
  MessageCard,
  MessageCardProps,
} from "@/components/connections/MessageCard";
import {
  PendingRequestCard,
  PendingRequestCardProps,
} from "@/components/connections/PendingRequestCard";
import { RequestDetailSheet } from "@/components/connections/RequestDetailSheet";
import { useAuthStore } from "@/lib/auth/store";
import {
  MentorshipRequest as ApiRequest,
  fetchMyMatchesFn,
  fetchMyRequestsFn,
  respondToRequestFn,
} from "@/lib/queries/mentorshipQueries";
>>>>>>> Stashed changes

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
}): Promise<void> {
  try {
    for (const matchId of params.matchIds) {
      await params.mutateAsync(matchId);
    }
    Alert.alert("Connection Removed", `${params.name} has been removed.`);
  } catch (error) {
    Alert.alert(
      "Remove Failed",
      error instanceof Error
        ? error.message
        : "Could not remove this connection.",
    );
  }
}

// ---------------------------------------------------------------------------
// Mock data — messaging has no API yet
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

<<<<<<< Updated upstream
=======
// TODO: API connection — GET /api/messages/recent (Mentee view — latest single message)
const MOCK_MENTEE_MESSAGE = {
  name: "Elena Rodriguez",
  preview:
    '"I finished the wireframes we discussed — take a look when you have a moment!"',
  timeAgo: "15m ago",
  hasUnread: true,
};

>>>>>>> Stashed changes
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENTEES_PREVIEW_COUNT = 2;
const MENTORS_PREVIEW_COUNT = 2;

// ---------------------------------------------------------------------------
// Mentor View
// ---------------------------------------------------------------------------

<<<<<<< Updated upstream
function MentorConnections({
  onOpenFeedback,
}: {
  onOpenFeedback: (matchId: string, name: string, myRole: "Mentor" | "Mentee") => void;
}) {
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
=======
function MentorConnections() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
>>>>>>> Stashed changes
  const [selectedRequest, setSelectedRequest] =
    useState<PendingRequestCardProps | null>(null);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [showAllMentees, setShowAllMentees] = useState(false);
  const [managedMentee, setManagedMentee] = useState<{
    name: string;
    username: string;
    matchIds: string[];
  } | null>(null);

<<<<<<< Updated upstream
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
      (feedback: any) => feedback.submitted_by.username === currentUsername
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
=======
  const {
    data: requests = [],
    isLoading: requestsLoading,
    isError: requestsError,
  } = useQuery({
    queryKey: ["mentorship-requests"],
    queryFn: () => {
      if (!accessToken) throw new Error("Not authenticated");
      return fetchMyRequestsFn(accessToken);
    },
    enabled: !!accessToken,
  });

  const {
    data: matches = [],
    isLoading: matchesLoading,
    isError: matchesError,
  } = useQuery({
    queryKey: ["mentorship-matches"],
    queryFn: () => {
      if (!accessToken) throw new Error("Not authenticated");
      return fetchMyMatchesFn(accessToken);
    },
    enabled: !!accessToken,
  });

  const respondMutation = useMutation({
    mutationFn: (params: {
      requestId: string;
      action: "accept" | "reject";
    }) => {
      if (!accessToken) throw new Error("Not authenticated");
      return respondToRequestFn({ ...params, accessToken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
      queryClient.invalidateQueries({ queryKey: ["mentorship-matches"] });
    },
    onError: (error: Error) => {
      Alert.alert(
        "Action Failed",
        error.message || "Something went wrong. Please try again.",
      );
    },
  });

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const mentees: MenteeCardProps[] = matches.map((m) => ({
    id: m.id,
    name: m.mentee.display_name,
    subtitle: m.mentee.title ?? "",
    avatarUrl: m.mentee.picture_url || undefined,
  }));
>>>>>>> Stashed changes

  const handleMessage = (_name: string) => {
    // NOTE: Route to messaging thread when chat screen is implemented.
  };

<<<<<<< Updated upstream
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
=======
  const handleAccept = (id: string) => {
    respondMutation.mutate({ requestId: id, action: "accept" });
>>>>>>> Stashed changes
  };

  const handleAccept = async (id: string) => {
    try {
      await respondMutation.mutateAsync({ requestId: id, action: "accept" });
    } catch (error) {
      Alert.alert(
        "Action Failed",
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  };

  const handleDeclineConfirmed = async () => {
    if (declineTargetId) {
<<<<<<< Updated upstream
      try {
        await respondMutation.mutateAsync({
          requestId: declineTargetId,
          action: "reject",
        });
      } catch (error) {
        Alert.alert(
          "Action Failed",
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
=======
      respondMutation.mutate({ requestId: declineTargetId, action: "reject" });
>>>>>>> Stashed changes
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
          router.push(`/user/${encodeURIComponent(target.username)}`);
        }}
        onRemoveConnection={() => {
          if (!managedMentee) {
            return;
          }
          const target = managedMentee;
          setManagedMentee(null);
          Alert.alert(
            `Remove ${target.name}?`,
            "This will end the active mentorship connection.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Remove",
                style: "destructive",
                onPress: () => {
                  void deactivateConnection({
                    matchIds: target.matchIds,
                    name: target.name,
                    mutateAsync: deactivateMatchMutation.mutateAsync,
                  });
                },
              },
            ],
          );
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
          <Text className="text-[13px] text-error text-center mt-2">
            Failed to load requests.
          </Text>
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
          <Text className="text-[13px] text-error text-center mt-2">
            Failed to load mentees.
          </Text>
        )}
        {displayedMentees.map((mentee) => (
          <MenteeCard
            key={mentee.id}
            id={mentee.id}
            name={mentee.name}
            subtitle={mentee.subtitle}
            avatarUrl={mentee.avatarUrl}
            onPress={() =>
              router.push(`/user/${encodeURIComponent(mentee.username)}`)
            }
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
<<<<<<< Updated upstream
          </Text>
=======
          </Text>
        )}
      </View>

      {/* Section: Pending Requests */}
      <View className="mb-10">
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
          <Text className="text-[13px] text-error text-center mt-2">
            Failed to load requests.
          </Text>
        )}
        {pendingRequests.map((req) => {
          const cardProps = mapRequestToCardProps(req);
          return (
            <PendingRequestCard
              key={req.id}
              {...cardProps}
              onPress={() => setSelectedRequest(cardProps)}
              onAccept={() => handleAccept(req.id)}
              onDecline={() => setDeclineTargetId(req.id)}
              disabled={respondMutation.isPending}
            />
          );
        })}
        {!requestsLoading && !requestsError && pendingRequests.length === 0 && (
          <Text className="text-[13px] text-on-surface-muted text-center mt-2">
            No pending requests.
          </Text>
>>>>>>> Stashed changes
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
}: {
  onOpenFeedback: (matchId: string, name: string, myRole: "Mentor" | "Mentee") => void;
}) {
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

<<<<<<< Updated upstream
  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const deactivateMatchMutation = useDeactivateMatchMutation(currentUsername);
  
  // CHECK FEEDBACK FOR SELECTED MENTOR
  const activeMatchId = managedMentor?.matchIds[0];
  const matchFeedbackQuery = useMatchFeedbackQuery(activeMatchId);
  const hasReviewed = useMemo(() => {
    if (!matchFeedbackQuery.data || !currentUsername) return false;
    return matchFeedbackQuery.data.some(
      (feedback: any) => feedback.submitted_by.username === currentUsername
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
=======
  const {
    data: matches = [],
    isLoading: matchesLoading,
    isError: matchesError,
  } = useQuery({
    queryKey: ["mentorship-matches"],
    queryFn: () => {
      if (!accessToken) throw new Error("Not authenticated");
      return fetchMyMatchesFn(accessToken);
    },
    enabled: !!accessToken,
  });

  const mentors = matches.map((m) => ({
    id: m.id,
    name: m.mentor.display_name,
    subtitle: m.mentor.title ?? "",
    avatarUrl: m.mentor.picture_url || undefined,
  }));
>>>>>>> Stashed changes

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
          router.push(`/user/${encodeURIComponent(target.username)}`);
        }}
        onRemoveConnection={() => {
          if (!managedMentor) {
            return;
          }
          const target = managedMentor;
          setManagedMentor(null);
          Alert.alert(
            `Remove ${target.name}?`,
            "This will end the active mentorship connection.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Remove",
                style: "destructive",
                onPress: () => {
                  void deactivateConnection({
                    matchIds: target.matchIds,
                    name: target.name,
                    mutateAsync: deactivateMatchMutation.mutateAsync,
                  });
                },
              },
            ],
          );
        }}
      />

      {/* Section: Upcoming Messages */}
<<<<<<< Updated upstream
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
=======
      <View className="mb-7">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[20px] font-bold text-on-surface">
            Upcoming Messages
          </Text>
          {/* TODO: API connection — navigate to full messages list */}
          <TouchableOpacity>
            <Text className="text-[13px] font-semibold text-primary">
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-primary/5 border border-primary/10 rounded-[10px] p-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-surface-active items-center justify-center">
            <Text className="text-[15px] font-bold text-primary">
              {MOCK_MENTEE_MESSAGE.name.charAt(0)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-on-surface">
              {MOCK_MENTEE_MESSAGE.name}{" "}
              <Text className="font-normal text-on-surface-muted text-[12px]">
                • {MOCK_MENTEE_MESSAGE.timeAgo}
              </Text>
            </Text>
            <Text
              className="text-[12px] text-on-surface-soft mt-0.5"
              numberOfLines={1}
            >
              {MOCK_MENTEE_MESSAGE.preview}
            </Text>
          </View>
          {MOCK_MENTEE_MESSAGE.hasUnread && (
            <View className="w-2 h-2 rounded-full bg-primary" />
          )}
>>>>>>> Stashed changes
        </View>

        {requestsLoading && <ActivityIndicator className="mt-4" />}
        {requestsError && (
          <Text className="text-[13px] text-error text-center mt-2">
            Failed to load requests.
          </Text>
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
                  onShowProfile={() =>
                    router.push(
                      `/user/${encodeURIComponent(
                        request.type === "incoming"
                          ? request.menteeUsername
                          : request.mentorUsername,
                      )}`,
                    )
                  }
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
<<<<<<< Updated upstream
          {mentors.length > MENTORS_PREVIEW_COUNT && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowAllMentors((prev) => !prev)}
            >
              <Text className="text-[13px] font-bold text-primary">
                {showAllMentors ? "Show Less" : `View All (${mentors.length})`}
=======
          <View className="flex-row items-center gap-3">
            {mentors.length > MENTORS_PREVIEW_COUNT && (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => setShowAllMentors((prev) => !prev)}
              >
                <Text className="text-[13px] font-bold text-primary">
                  {showAllMentors
                    ? "Show Less"
                    : `View All (${mentors.length})`}
                </Text>
              </TouchableOpacity>
            )}
            {/* TODO: API connection — navigate to mentor discovery/search */}
            <TouchableOpacity activeOpacity={0.6}>
              <Text className="text-[13px] font-semibold text-primary">
                Find New
>>>>>>> Stashed changes
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {matchesLoading && <ActivityIndicator className="mt-4" />}
        {matchesError && (
          <Text className="text-[13px] text-error text-center mt-2">
            Failed to load mentors.
          </Text>
        )}
        {displayedMentors.map((mentor) => (
          <MenteeCard
            key={mentor.id}
            id={mentor.id}
            name={mentor.name}
            subtitle={mentor.subtitle}
            avatarUrl={mentor.avatarUrl}
            onPress={() =>
              router.push(`/user/${encodeURIComponent(mentor.username)}`)
            }
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

<<<<<<< Updated upstream
  const submitFeedbackMutation = useSubmitMatchFeedbackMutation();
  const [feedbackConnection, setFeedbackConnection] = useState<{
    matchId: string;
    userName: string;
    role: "Mentor" | "Mentee";
  } | null>(null);

  const handleFeedbackSubmit = async (rating: number, text?: string) => {
    if (!feedbackConnection?.matchId) return;
    
    try {
      await submitFeedbackMutation.mutateAsync({
        matchId: feedbackConnection.matchId,
        rating,
        text,
      });
      setFeedbackConnection(null);
      Alert.alert("Review Submitted", "Thank you for your feedback!");
    } catch (error) {
      Alert.alert(
        "Feedback Failed",
        error instanceof Error ? error.message : "Could not submit feedback."
      );
    }
  };

  const isMentor = user?.app_usage_mode !== "MENTEE";

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
=======
  const isMentor = user?.app_usage_mode === "MENTOR";

  return (
    <View className="flex-1 bg-surface">
>>>>>>> Stashed changes
      {/* Fixed Header — paddingTop is dynamic (safe area inset) */}
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
<<<<<<< Updated upstream
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
=======
        <View className="flex-row justify-between items-center px-5 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-primary">
>>>>>>> Stashed changes
            Connections
          </Text>
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
        {isMentor ? (
          <MentorConnections
            onOpenFeedback={(matchId, name, role) => setFeedbackConnection({ matchId, userName: name, role })}
          />
        ) : (
          <MenteeConnections
            onOpenFeedback={(matchId, name, role) => setFeedbackConnection({ matchId, userName: name, role })}
          />
        )}
      </ScrollView>

      <FeedbackBottomSheet
        visible={!!feedbackConnection}
        onClose={() => setFeedbackConnection(null)}
        onSubmit={handleFeedbackSubmit}
        otherUserName={feedbackConnection?.userName || ""}
        yourRole={feedbackConnection?.role || "Mentee"}
        isSubmitting={submitFeedbackMutation.isPending}
      />
    </View>
  );
}
