/**
 * @file schedule.tsx
 * @description The main calendar and agenda view for the user's mentorship sessions.
 * @module ScheduleScreen
 */

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { SessionCard } from '@/components/dashboard/SessionCard';
import { SessionDetailsModal } from '@/components/dashboard/SessionDetailsModal';

// TODO: [Backend] Replace MOCK_SESSIONS with TanStack Query fetching from /api/sessions
// Ensure the backend returns dates in ISO format (YYYY-MM-DD) for the calendar engine.
const MOCK_SESSIONS = [
  { id: '1', rawDate: '2026-03-26', displayDate: 'MAR 26', time: '14:00', user: 'Zeynep Demir', status: 'Upcoming' as const, topic: 'React Native Architecture', myRole: 'Mentor', meetingUrl: 'https://zoom.us/j/12345' },
  { id: '2', rawDate: '2026-03-26', displayDate: 'MAR 26', time: '16:30', user: 'Ahmet Yılmaz', status: 'Pending' as const, topic: 'System Design Interview Prep', myRole: 'Mentee', location: 'Campus Library, Room 4B' },
  { id: '3', rawDate: '2026-03-28', displayDate: 'MAR 28', time: '10:00', user: 'Can Özkan', status: 'Upcoming' as const, topic: 'Database Normalization', myRole: 'Mentor', location: 'Neighborhood Cafe' },
  { id: '4', rawDate: '2026-04-02', displayDate: 'APR 02', time: '09:00', user: 'Elif Kaya', status: 'Completed' as const, topic: 'Career Advice', myRole: 'Mentee', meetingUrl: 'https://meet.google.com/abc' },
];

/**
 * Helper function to convert "2026-03-26" into a human-readable "March 26, 2026"
 * TODO: [Shared] Move this to a shared/utils/date.ts file later for cross-platform use.
 */
const formatFriendlyDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ScheduleScreen() {
  // States
  const [selectedDate, setSelectedDate] = useState('2026-03-26');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  /**
   * Generates the multi-dot markings for the calendar grid.
   * Memoized to prevent heavy calendar re-renders unless the selected date changes.
   */
  const markedDates = useMemo(() => {
    const marks: any = {};
    
    // 1. Group sessions by date and assign colored dots based on status
    MOCK_SESSIONS.forEach(session => {
      if (!marks[session.rawDate]) {
        marks[session.rawDate] = { dots: [] };
      }
      
      // Map status to our Tailwind color palette
      const dotColor = session.status === 'Upcoming' ? '#10b981' // emerald-500
                     : session.status === 'Pending' ? '#f59e0b'  // amber-500
                     : '#9ca3af';                                // gray-400

      marks[session.rawDate].dots.push({ key: session.id, color: dotColor });
    });

    // 2. Apply the "Selected" styling to whatever day the user tapped
    if (!marks[selectedDate]) {
      marks[selectedDate] = { dots: [] };
    }
    
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: '#2563eb', // blue-600
    };

    return marks;
  }, [selectedDate]);

  // Filter sessions to only show those matching the selected calendar day
  const selectedSessions = MOCK_SESSIONS.filter(session => session.rawDate === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View className="px-4 pt-6 mb-6">
          <Text className="text-3xl font-extrabold text-gray-900">Schedule</Text>
          <Text className="text-base text-gray-500 mt-1">Manage your agenda.</Text>
        </View>

        {/* Calendar Grid Section */}
        <View className="px-2 mb-6 shadow-sm">
          <Calendar
            current={'2026-03-26'}
            markingType={'multi-dot'} // ENABLES MULTIPLE EVENT INDICATORS
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#fafafa',
              calendarBackground: '#fafafa',
              textSectionTitleColor: '#6b7280',
              todayTextColor: '#2563eb',
              dayTextColor: '#111827',
              textDisabledColor: '#d1d5db',
              monthTextColor: '#111827',
              textMonthFontWeight: 'bold',
              arrowColor: '#2563eb',
            }}
          />
        </View>

        {/* Dynamic Agenda Section */}
        <View className="px-4 mb-8">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Sessions on {formatFriendlyDate(selectedDate)}
          </Text>

          {selectedSessions.length === 0 ? (
            <View className="bg-white p-6 rounded-xl border border-gray-100 items-center justify-center">
              <Text className="text-gray-400 font-medium">No sessions scheduled for this day.</Text>
            </View>
          ) : (
            selectedSessions.map(session => (
              <SessionCard 
                key={session.id} 
                user={session.user}
                date={session.displayDate}
                time={session.time}
                status={session.status}
                onPress={() => setSelectedSession({
                  user: session.user,
                  date: formatFriendlyDate(session.rawDate), 
                  time: session.time,
                  status: session.status,
                  topic: session.topic,
                  myRole: session.myRole, 
                  location: session.location,
                  meetingUrl: session.meetingUrl
                })}
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
        />

    </SafeAreaView>
  );
}