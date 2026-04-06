/**
 * @file schedule.tsx
 * @description The main calendar and agenda view for the user's mentorship sessions.
 * @module ScheduleScreen
 */

import React, { useState, useMemo } from "react";
import { Alert, View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import {
  type DashboardSessionItem,
  mapMatchesToSessions,
  mapUpcomingSessionsToDashboard,
  useMentorshipMatchesQuery,
  useMentorshipRequestsQuery,
  useMentorshipUpcomingSessionsQuery,
} from "@/lib/queries/mentorship";
import { useAuthStore } from "@/lib/auth/store";

// This grabs today's date dynamically and formats it as 'YYYY-MM-DD'
const TODAY = new Date().toISOString().split("T")[0];

const formatFriendlyDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

type ScheduleSession = {
  id: string;
  requestId: string;
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

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedSession, setSelectedSession] =
    useState<ScheduleSession | null>(null);
  const currentUsername = useAuthStore((state) => state.user?.username);
  const appUsageMode = useAuthStore((state) => state.user?.app_usage_mode);
  const requestsQuery = useMentorshipRequestsQuery(currentUsername);
  const matchesQuery = useMentorshipMatchesQuery(currentUsername);
  const upcomingSessionsQuery = useMentorshipUpcomingSessionsQuery(currentUsername);

  const isMenteeOnly = appUsageMode === "MENTEE";
  const isMentorOnly = appUsageMode === "MENTOR";

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
        byKey.set(`${session.rawDate}|${session.time}|${session.user}`, session);
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

  const markedDates = useMemo(() => {
    const marks: any = {};
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

    if (!marks[selectedDate]) marks[selectedDate] = { dots: [] };

    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: "#2563eb",
    };

    return marks;
  }, [selectedDate, sessions]);

  const selectedSessions = sessions.filter(
    (session) => session.rawDate === selectedDate,
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6 mb-6">
          <Text className="text-3xl font-extrabold text-gray-900">
            Schedule
          </Text>
          <Text className="text-base text-gray-500 mt-1">
            Manage your agenda.
          </Text>
        </View>

        <View className="px-2 mb-6 shadow-sm">
          <Calendar
            current={TODAY}
            markingType={"multi-dot"}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: "#fafafa",
              calendarBackground: "#fafafa",
              textSectionTitleColor: "#6b7280",
              todayTextColor: "#2563eb",
              dayTextColor: "#111827",
              textDisabledColor: "#d1d5db",
              monthTextColor: "#111827",
              textMonthFontWeight: "bold",
              arrowColor: "#2563eb",
            }}
          />
        </View>

        <View className="px-4 mb-8">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Sessions on {formatFriendlyDate(selectedDate)}
          </Text>

          {selectedSessions.length === 0 ? (
            <View className="bg-white p-6 rounded-xl border border-gray-100 items-center justify-center">
              <Text className="text-gray-400 font-medium">
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
                    id: session.id,
                    requestId: session.requestId,
                    user: session.user,
                    date: formatFriendlyDate(session.rawDate),
                    rawDate: session.rawDate,
                    time: session.time,
                    status: session.status,
                    topic: session.topic,
                    myRole: session.myRole,
                  })
                }
              />
            ))
          )}
        </View>
        <View className="h-20" />
      </ScrollView>

      {/* The Session Details Modal */}
      <SessionDetailsModal
        visible={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        onReschedule={() => {
          Alert.alert(
            "Coming Soon",
            "Rescheduling will be wired after the dedicated API endpoint is finalized.",
          );
        }}
      />
    </SafeAreaView>
  );
}
