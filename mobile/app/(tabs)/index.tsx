import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import { useToast } from "@/components/ui/ToastProvider";

import { useAuthStore } from "@/lib/auth/store";
import { useAutoClearMessage } from "@/hooks/use-auto-clear-message";
import { useRefreshControl } from "@/hooks/use-refresh-control";
import {
  MENTOR_MENTEE_CAPACITY_WARNING,
  shouldWarnBeforeAcceptingMentee,
} from "@/lib/mentorship/capacity";
import { useResendEmailVerificationMutation } from "@/lib/queries/auth";
import {
  mapMeetingSessionsToDashboard,
  mapRequestsToDashboard,
  useAvailabilitySlotsQuery,
  useCancelSessionMutation,
  useMentorshipMatchesQuery,
  useMentorshipMeetingSessionsQuery,
  useMentorshipRequestsQuery,
  useRescheduleSessionMutation,
  useRespondToMentorshipRequestMutation,
  type DashboardRequestItem,
  type DashboardSessionItem,
} from "@/lib/queries/mentorship";
import {
  mapWorkshopAttendanceToDashboard,
  useMyWorkshopAttendanceQuery,
  type WorkshopDashboardItem,
} from "@/lib/queries/workshops";

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
  const toast = useToast();

  const currentUsername = useAuthStore((state) => state.user?.username);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const isEmailVerified = useAuthStore(
    (state) => state.user?.is_email_verified,
  );

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const meetingSessionsQuery = useMentorshipMeetingSessionsQuery(
    currentUsername,
    { status: "upcoming" },
  );
  const workshopAttendanceQuery = useMyWorkshopAttendanceQuery(currentUsername, {
    status: "attending",
  });
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const respondMutation = useRespondToMentorshipRequestMutation();
  const cancelSessionMutation = useCancelSessionMutation(currentUsername);
  const rescheduleSessionMutation =
    useRescheduleSessionMutation(currentUsername);
  const resendVerificationMutation = useResendEmailVerificationMutation();

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
  const workshops = useMemo(
    () =>
      mapWorkshopAttendanceToDashboard(
        workshopAttendanceQuery.data?.results ?? [],
        currentUsername,
      ).filter(
        (workshop) =>
          workshop.workshopStatus === "SCHEDULED" &&
          workshop.status === "Upcoming",
      ),
    [currentUsername, workshopAttendanceQuery.data?.results],
  );
  const sessionItems = useMemo(
    () =>
      [
        ...sessions.map((session) => ({
          kind: "session" as const,
          ...session,
        })),
        ...workshops.map((workshop) => ({
          kind: "workshop" as const,
          ...workshop,
        })),
      ].sort(
        (left, right) =>
          new Date(left.rawDate).getTime() - new Date(right.rawDate).getTime(),
      ),
    [sessions, workshops],
  );
  const activeMenteeCount = useMemo(() => {
    if (appUsageMode !== "MENTOR") {
      return 0;
    }

    return new Set(
      (matchesQuery.data ?? [])
        .filter((match) => match.is_active !== false)
        .map((match) => match.mentee.username),
    ).size;
  }, [appUsageMode, matchesQuery.data]);
  const shouldShowCapacityWarning =
    shouldWarnBeforeAcceptingMentee(activeMenteeCount);
  const queryError =
    (requestsQuery.isError && "Failed to load mentorship requests.") ||
    (meetingSessionsQuery.isError && "Failed to load upcoming sessions.") ||
    (workshopAttendanceQuery.isError &&
      "Failed to load your upcoming workshops.") ||
    null;

  // State for Modals
  const [selectedRequest, setSelectedRequest] =
    useState<PendingRequestCardProps | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<DashboardSessionItem | null>(null);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useAutoClearMessage(successMessage, setSuccessMessage);
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

  const openWorkshop = (workshop: WorkshopDashboardItem) => {
    router.push(
      `/(tabs)/community/${encodeURIComponent(workshop.communityId)}/workshops/${encodeURIComponent(workshop.workshopId)}?from=dashboard`,
    );
  };

  const handleRequestCardAccept = (cardProps: PendingRequestCardProps) => {
    if (
      cardProps.requestType !== "outgoing" &&
      appUsageMode === "MENTOR" &&
      shouldShowCapacityWarning
    ) {
      setSelectedRequest(cardProps);
      return;
    }

    void handleRespond("accept", cardProps.id);
  };

  const handleResendVerification = async () => {
    try {
      setActionError(null);
      setSuccessMessage(null);
      const response = await resendVerificationMutation.mutateAsync();
      setSuccessMessage(response.detail);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not send verification email.",
      );
    }
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
      toast.success("The session was cancelled.");
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

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      requestsQuery.refetch(),
      meetingSessionsQuery.refetch(),
      workshopAttendanceQuery.refetch(),
      matchesQuery.refetch(),
    ]);
  }, [matchesQuery, meetingSessionsQuery, requestsQuery, workshopAttendanceQuery]);

  const { refreshing, onRefresh } = useRefreshControl(refreshDashboard);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {queryError ? (
          <View className="mb-4">
            <ErrorBanner message={queryError} />
          </View>
        ) : null}

        {isEmailVerified === false ? (
          <View className="mb-4" testID="email-verification-warning">
            <ErrorBanner
              variant="warning"
              title="Verify your email"
              message="Verify your email to access mentorship requests and all account features."
            />
            <TouchableOpacity
              testID="resend-verification-button"
              activeOpacity={0.85}
              disabled={resendVerificationMutation.isPending}
              onPress={() => {
                void handleResendVerification();
              }}
              className="self-start mt-2 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-900/60"
            >
              <Text className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {resendVerificationMutation.isPending
                  ? "Sending..."
                  : "Resend Verification Email"}
              </Text>
            </TouchableOpacity>
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
                onAccept={() => handleRequestCardAccept(cardProps)}
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
            <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}>
              <Text className="text-primary dark:text-primary-dim font-semibold text-sm">
                View All {sessionItems.length > 0 ? `(${sessionItems.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {sessionItems.length === 0 ? (
            <View className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark">
              <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
                No upcoming sessions or workshops yet.
              </Text>
            </View>
          ) : (
            sessionItems.map((session) => (
              <SessionCard
                key={session.id}
                user={session.user}
                date={session.date}
                time={session.time}
                status={session.status}
                title={
                  session.kind === "workshop" ? session.topic : undefined
                }
                subtitle={
                  session.kind === "workshop" ? session.communityName : undefined
                }
                kindLabel={session.kind === "workshop" ? "Workshop" : undefined}
                onPress={() => {
                  if (session.kind === "workshop") {
                    openWorkshop(session);
                    return;
                  }

                  setSelectedSession(session);
                }}
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
        acceptanceWarning={
          selectedRequest?.requestType !== "outgoing" &&
          appUsageMode === "MENTOR" &&
          shouldShowCapacityWarning
            ? MENTOR_MENTEE_CAPACITY_WARNING
            : undefined
        }
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
                mentorUsername: rescheduleSessionMentorUsername ?? undefined,
              })
              .then(() => {
                setActionError(null);
                toast.success("Your session was updated.");
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
