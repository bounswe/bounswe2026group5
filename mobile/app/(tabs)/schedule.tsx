/**
 * @file schedule.tsx
 * @description The main calendar and agenda view for the user's mentorship sessions.
 * @module ScheduleScreen
 */

import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import {
  type DashboardSessionItem,
  type MentorshipRequest,
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

const toSlotDateTime = (date: string, time: string): Date =>
  new Date(`${date}T${time}:00`);

const formatRescheduleOption = (slot: {
  date: string;
  startTime: string;
  endTime: string;
}): string => {
  const date = new Date(`${slot.date}T00:00:00`);
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} ${slot.startTime.slice(0, 5)}-${slot.endTime.slice(0, 5)}`;
};

function resolveRelatedRequest(
  slotRequests: MentorshipRequest[],
  role: "Mentor" | "Mentee",
  username: string,
): MentorshipRequest | undefined {
  for (const request of slotRequests) {
    if (role === "Mentor" && request.mentor.username === username) {
      return request;
    }

    if (role === "Mentee" && request.mentee.username === username) {
      return request;
    }
  }

  return undefined;
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedSession, setSelectedSession] =
    useState<ScheduleSession | null>(null);
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
    const activeMatchByRequestId = new Map(
      (mentorshipMatchesQuery.data ?? [])
        .filter((match) => match.is_active)
        .map((match) => [match.request_id, match.id]),
    );

    const requestBySlot = new Map<string, MentorshipRequest[]>();
    requests.forEach((request) => {
      if (!request.slot_id) {
        return;
      }
      const existing = requestBySlot.get(request.slot_id) ?? [];
      existing.push(request);
      requestBySlot.set(request.slot_id, existing);
    });

    const enrichSessions = (baseSessions: DashboardSessionItem[]) =>
      baseSessions.map((session) => {
        const related = resolveRelatedRequest(
          requestBySlot.get(session.id) ?? [],
          session.myRole,
          currentUsername,
        );

        return {
          ...session,
          slotId: session.id,
          requestId: related?.id ?? session.requestId,
          matchId: related ? activeMatchByRequestId.get(related.id) : undefined,
          mentorUsername: related?.mentor.username,
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

    return enrichSessions(Array.from(byKey.values())).sort((a, b) => {
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

  const rescheduleTargetMentor =
    selectedSession?.myRole === "Mentee" ? selectedSession.mentorUsername : "";
  const mentorAvailabilityForReschedule = useAvailabilitySlotsQuery(
    rescheduleTargetMentor || "",
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

      <SessionDetailsModal
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        isCancelling={
          respondToRequestMutation.isPending ||
          cancelSessionMutation.isPending ||
          rescheduleSessionMutation.isPending
        }
        onCancelSession={() => {
          if (!selectedSession) {
            return;
          }

          if (
            selectedSession.status === "Pending" &&
            selectedSession.myRole === "Mentor"
          ) {
            respondToRequestMutation
              .mutateAsync({
                requestId: selectedSession.requestId,
                action: "reject",
              })
              .then(() => {
                setSelectedSession(null);
              })
              .catch((error) => {
                Alert.alert(
                  "Cancellation Failed",
                  error instanceof Error
                    ? error.message
                    : "Could not cancel this pending session request.",
                );
              });
            return;
          }

          if (!selectedSession.matchId) {
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
          if (!selectedSession) {
            return;
          }

          if (selectedSession.myRole !== "Mentee") {
            Alert.alert("Not Allowed", "Only mentees can reschedule sessions.");
            return;
          }

          if (!selectedSession.matchId) {
            Alert.alert(
              "Cannot Reschedule",
              "Could not resolve this session's match. Please refresh and try again.",
            );
            return;
          }
          const matchId = selectedSession.matchId;

          const now = new Date();
          const candidates = (mentorAvailabilityForReschedule.data ?? [])
            .filter((slot) => !slot.is_booked)
            .filter(
              (slot) =>
                toSlotDateTime(slot.date, slot.startTime.slice(0, 5)) > now,
            )
            .filter((slot) => slot.id !== selectedSession.slotId)
            .slice(0, 6);

          if (candidates.length === 0) {
            Alert.alert(
              "No Alternative Slots",
              "No available future slots were found for this mentor.",
            );
            return;
          }

          Alert.alert("Reschedule Session", "Select a new slot:", [
            ...candidates.map((slot) => ({
              text: formatRescheduleOption(slot),
              onPress: () => {
                handleSubmitReschedule(matchId, slot.id);
              },
            })),
            { text: "Cancel", style: "cancel" },
          ]);
        }}
      />
    </SafeAreaView>
  );
}
