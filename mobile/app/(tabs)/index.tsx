import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import the components for the dashboard
import { RequestCard } from "@/components/dashboard/RequestCard";
import { RequestDetailsModal } from "@/components/dashboard/RequestDetailsModal";
import { RescheduleBottomSheet } from "@/components/dashboard/RescheduleBottomSheet";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

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

  // State for Modals
  const [selectedRequest, setSelectedRequest] =
    useState<DashboardRequestItem | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<DashboardSessionItem | null>(null);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [rescheduleMatchId, setRescheduleMatchId] = useState<string | null>(
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

  const handleRespond = async (action: "accept" | "reject") => {
    if (!selectedRequest) {
      return;
    }

    try {
      await respondMutation.mutateAsync({
        requestId: selectedRequest.requestId,
        action,
      });
      setSelectedRequest(null);
      requestsQuery.refetch();
      meetingSessionsQuery.refetch();
    } catch (error) {
      Alert.alert(
        "Request Action Failed",
        error instanceof Error
          ? error.message
          : "Could not update request status.",
      );
    }
  };

  const handleOpenRequestProfile = (request: DashboardRequestItem) => {
    const targetUsername =
      request.type === "incoming"
        ? request.menteeUsername
        : request.mentorUsername;

    if (!targetUsername) {
      return;
    }

    router.push(`/user/${encodeURIComponent(targetUsername)}`);
  };

  const handleCancelSession = async () => {
    if (!selectedSession?.matchId) {
      return;
    }

    try {
      await cancelSessionMutation.mutateAsync(selectedSession.matchId);
      setSelectedSession(null);
      Alert.alert("Session Cancelled", "The session was cancelled.");
    } catch (error) {
      Alert.alert(
        "Cancel Failed",
        error instanceof Error
          ? error.message
          : "Could not cancel the session.",
      );
    }
  };

  const handleRescheduleSession = () => {
    if (selectedSession?.myRole !== "Mentee") {
      Alert.alert("Not Available", "Only mentees can reschedule sessions.");
      return;
    }

    if (!selectedSession.matchId || !selectedMentorUsername) {
      Alert.alert(
        "Cannot Reschedule",
        "Could not resolve session details. Please refresh and try again.",
      );
      return;
    }

    setRescheduleMatchId(selectedSession.matchId);
    setRescheduleSessionMentorUsername(selectedMentorUsername);
    setRescheduleCurrentSlotId(selectedSession.id);
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
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.textSoft}
          />
        </View>
      </View>

      {/* 2. MAIN SCROLL AREA */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
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
          {requests.slice(0, 2).map((req) => (
            <RequestCard
              key={req.id}
              user={req.user}
              topic={req.topic}
              type={req.type}
              onPress={() => setSelectedRequest(req)}
              onShowProfile={() => handleOpenRequestProfile(req)}
            />
          ))}
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
      <RequestDetailsModal
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={() => handleRespond("accept")}
        onReject={() => handleRespond("reject")}
        onCancelOutgoing={() => {
          Alert.alert(
            "Not Supported Yet",
            "Outgoing request cancellation is not available on the current API.",
          );
        }}
        isSubmitting={respondMutation.isPending}
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
          setRescheduleMatchId(null);
          setRescheduleSessionMentorUsername(null);
          setRescheduleCurrentSlotId("");
        }}
        slots={mentorAvailabilityForReschedule.data ?? []}
        isLoading={mentorAvailabilityForReschedule.isLoading}
        currentSlotId={rescheduleCurrentSlotId}
        onSelectSlot={(newSlotId: string) => {
          if (rescheduleMatchId) {
            rescheduleSessionMutation
              .mutateAsync({
                matchId: rescheduleMatchId,
                newSlotId,
              })
              .then(() => {
                setSelectedSession(null);
                setShowRescheduleSheet(false);
                Alert.alert("Session Rescheduled", "Your session was updated.");
              })
              .catch((error) => {
                Alert.alert(
                  "Reschedule Failed",
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
