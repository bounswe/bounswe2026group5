import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/lib/auth/store";
import {
  mapRequestsToDashboard,
  type DashboardRequestItem,
  type MentorshipRequest,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
  useRespondToMentorshipRequestMutation,
} from "@/lib/queries/mentorship";
import {
  MessageCard,
  MessageCardProps,
} from "@/components/connections/MessageCard";
import {
  MenteeCard,
  MenteeCardProps,
} from "@/components/connections/MenteeCard";
import {
  PendingRequestCard,
  PendingRequestCardProps,
} from "@/components/connections/PendingRequestCard";
import { MentorCard } from "@/components/connections/MentorCard";
import { RequestDetailSheet } from "@/components/connections/RequestDetailSheet";
import { DeclineConfirmModal } from "@/components/connections/DeclineConfirmModal";
import { RequestCard } from "@/components/dashboard/RequestCard";
import { RequestDetailsModal } from "@/components/dashboard/RequestDetailsModal";

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

// ---------------------------------------------------------------------------
// Mock data — messaging has no API yet
// ---------------------------------------------------------------------------

// NOTE: Replace with API-backed recent messages when messaging endpoint is available.
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

// NOTE: Replace with API-backed latest message when messaging endpoint is available.
const MOCK_MENTEE_MESSAGE = {
  name: "Elena Rodriguez",
  preview:
    '"I finished the wireframes we discussed — take a look when you have a moment!"',
  timeAgo: "15m ago",
  hasUnread: true,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MENTEES_PREVIEW_COUNT = 2;
const MENTORS_PREVIEW_COUNT = 2;

// ---------------------------------------------------------------------------
// Mentor View
// ---------------------------------------------------------------------------

function MentorConnections() {
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const [selectedRequest, setSelectedRequest] =
    useState<PendingRequestCardProps | null>(null);
  const [declineTargetId, setDeclineTargetId] = useState<string | null>(null);
  const [showAllMentees, setShowAllMentees] = useState(false);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const respondMutation = useRespondToMentorshipRequestMutation();

  const requests = requestsQuery.data ?? [];
  const matches = matchesQuery.data ?? [];
  const requestsLoading = requestsQuery.isLoading;
  const requestsError = requestsQuery.isError;
  const matchesLoading = matchesQuery.isLoading;
  const matchesError = matchesQuery.isError;

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const mentees: MenteeCardProps[] = matches.map((m) => ({
    id: m.id,
    name: m.mentee.display_name,
    subtitle: m.mentee.title ?? "",
    avatarUrl: m.mentee.picture_url || undefined,
    onPress: () =>
      router.push(`/mentor/${encodeURIComponent(m.mentee.username)}`),
  }));

  const handleMessage = (_name: string) => {
    // NOTE: Route to messaging thread when chat screen is implemented.
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
      />

      <RequestDetailSheet
        request={selectedRequest}
        visible={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        onViewProfile={(username) =>
          router.push(`/mentor/${encodeURIComponent(username)}`)
        }
        onAccept={handleAccept}
        onDecline={(id) => setDeclineTargetId(id)}
        disabled={respondMutation.isPending}
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
          {/* NOTE: Route to full messages list when messaging screen is implemented. */}
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
            {...mentee}
            onPress={mentee.onPress}
            onMessage={() => handleMessage(mentee.name)}
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

function MenteeConnections() {
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username);
  const [showAllMentors, setShowAllMentors] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<DashboardRequestItem | null>(null);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
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
  const pendingRequests = dashboardRequests.filter(
    (r) => r.status === "PENDING",
  );

  const mentors = matches.map((m) => ({
    id: m.id,
    name: m.mentor.display_name,
    subtitle: m.mentor.title ?? "",
    avatarUrl: m.mentor.picture_url || undefined,
    onPress: () =>
      router.push(`/mentor/${encodeURIComponent(m.mentor.username)}`),
  }));

  const handleMessage = (_name: string) => {
    // NOTE: Route to messaging thread when chat screen is implemented.
  };

  const handleMore = (_name: string) => {
    // NOTE: Add relationship options sheet when the action endpoint is ready.
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
        onViewProfile={
          selectedRequest
            ? () =>
                router.push(
                  `/mentor/${encodeURIComponent(
                    selectedRequest.type === "incoming"
                      ? selectedRequest.menteeUsername
                      : selectedRequest.mentorUsername,
                  )}`,
                )
            : undefined
        }
        onCancelOutgoing={() => setSelectedRequest(null)}
      />

      {/* Section: Upcoming Messages */}
      <View className="mb-7">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-[20px] font-bold text-on-surface">
            Upcoming Messages
          </Text>
          {/* NOTE: Route to full messages list when messaging screen is implemented. */}
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
        </View>
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
                      `/mentor/${encodeURIComponent(
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
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="text-[10px] font-bold text-on-surface-muted uppercase tracking-[0.8px]">
              Your Mentors
            </Text>
            <Text className="text-[22px] font-extrabold text-on-surface mt-0.5">
              Mentors
            </Text>
          </View>
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
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => router.push("/(tabs)/discover")}
            >
              <Text className="text-[13px] font-semibold text-primary">
                Find New
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {matchesLoading && <ActivityIndicator className="mt-4" />}
        {matchesError && (
          <Text className="text-[13px] text-error text-center mt-2">
            Failed to load mentors.
          </Text>
        )}
        {displayedMentors.map((mentor) => (
          <MentorCard
            key={mentor.id}
            {...mentor}
            onPress={mentor.onPress}
            onMessage={() => handleMessage(mentor.name)}
            onMore={() => handleMore(mentor.name)}
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

  const isMentor = user?.app_usage_mode !== "MENTEE";

  return (
    <View className="flex-1 bg-surface">
      {/* Fixed Header — paddingTop is dynamic (safe area inset) */}
      <View
        className="bg-surface z-10 shadow-sm"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-5 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-primary">
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
        {isMentor ? <MentorConnections /> : <MenteeConnections />}
      </ScrollView>
    </View>
  );
}
