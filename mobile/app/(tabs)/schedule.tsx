/**
 * @file schedule.tsx
 * @description The main calendar and agenda view for the user's mentorship sessions.
 * @module ScheduleScreen
 */

import { RescheduleBottomSheet } from "@/components/dashboard/RescheduleBottomSheet";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/lib/auth/store";
import {
  mapMeetingSessionsToDashboard,
  useAvailabilitySlotsQuery,
  useCancelSessionMutation,
  useMentorshipMeetingSessionsQuery,
  useRescheduleSessionMutation,
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
  sessionId?: string;
  mentorUsername?: string;
  rawDate: string;
  date: string;
  time: string;
  user: string;
  status: "Pending" | "Upcoming" | "Completed";
  topic: string;
  myRole: string;
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(
    null,
  );
  const [rescheduleMentorUsername, setRescheduleMentorUsername] = useState("");
  const [rescheduleCurrentSlotId, setRescheduleCurrentSlotId] = useState("");
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const currentUsername = useAuthStore((state) => state.user?.username);
  const cancelSessionMutation = useCancelSessionMutation(currentUsername);
  const rescheduleSessionMutation =
    useRescheduleSessionMutation(currentUsername);

  const meetingSessionsQuery = useMentorshipMeetingSessionsQuery(
    currentUsername,
    { status: "upcoming" },
  );

  const sessions = useMemo(
    () =>
      mapMeetingSessionsToDashboard(meetingSessionsQuery.data ?? []).map(
        (session) =>
          ({
            ...session,
            slotId: session.id,
          }) as ScheduleSession,
      ),
    [meetingSessionsQuery.data],
  );
  const queryError = meetingSessionsQuery.isError
    ? "Failed to load upcoming sessions."
    : null;

  const mentorAvailabilityForReschedule = useAvailabilitySlotsQuery(
    rescheduleMentorUsername,
  );

  const handleSubmitReschedule = (sessionId: string, newSlotId: string): void => {
    rescheduleSessionMutation
      .mutateAsync({
        sessionId,
        newSlotId,
      })
      .then(() => {
        setActionError(null);
        setSelectedSession(null);
        setShowRescheduleSheet(false);
        setRescheduleSessionId(null);
        setRescheduleMentorUsername("");
        setRescheduleCurrentSlotId("");
        Alert.alert("Session Rescheduled", "Your session was updated.");
      })
      .catch((error) => {
        setActionError(
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
        {queryError ? (
          <View className="px-4 mb-4">
            <ErrorBanner message={queryError} />
          </View>
        ) : null}

        {actionError ? (
          <View className="px-4 mb-4">
            <ErrorBanner message={actionError} />
          </View>
        ) : null}

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
          setRescheduleSessionId(null);
          setRescheduleMentorUsername("");
          setRescheduleCurrentSlotId("");
        }}
        slots={mentorAvailabilityForReschedule.data ?? []}
        isLoading={mentorAvailabilityForReschedule.isLoading}
        currentSlotId={rescheduleCurrentSlotId}
        onSelectSlot={(newSlotId) => {
          if (rescheduleSessionId) {
            handleSubmitReschedule(rescheduleSessionId, newSlotId);
          }
        }}
      />

      <SessionDetailsModal
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        isCancelling={
          cancelSessionMutation.isPending || rescheduleSessionMutation.isPending
        }
        onCancelSession={() => {
          if (!selectedSession?.sessionId) {
            setActionError(
              "Could not resolve this session's match. Please refresh and try again.",
            );
            return;
          }

          cancelSessionMutation
            .mutateAsync(selectedSession.sessionId)
            .then(() => {
              setActionError(null);
              setSelectedSession(null);
              Alert.alert("Session Cancelled", "The session was cancelled.");
            })
            .catch((error) => {
              setActionError(
                error instanceof Error
                  ? error.message
                  : "Could not cancel this session.",
              );
            });
        }}
        onReschedule={() => {
          if (!selectedSession) return;

          if (selectedSession.myRole !== "Mentee") {
            setActionError("Only mentees can reschedule sessions.");
            return;
          }

          const mentorUsername = selectedSession.mentorUsername;

          if (!selectedSession.sessionId || !mentorUsername) {
            setActionError(
              "Could not resolve session details. Please refresh and try again.",
            );
            return;
          }

          setRescheduleSessionId(selectedSession.sessionId);
          setRescheduleMentorUsername(mentorUsername);
          setRescheduleCurrentSlotId(selectedSession.slotId);
          setShowRescheduleSheet(true);
        }}
        onLeaveFeedback={() => {
          // Navigate to feedback screen or show feedback modal
          setSelectedSession(null);
          Alert.alert(
            "Leave Feedback",
            "Feedback submission feature coming soon.",
          );
        }}
      />
    </SafeAreaView>
  );
}
