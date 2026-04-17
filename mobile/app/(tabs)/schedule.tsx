/**
 * @file schedule.tsx
 * @description The main calendar and agenda view for the user's mentorship sessions.
 * @module ScheduleScreen
 */

import { RescheduleBottomSheet } from "@/components/dashboard/RescheduleBottomSheet";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import {
  type DashboardSessionItem,
  mapMentorBookedSlotsToSessions,
  mapUpcomingSessionsToDashboard,
  useAvailabilitySlotsQuery,
  useCancelSessionMutation,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
  useMentorshipUpcomingSessionsQuery,
  useRescheduleSessionMutation,
  useRespondToMentorshipRequestMutation,
} from "@/lib/queries/mentorship";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const TODAY = new Date().toISOString().split("T")[0];

type ScheduleSession = {
  id: string;
  requestId: string;
  slotId: string;
  matchId?: string;
  mentorUsername?: string;
  rawDate: string;
  date: string;
  time: string;
  user: string;
  status: "Pending" | "Upcoming" | "Completed";
  topic: string;
  myRole: string;
  location?: string;
  meetingUrl?: string;
};

const formatFriendlyDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedSession, setSelectedSession] =
    useState<ScheduleSession | null>(null);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [rescheduleMatchId, setRescheduleMatchId] = useState<string | null>(
    null,
  );
  const [rescheduleMentorUsername, setRescheduleMentorUsername] = useState(
    "",
  );
  const [rescheduleCurrentSlotId, setRescheduleCurrentSlotId] = useState("");
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const currentUsername = useAuthStore((state) => state.user?.username);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);

  const respondToRequestMutation = useRespondToMentorshipRequestMutation();
  const cancelSessionMutation = useCancelSessionMutation(currentUsername);
  const rescheduleSessionMutation =
    useRescheduleSessionMutation(currentUsername);

  const upcomingSessionsQuery =
    useMentorshipUpcomingSessionsQuery(currentUsername);
  const mentorAvailabilityQuery = useAvailabilitySlotsQuery(
    currentUsername || "",
  );
  const mentorshipRequestsQuery = useMentorshipRequestsQuery(currentUsername);
  const mentorshipMatchesQuery = useMentorshipMatchesQuery(currentUsername);

  const isMenteeOnly = appUsageMode === "MENTEE";
  const isMentorOnly = appUsageMode === "MENTOR";

  const sessions = useMemo(() => {
    if (!currentUsername) {
      return [] as ScheduleSession[];
    }

    const requests = mentorshipRequestsQuery.data ?? [];
    const activeMatches = (mentorshipMatchesQuery.data ?? []).filter(
      (match) => match.is_active,
    );
    const activeMatchByRequestId = new Map(
      activeMatches.map((match) => [match.request_id, match.id]),
    );

    const requestBySlotId = new Map<string, typeof requests>();
    requests.forEach((request) => {
      if (!request.slot_id) {
        return;
      }
      const existing = requestBySlotId.get(request.slot_id) ?? [];
      existing.push(request);
      requestBySlotId.set(request.slot_id, existing);
    });

    const resolveFromSlot = (session: DashboardSessionItem) => {
      const slotRequests = requestBySlotId.get(session.id) ?? [];
      if (slotRequests.length === 0) {
        return undefined;
      }

      if (session.myRole === "Mentee") {
        for (const request of slotRequests) {
          if (request.mentee.username === currentUsername) {
            return request;
          }
        }
        return undefined;
      }

      for (const request of slotRequests) {
        if (request.mentor.username === currentUsername) {
          return request;
        }
      }
      return undefined;
    };

    const resolveMatchFallback = (
      session: DashboardSessionItem,
    ): string | undefined => {
      if (session.myRole === "Mentee") {
        for (const match of activeMatches) {
          if (
            match.mentee.username === currentUsername &&
            (match.mentor.display_name === session.user ||
              match.mentor.username === session.user)
          ) {
            return match.id;
          }
        }
        return undefined;
      }

      for (const match of activeMatches) {
        if (
          match.mentor.username === currentUsername &&
          (match.mentee.display_name === session.user ||
            match.mentee.username === session.user)
        ) {
          return match.id;
        }
      }
      return undefined;
    };

    const resolveMentorUsername = (
      session: DashboardSessionItem,
      relatedRequest: (typeof requests)[number] | undefined,
      matchId: string | undefined,
    ): string | undefined => {
      if (session.myRole !== "Mentee") {
        return undefined;
      }
      if (relatedRequest?.mentor.username) {
        return relatedRequest.mentor.username;
      }
      if (!matchId) {
        return undefined;
      }
      for (const match of activeMatches) {
        if (match.id === matchId) {
          return match.mentor.username;
        }
      }
      return undefined;
    };

    const enrichSessions = (baseSessions: DashboardSessionItem[]) =>
      baseSessions.map((session) => {
        const relatedRequest = resolveFromSlot(session);
        const matchId =
          (relatedRequest
            ? activeMatchByRequestId.get(relatedRequest.id)
            : undefined) ?? resolveMatchFallback(session);
        const mentorUsername = resolveMentorUsername(
          session,
          relatedRequest,
          matchId,
        );

        return {
          ...session,
          slotId: session.id,
          requestId: relatedRequest?.id ?? session.requestId,
          matchId,
          mentorUsername,
        } as ScheduleSession;
      });

    if (isMenteeOnly) {
      return enrichSessions(
        mapUpcomingSessionsToDashboard(upcomingSessionsQuery.data ?? []),
      );
    }

    if (isMentorOnly) {
      return enrichSessions(
        mapMentorBookedSlotsToSessions(
          mentorAvailabilityQuery.data ?? [],
          mentorshipMatchesQuery.data,
        ),
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

    mapMentorBookedSlotsToSessions(
      mentorAvailabilityQuery.data ?? [],
      mentorshipMatchesQuery.data,
    ).forEach((session) => {
      byKey.set(`${session.rawDate}|${session.time}|${session.user}`, session);
    });

    // For dual-role users, combine and enrich both mentee and mentor sessions
    const menteeEnriched = enrichSessions(
      Array.from(byKey.values()).filter((s) => s.myRole === "Mentee"),
    );
    const mentorEnriched = enrichSessions(
      Array.from(byKey.values()).filter((s) => s.myRole === "Mentor"),
    );

    return [...menteeEnriched, ...mentorEnriched].sort((a, b) => {
      const aKey = `${a.rawDate}T${a.time.split(" - ")[0] ?? "00:00"}`;
      const bKey = `${b.rawDate}T${b.time.split(" - ")[0] ?? "00:00"}`;
      return aKey.localeCompare(bKey);
    });
  }, [
    currentUsername,
    isMenteeOnly,
    isMentorOnly,
    upcomingSessionsQuery.data,
    mentorAvailabilityQuery.data,
    mentorshipRequestsQuery.data,
    mentorshipMatchesQuery.data,
  ]);

  const mentorAvailabilityForReschedule = useAvailabilitySlotsQuery(
    rescheduleMentorUsername,
  );

  const handleSubmitReschedule = (matchId: string, newSlotId: string): void => {
    rescheduleSessionMutation
      .mutateAsync({
        matchId,
        newSlotId,
      })
      .then(() => {
        setSelectedSession(null);
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
  };

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      {
        dots: { key: string; color: string }[];
        selected?: boolean;
        selectedColor?: string;
      }
    > = {};

    sessions.forEach((session) => {
      if (!marks[session.rawDate]) {
        marks[session.rawDate] = { dots: [] };
      }

      let dotColor = "#9ca3af";
      if (session.status === "Upcoming") {
        dotColor = "#10b981";
      } else if (session.status === "Pending") {
        dotColor = "#f59e0b";
      }

      marks[session.rawDate].dots.push({ key: session.id, color: dotColor });
    });

    if (!marks[selectedDate]) {
      marks[selectedDate] = { dots: [] };
    }

    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: theme.primary,
    };

    return marks;
  }, [selectedDate, sessions, theme.primary]);

  const selectedSessions = sessions.filter(
    (session) => session.rawDate === selectedDate,
  );

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["left", "right", "bottom"]}
    >
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Schedule
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 pt-4" showsVerticalScrollIndicator={false}>
        <View className="mx-4 mb-6 shadow-sm rounded-2xl border border-divider dark:border-divider-dark bg-surface-card dark:bg-surface-card-dark p-2">
          <Calendar
            current={TODAY}
            markingType="multi-dot"
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.cardBackground,
              calendarBackground: theme.cardBackground,
              textSectionTitleColor: theme.textMuted,
              todayTextColor: theme.primary,
              dayTextColor: theme.textPrimary,
              textDisabledColor: theme.divider,
              monthTextColor: theme.textPrimary,
              textMonthFontWeight: "bold",
              arrowColor: theme.primary,
            }}
          />
        </View>

        <View className="px-4 mb-8">
          <Text className="text-xl font-bold text-on-surface dark:text-on-surface-dark mb-4">
            Sessions on {formatFriendlyDate(selectedDate)}
          </Text>

          {selectedSessions.length === 0 ? (
            <View className="bg-surface-card dark:bg-surface-card-dark p-6 rounded-xl border border-divider dark:border-divider-dark items-center justify-center">
              <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
                No sessions scheduled for this day.
              </Text>
            </View>
          ) : (
            selectedSessions.map((session) => (
              <SessionCard
                key={session.id}
                user={session.user}
                date={session.date}
                time={session.time}
                status={session.status}
                onPress={() =>
                  setSelectedSession({
                    ...session,
                    date: formatFriendlyDate(session.rawDate),
                  })
                }
              />
            ))
          )}
        </View>
        <View className="h-20" />
      </ScrollView>

      <RescheduleBottomSheet
        visible={showRescheduleSheet}
        onClose={() => {
          setShowRescheduleSheet(false);
          setRescheduleMatchId(null);
          setRescheduleMentorUsername("");
          setRescheduleCurrentSlotId("");
        }}
        slots={mentorAvailabilityForReschedule.data ?? []}
        isLoading={mentorAvailabilityForReschedule.isLoading}
        currentSlotId={rescheduleCurrentSlotId}
        onSelectSlot={(newSlotId) => {
          if (rescheduleMatchId) {
            handleSubmitReschedule(rescheduleMatchId, newSlotId);
          }
        }}
      />

      <SessionDetailsModal
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        isCancelling={
          cancelSessionMutation.isPending ||
          rescheduleSessionMutation.isPending
        }
        onCancelSession={() => {
          if (!selectedSession?.matchId) {
            Alert.alert(
              "Cannot Cancel",
              "Could not resolve this session's match. Please refresh and try again.",
            );
            return;
          }

          cancelSessionMutation
            .mutateAsync(selectedSession.matchId)
            .then(() => {
              setSelectedSession(null);
              Alert.alert("Session Cancelled", "The session was cancelled.");
            })
            .catch((error) => {
              Alert.alert(
                "Cancellation Failed",
                error instanceof Error
                  ? error.message
                  : "Could not cancel this session.",
              );
            });
        }}
        onReschedule={() => {
          if (!selectedSession) return;

          if (selectedSession.myRole !== "Mentee") {
            Alert.alert("Not Allowed", "Only mentees can reschedule sessions.");
            return;
          }

          const mentorUsername =
            selectedSession.mentorUsername ??
            (mentorshipMatchesQuery.data ?? []).find(
              (m) => m.id === selectedSession.matchId,
            )?.mentor.username;

          if (!selectedSession.matchId || !mentorUsername) {
            Alert.alert(
              "Cannot Reschedule",
              "Could not resolve session details. Please refresh and try again.",
            );
            return;
          }

          setRescheduleMatchId(selectedSession.matchId);
          setRescheduleMentorUsername(mentorUsername);
          setRescheduleCurrentSlotId(selectedSession.slotId);
          setShowRescheduleSheet(true);
        }}
      />

    </SafeAreaView>
  );
}
