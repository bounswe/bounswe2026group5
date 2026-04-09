import { useMemo, useState } from "react";
import { Alert, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Import the components for the dashboard
import { RequestCard } from "@/components/dashboard/RequestCard";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { RequestDetailsModal } from "@/components/dashboard/RequestDetailsModal";

import {
  mapMatchesToSessions,
  mapUpcomingSessionsToDashboard,
  mapRequestsToDashboard,
  useMentorshipMatchesQuery,
  useMentorshipUpcomingSessionsQuery,
  useMentorshipRequestsQuery,
  useRespondToMentorshipRequestMutation,
  type DashboardRequestItem,
  type DashboardSessionItem,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const currentUsername = useAuthStore((state) => state.user?.username);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const upcomingSessionsQuery =
    useMentorshipUpcomingSessionsQuery(currentUsername);
  const respondMutation = useRespondToMentorshipRequestMutation();

  const isMenteeOnly = appUsageMode === "MENTEE";
  const isMentorOnly = appUsageMode === "MENTOR";

  // Debug logging
  const requests = useMemo<DashboardRequestItem[]>(() => {
    if (requestsQuery.data && currentUsername) {
      return mapRequestsToDashboard(requestsQuery.data, currentUsername);
    }
    return [];
  }, [
    requestsQuery.data,
    requestsQuery.isLoading,
    requestsQuery.error,
    currentUsername,
  ]);

  const sessions = useMemo(() => {
    if (!currentUsername) {
      return [];
    }

    if (isMenteeOnly) {
      return mapUpcomingSessionsToDashboard(upcomingSessionsQuery.data ?? []);
    }

    if (isMentorOnly) {
      return mapMatchesToSessions(
        requestsQuery.data ?? [],
        matchesQuery.data ?? [],
        currentUsername,
      );
    }

    const byKey = new Map<string, DashboardSessionItem>();

    mapUpcomingSessionsToDashboard(upcomingSessionsQuery.data ?? []).forEach(
      (session) => {
        byKey.set(
          `${session.rawDate}|${session.time}|${session.user}`,
          session,
        );
      },
    );

    mapMatchesToSessions(
      requestsQuery.data ?? [],
      matchesQuery.data ?? [],
      currentUsername,
    ).forEach((session) => {
      byKey.set(`${session.rawDate}|${session.time}|${session.user}`, session);
    });

    return Array.from(byKey.values()).sort((a, b) => {
      const aKey = `${a.rawDate}T${a.time.split(" - ")[0] ?? "00:00"}`;
      const bKey = `${b.rawDate}T${b.time.split(" - ")[0] ?? "00:00"}`;
      return aKey.localeCompare(bKey);
    });
  }, [
    currentUsername,
    appUsageMode,
    isMenteeOnly,
    isMentorOnly,
    upcomingSessionsQuery.data,
    requestsQuery.data,
    matchesQuery.data,
  ]);

  // State for Modals
  const [selectedRequest, setSelectedRequest] =
    useState<DashboardRequestItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<
    (typeof sessions)[0] | null
  >(null);

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
      matchesQuery.refetch();
      upcomingSessionsQuery.refetch();
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

    router.push(`/mentor/${encodeURIComponent(targetUsername)}`);
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
        onViewProfile={
          selectedRequest
            ? () => handleOpenRequestProfile(selectedRequest)
            : undefined
        }
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
        onReschedule={() => {
          Alert.alert(
            "Coming Soon",
            "Rescheduling will be wired after the dedicated API endpoint is finalized.",
          );
        }}
      />
    </View>
  );
}
