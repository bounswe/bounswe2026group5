import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import the components for the dashboard
import {
  PendingRequestCard,
  PendingRequestCardProps,
} from "@/components/connections/PendingRequestCard";
import { RequestDetailSheet } from "@/components/connections/RequestDetailSheet";
import { RescheduleBottomSheet } from "@/components/dashboard/RescheduleBottomSheet";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SuccessCard } from "@/components/ui/SuccessCard";

import { useAuthStore } from "@/lib/auth/store";
import {
  mapMeetingSessionsToDashboard,
  mapRequestsToDashboard,
  useAvailabilitySlotsQuery,
  useCancelSessionMutation,
  useMentorshipMeetingSessionsQuery,
  useMentorshipRequestsQuery,
  useRescheduleSessionMutation,
  useRespondToMentorshipRequestMutation,
  type DashboardRequestItem,
  type DashboardSessionItem,
} from "@/lib/queries/mentorship";

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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentUsername = useAuthStore((state) => state.user?.username);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const meetingSessionsQuery = useMentorshipMeetingSessionsQuery(
    currentUsername,
    { status: "upcoming" },
  );
  const respondMutation = useRespondToMentorshipRequestMutation();
  const cancelSessionMutation = useCancelSessionMutation(currentUsername);
  const rescheduleSessionMutation =
    useRescheduleSessionMutation(currentUsername);

  // Debug logging
  const requests = useMemo<DashboardRequestItem[]>(() => {
    if (requestsQuery.data && currentUsername) {
      return mapRequestsToDashboard(requestsQuery.data, currentUsername);
    }
    return [];
  }, [requestsQuery.data, currentUsername]);

  const sessions = useMemo(
    () => mapMeetingSessionsToDashboard(meetingSessionsQuery.data ?? []),
    [meetingSessionsQuery.data],
  );
  const queryError =
    (requestsQuery.isError && "Failed to load mentorship requests.") ||
    (meetingSessionsQuery.isError && "Failed to load upcoming sessions.") ||
    null;

  // State for Modals
  const [selectedRequest, setSelectedRequest] =
    useState<PendingRequestCardProps | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<DashboardSessionItem | null>(null);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(
    null,
  );
  const [rescheduleSessionMentorUsername, setRescheduleSessionMentorUsername] =
    useState<string | null>(null);
  const [rescheduleCurrentSlotId, setRescheduleCurrentSlotId] = useState("");
  const selectedMentorUsername =
    selectedSession?.myRole === "Mentee"
      ? selectedSession.mentorUsername
      : undefined;
  const mentorAvailabilityForReschedule = useAvailabilitySlotsQuery(
    rescheduleSessionMentorUsername || "",
  );

  const handleRespond = async (
    action: "accept" | "reject",
    requestId = selectedRequest?.id,
  ) => {
    if (!requestId) {
      return;
    }

    try {
      setActionError(null);
      setSuccessMessage(null);
      await respondMutation.mutateAsync({
        requestId,
        action,
      });
      setSelectedRequest(null);
      requestsQuery.refetch();
      meetingSessionsQuery.refetch();
      setSuccessMessage(
        action === "accept"
          ? "Request accepted successfully."
          : "Request rejected successfully.",
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not update request status.",
      );
    }
  };

  const handleOpenRequestProfile = (targetUsername?: string) => {
    if (!targetUsername) {
      return;
    }

    router.push(`/user/${encodeURIComponent(targetUsername)}`);
  };

  const handleCancelSession = async () => {
    if (!selectedSession?.sessionId) {
      return;
    }

    try {
      setActionError(null);
      setSuccessMessage(null);
      await cancelSessionMutation.mutateAsync(selectedSession.sessionId);
      setSelectedSession(null);
      setSuccessMessage("The session was cancelled.");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not cancel the session.",
      );
    }
  };

  const handleRescheduleSession = () => {
    if (selectedSession?.myRole !== "Mentee") {
      setActionError("Only mentees can reschedule sessions.");
      return;
    }

    if (!selectedSession.sessionId || !selectedMentorUsername) {
      setActionError(
        "Could not resolve session details. Please refresh and try again.",
      );
      return;
    }

    setRescheduleSessionId(selectedSession.sessionId);
    setRescheduleSessionMentorUsername(selectedMentorUsername);
    setRescheduleCurrentSlotId(selectedSession.id);
    setSuccessMessage(null);
    setShowRescheduleSheet(true);
  };

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      {/* 1. FIXED TOP HEADER */}
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Dashboard
          </Text>
          <NotificationBell />
        </View>
      </View>

      {/* 2. MAIN SCROLL AREA */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {queryError ? (
          <View className="mb-4">
            <ErrorBanner message={queryError} />
          </View>
        ) : null}

        {successMessage ? (
          <View className="mb-4">
            <SuccessCard message={successMessage} />
          </View>
        ) : null}

        {actionError ? (
          <View className="mb-4">
            <ErrorBanner message={actionError} />
          </View>
        ) : null}

        {/* Requests Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 mt-2">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
                Pending Requests
              </Text>
              {requests.length > 0 && (
                <View className="bg-primary rounded-full px-2 py-0.5 ml-2 justify-center items-center">
                  <Text className="text-white text-xs font-bold">
                    {requests.length}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/connections")}
            >
              <Text className="text-primary dark:text-primary-dim font-semibold text-sm">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Show the first 2 requests on the dashboard */}
          {requests.slice(0, 2).map((request) => {
            const cardProps = mapDashboardRequestToCardProps(request);
            return (
              <PendingRequestCard
                key={request.id}
                {...cardProps}
                onPress={() => setSelectedRequest(cardProps)}
                onShowProfile={() => handleOpenRequestProfile(cardProps.username)}
                onAccept={() => {
                  void handleRespond("accept", cardProps.id);
                }}
                onDecline={() => {
                  void handleRespond("reject", cardProps.id);
                }}
                disabled={respondMutation.isPending}
              />
            );
          })}
        </View>

        {/* Sessions Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 mt-2">
            <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark">
              Your Sessions
            </Text>
            <TouchableOpacity onPress={() => router.push("/schedule")}>
              <Text className="text-primary dark:text-primary-dim font-semibold text-sm">
                View All {sessions.length > 0 ? `(${sessions.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {sessions.length === 0 ? (
            <View className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark">
              <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
                No upcoming sessions yet.
              </Text>
            </View>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                user={session.user}
                date={session.date}
                time={session.time}
                status={session.status}
                onPress={() => setSelectedSession(session)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* 3. MODALS */}
      <RequestDetailSheet
        visible={selectedRequest !== null}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={() => void handleRespond("accept")}
        onDecline={() => void handleRespond("reject")}
        onShowProfile={handleOpenRequestProfile}
        disabled={respondMutation.isPending}
      />

      <SessionDetailsModal
        visible={!!selectedSession}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onCancelSession={handleCancelSession}
        onReschedule={handleRescheduleSession}
        isCancelling={cancelSessionMutation.isPending}
      />

      <RescheduleBottomSheet
        visible={showRescheduleSheet}
        onClose={() => {
          setShowRescheduleSheet(false);
          setRescheduleSessionId(null);
          setRescheduleSessionMentorUsername(null);
          setRescheduleCurrentSlotId("");
        }}
        slots={mentorAvailabilityForReschedule.data ?? []}
        isLoading={mentorAvailabilityForReschedule.isLoading}
        currentSlotId={rescheduleCurrentSlotId}
        onSelectSlot={(newSlotId: string) => {
          if (rescheduleSessionId) {
            rescheduleSessionMutation
              .mutateAsync({
                sessionId: rescheduleSessionId,
                newSlotId,
              })
              .then(() => {
                setActionError(null);
                setSuccessMessage("Your session was updated.");
                setSelectedSession(null);
                setShowRescheduleSheet(false);
              })
              .catch((error) => {
                setActionError(
                  error instanceof Error
                    ? error.message
                    : "Could not reschedule this session.",
                );
              });
          }
        }}
      />
    </View>
  );
}
