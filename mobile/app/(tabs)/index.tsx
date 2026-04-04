import React, { useMemo, useState } from "react";
import { Alert, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Import the components for the dashboard
import { RequestCard } from "@/components/dashboard/RequestCard";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { RequestDetailsModal } from "@/components/dashboard/RequestDetailsModal";
import { ViewAllRequestsModal } from "@/components/dashboard/ViewAllRequestsModal";

import {
  mapMatchesToSessions,
  mapRequestsToDashboard,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
  useRespondToMentorshipRequestMutation,
  type DashboardRequestItem,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentUsername = useAuthStore((state) => state.user?.username);

  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const respondMutation = useRespondToMentorshipRequestMutation();

  // Debug logging
  React.useEffect(() => {
    console.log("[Dashboard] Auth State:", {
      username: currentUsername,
      requestsLoading: requestsQuery.isLoading,
      requestsError: requestsQuery.error?.message,
      requestsData: requestsQuery.data?.length,
      matchesLoading: matchesQuery.isLoading,
      matchesError: matchesQuery.error?.message,
      matchesData: matchesQuery.data?.length,
    });
  }, [
    currentUsername,
    requestsQuery.isLoading,
    requestsQuery.error,
    requestsQuery.data,
    matchesQuery.isLoading,
    matchesQuery.error,
    matchesQuery.data,
  ]);

  const requests = useMemo<DashboardRequestItem[]>(() => {
    if (requestsQuery.data && currentUsername) {
      const mapped = mapRequestsToDashboard(
        requestsQuery.data,
        currentUsername,
      );
      console.log("[Dashboard] Mapped requests from backend:", mapped.length);
      return mapped;
    }

    if (requestsQuery.isLoading) {
      console.log("[Dashboard] Requests loading...");
      return [];
    }

    if (requestsQuery.error) {
      console.log("[Dashboard] Requests error:", requestsQuery.error.message);
    }

    return [];
  }, [
    requestsQuery.data,
    requestsQuery.isLoading,
    requestsQuery.error,
    currentUsername,
  ]);

  const sessions = useMemo(() => {
    if (!currentUsername || !requestsQuery.data || !matchesQuery.data) {
      return [];
    }

    return mapMatchesToSessions(
      requestsQuery.data,
      matchesQuery.data,
      currentUsername,
    );
  }, [currentUsername, requestsQuery.data, matchesQuery.data]);

  // State for Modals
  const [selectedRequest, setSelectedRequest] =
    useState<DashboardRequestItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<
    (typeof sessions)[0] | null
  >(null);
  const [isViewAllRequestsOpen, setViewAllRequestsOpen] = useState(false);

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
    } catch (error) {
      Alert.alert(
        "Request Action Failed",
        error instanceof Error
          ? error.message
          : "Could not update request status.",
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* 1. FIXED TOP HEADER */}
      <View
        className="bg-white z-10 shadow-sm border-b border-gray-100"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-gray-900">
            Dashboard
          </Text>
          <Ionicons name="notifications-outline" size={24} color="#4b5563" />
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
              <Text className="text-lg font-bold text-gray-900">
                Pending Requests
              </Text>
              {requests.length > 0 && (
                <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2 justify-center items-center">
                  <Text className="text-white text-xs font-bold">
                    {requests.length}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setViewAllRequestsOpen(true)}>
              <Text className="text-indigo-600 font-semibold text-sm">
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
            />
          ))}
        </View>

        {/* Sessions Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 mt-2">
            <Text className="text-lg font-bold text-gray-900">
              Your Sessions
            </Text>
            <TouchableOpacity onPress={() => router.push("/schedule")}>
              <Text className="text-blue-600 font-semibold text-sm">
                View All {sessions.length > 0 ? `(${sessions.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {sessions.length === 0 ? (
            <View className="bg-white p-4 rounded-xl border border-gray-100">
              <Text className="text-gray-500 font-medium">
                No sessions yet. Session data will appear when the backend
                sessions endpoint is wired.
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
        onReschedule={() => {
          Alert.alert(
            "Coming Soon",
            "Rescheduling will be wired after the dedicated API endpoint is finalized.",
          );
        }}
      />

      <ViewAllRequestsModal
        visible={isViewAllRequestsOpen}
        requests={requests}
        onClose={() => setViewAllRequestsOpen(false)}
        onSelectRequest={(req: DashboardRequestItem) => {
          setViewAllRequestsOpen(false);
          setTimeout(() => setSelectedRequest(req), 300);
        }}
      />
    </View>
  );
}
