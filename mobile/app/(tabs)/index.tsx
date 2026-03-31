import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Import the components for the dashboard
import { RequestCard } from '@/components/dashboard/RequestCard';
import { SessionCard } from '@/components/dashboard/SessionCard';
import { SessionDetailsModal } from '@/components/dashboard/SessionDetailsModal';
import { RequestDetailsModal } from '@/components/dashboard/RequestDetailsModal';
import { ViewAllRequestsModal } from '@/components/dashboard/ViewAllRequestsModal';
import { BookingModal } from '@/components/profile/BookingModal';

// Mock Data
const MOCK_REQUESTS = [
  { id: '1', user: 'Zeynep Kaya', topic: 'React Native Architecture', type: 'incoming' as const, message: 'Hi! I saw your profile and would love to get your thoughts on structuring a large Expo app.', proposedDate: 'Oct 24, 10:00 AM' },
  { id: '2', user: 'Ahmet Yılmaz', topic: 'System Design Mock', type: 'outgoing' as const, message: 'Looking for a mock interview for my upcoming big tech loop.' },
  { id: '3', user: 'Fatma Demir', topic: 'Advanced Algorithms', type: 'incoming' as const, isReschedule: true, message: 'I am so sorry, but I have a conflict. Can we reschedule our session to next week?', proposedDate: 'Nov 2, 14:00' }
];

const MOCK_SESSIONS = [
  { id: '1', user: 'Mehmet Demir', date: 'Oct 22', time: '14:00 - 15:00', status: 'Upcoming' as const, topic: 'Advanced Algorithms', myRole: 'Mentee', meetingUrl: 'https://meet.google.com/abc-defg-hij' },
  { id: '2', user: 'Elif Şahin', date: 'Oct 25', time: '09:00 - 10:00', status: 'Pending' as const, topic: 'Portfolio Review', myRole: 'Mentor' }
];

const MOCK_AVAILABILITY = [
  { day: "Monday", times: ["10:00 - 12:00", "15:00 - 17:00"] },
  { day: "Wednesday", times: ["14:00 - 18:00"] },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State for Modals
  const [selectedRequest, setSelectedRequest] = useState<typeof MOCK_REQUESTS[0] | null>(null);
  const [selectedSession, setSelectedSession] = useState<typeof MOCK_SESSIONS[0] | null>(null);
  const [isViewAllRequestsOpen, setViewAllRequestsOpen] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<typeof MOCK_SESSIONS[0] | null>(null);

  return (
    <View className="flex-1 bg-gray-50">
      
      {/* 1. FIXED TOP HEADER */}
      <View 
        className="bg-white z-10 shadow-sm border-b border-gray-100" 
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-gray-900">Dashboard</Text>
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
          <View className="flex-row justify-between items-end mb-3">
            <Text className="text-lg font-bold text-gray-900">Pending Requests</Text>
            <TouchableOpacity onPress={() => setViewAllRequestsOpen(true)}>
              <Text className="text-indigo-600 font-semibold text-sm mb-0.5">View All</Text>
            </TouchableOpacity>
          </View>

          {/* Just show the first 2 requests on the dashboard to save space */}
          {MOCK_REQUESTS.slice(0, 2).map((req) => (
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
          
          {/* THE UPDATED HEADER WITH 'VIEW ALL' BUTTON */}
          <View className="flex-row justify-between items-end mb-3">
            <Text className="text-lg font-bold text-gray-900">Your Sessions</Text>
            {/* Navigates to the Schedule tab */}
            <TouchableOpacity onPress={() => router.push('/schedule')}>
              <Text className="text-blue-600 font-semibold text-sm mb-0.5">View All</Text>
            </TouchableOpacity>
          </View>

          {MOCK_SESSIONS.map((session) => (
            <SessionCard 
              key={session.id}
              user={session.user}
              date={session.date}
              time={session.time}
              status={session.status}
              onPress={() => setSelectedSession(session)} // Opens the Session Modal
            />
          ))}
        </View>

      </ScrollView>

      {/* 3. MODALS */}
      {/* The Request Details Bottom Sheet */}
      <RequestDetailsModal 
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

      {/* The Session Details Bottom Sheet */}
      <SessionDetailsModal 
        visible={!!selectedSession}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onReschedule={() => setSessionToReschedule(selectedSession)}
      />

      {/* The View All Requests Modal */}
      <ViewAllRequestsModal
        visible={isViewAllRequestsOpen}
        requests={MOCK_REQUESTS}
        onClose={() => setViewAllRequestsOpen(false)}
        onSelectRequest={(req) => {
          setViewAllRequestsOpen(false); // Close the list
          setTimeout(() => setSelectedRequest(req as typeof MOCK_REQUESTS[0]), 300); 
        }}
      />

      {/* The Reschedule Flow (Reusing BookingModal) */}
      <BookingModal 
        visible={!!sessionToReschedule}
        onClose={() => setSessionToReschedule(null)}
        availability={MOCK_AVAILABILITY}
        existingSession={sessionToReschedule ? { date: sessionToReschedule.date, time: sessionToReschedule.time } : undefined}
        offering={sessionToReschedule ? {
          id: 'reschedule-temp',
          title: sessionToReschedule.topic,
          duration: '60 min',
          level: 'Previous Session Level',
          icon: 'calendar-outline',
          description: `You are requesting to reschedule your session with ${sessionToReschedule.user}.`
        } : null}
      />
    </View>
  );
}