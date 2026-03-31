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
import { BookingModal } from '@/components/profile/BookingModal'; 

// Mock availability specifically for the reschedule flow (All will be removed once we have real data)
const MOCK_AVAILABILITY = [
  { day: "Monday", times: ["10:00 - 12:00", "15:00 - 17:00"] },
  { day: "Wednesday", times: ["14:00 - 18:00"] },
];

const MOCK_SESSIONS = [
  { id: '1', rawDate: '2026-03-26', displayDate: 'MAR 26', time: '14:00 - 15:00', user: 'Zeynep Demir', status: 'Upcoming' as const, topic: 'React Native Architecture', myRole: 'Mentor', meetingUrl: 'https://zoom.us/j/12345' },
  { id: '2', rawDate: '2026-03-26', displayDate: 'MAR 26', time: '16:30 - 17:30', user: 'Ahmet Yılmaz', status: 'Pending' as const, topic: 'System Design Interview Prep', myRole: 'Mentee', location: 'Campus Library, Room 4B' },
  { id: '3', rawDate: '2026-03-28', displayDate: 'MAR 28', time: '10:00 - 11:00', user: 'Can Özkan', status: 'Upcoming' as const, topic: 'Database Normalization', myRole: 'Mentor', location: 'Neighborhood Cafe' },
  { id: '4', rawDate: '2026-04-02', displayDate: 'APR 02', time: '09:00 - 10:00', user: 'Elif Kaya', status: 'Completed' as const, topic: 'Career Advice', myRole: 'Mentee', meetingUrl: 'https://meet.google.com/abc' },
];

const formatFriendlyDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState('2026-03-26');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessionToReschedule, setSessionToReschedule] = useState<any | null>(null); 

  const markedDates = useMemo(() => {
    const marks: any = {};
    MOCK_SESSIONS.forEach(session => {
      if (!marks[session.rawDate]) {
        marks[session.rawDate] = { dots: [] };
      }
      const dotColor = session.status === 'Upcoming' ? '#10b981' 
                     : session.status === 'Pending' ? '#f59e0b'  
                     : '#9ca3af';                                
      marks[session.rawDate].dots.push({ key: session.id, color: dotColor });
    });

    if (!marks[selectedDate]) marks[selectedDate] = { dots: [] };
    
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: '#2563eb', 
    };

    return marks;
  }, [selectedDate]);

  const selectedSessions = MOCK_SESSIONS.filter(session => session.rawDate === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        <View className="px-4 pt-6 mb-6">
          <Text className="text-3xl font-extrabold text-gray-900">Schedule</Text>
          <Text className="text-base text-gray-500 mt-1">Manage your agenda.</Text>
        </View>

        <View className="px-2 mb-6 shadow-sm">
          <Calendar
            current={'2026-03-26'}
            markingType={'multi-dot'} 
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
                  id: session.id, 
                  user: session.user,
                  date: formatFriendlyDate(session.rawDate), 
                  rawDate: session.rawDate, 
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

      {/* The Session Details Modal */}
      <SessionDetailsModal 
        visible={!!selectedSession} 
        onClose={() => setSelectedSession(null)} 
        session={selectedSession} 
        onReschedule={() => setSessionToReschedule(selectedSession)}
      />

      {/* The Reschedule Flow */}
      <BookingModal 
        visible={!!sessionToReschedule}
        onClose={() => setSessionToReschedule(null)}
        availability={MOCK_AVAILABILITY}
        existingSession={sessionToReschedule ? { date: sessionToReschedule.rawDate, time: sessionToReschedule.time } : undefined}
        offering={sessionToReschedule ? {
          id: 'reschedule-temp',
          title: sessionToReschedule.topic,
          duration: '60 min',
          level: 'Previous Session Level',
          icon: 'calendar-outline',
          description: `You are requesting to reschedule your session with ${sessionToReschedule.user}.`
        } : null}
      />

    </SafeAreaView>
  );
}