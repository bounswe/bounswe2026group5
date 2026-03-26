import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { SessionCard } from '@/components/dashboard/SessionCard';

// Updated Mock Data: Added 'rawDate' (YYYY-MM-DD) for the Calendar logic
const MOCK_SESSIONS = [
  { id: '1', rawDate: '2026-03-26', displayDate: 'MAR 26', time: '14:00', user: 'Zeynep Demir', status: 'Upcoming' as const },
  { id: '2', rawDate: '2026-03-26', displayDate: 'MAR 26', time: '16:30', user: 'Ahmet Yılmaz', status: 'Pending' as const },
  { id: '3', rawDate: '2026-03-28', displayDate: 'MAR 28', time: '10:00', user: 'Can Özkan', status: 'Upcoming' as const },
  { id: '4', rawDate: '2026-04-02', displayDate: 'APR 02', time: '09:00', user: 'Elif Kaya', status: 'Completed' as const },
];

export default function ScheduleScreen() {
  // 1. State: Track the currently selected date (Default to today: March 26, 2026)
  const [selectedDate, setSelectedDate] = useState('2026-03-26');

  // 2. Logic: Dynamically generate the dots for the calendar based on our data
  const markedDates = useMemo(() => {
    const marks: any = {};
    
    // Put a dot on any day that has a session
    MOCK_SESSIONS.forEach(session => {
      marks[session.rawDate] = { marked: true, dotColor: '#3b82f6' }; // Tailwind blue-500
    });

    // Highlight the currently selected day
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: '#2563eb', // Tailwind blue-600
      selectedTextColor: '#ffffff'
    };

    return marks;
  }, [selectedDate]);

  // 3. Logic: Filter the sessions for the bottom half of the screen
  const selectedSessions = MOCK_SESSIONS.filter(session => session.rawDate === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View className="px-4 pt-6 mb-6">
          <Text className="text-3xl font-extrabold text-gray-900">Schedule</Text>
          <Text className="text-base text-gray-500 mt-1">Tap a day to view your sessions.</Text>
        </View>

        {/* The Interactive Calendar Grid */}
        <View className="px-2 mb-6 shadow-sm">
          <Calendar
            current={'2026-03-26'}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#fafafa', // Matches Tailwind gray-50
              calendarBackground: '#fafafa',
              textSectionTitleColor: '#6b7280', // gray-500
              todayTextColor: '#2563eb', // blue-600
              dayTextColor: '#111827', // gray-900
              textDisabledColor: '#d1d5db', // gray-300
              monthTextColor: '#111827',
              textMonthFontWeight: 'bold',
              arrowColor: '#2563eb',
            }}
          />
        </View>

        {/* The Agenda / Filtered Sessions List */}
        <View className="px-4 mb-8">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Sessions on {selectedDate}
          </Text>

          {/* Empty State vs. Session Cards */}
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
              />
            ))
          )}
        </View>

        {/* Bottom padding */}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}