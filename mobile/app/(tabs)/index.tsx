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

// Import mock data
import { MOCK_REQUESTS, MOCK_SESSIONS, MOCK_AVAILABILITY } from '@/constants/mockData';

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
          <View className="flex-row justify-between items-center mb-3 mt-2">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-gray-900">Pending Requests</Text>
              {MOCK_REQUESTS.length > 0 && (
                <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2 justify-center items-center">
                  <Text className="text-white text-xs font-bold">{MOCK_REQUESTS.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setViewAllRequestsOpen(true)}>
              <Text className="text-indigo-600 font-semibold text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          {/* Show the first 2 requests on the dashboard */}
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
          <View className="flex-row justify-between items-center mb-3 mt-2">
            <Text className="text-lg font-bold text-gray-900">Your Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/schedule')}>
              <Text className="text-blue-600 font-semibold text-sm">
                View All {MOCK_SESSIONS.length > 0 ? `(${MOCK_SESSIONS.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {MOCK_SESSIONS.map((session) => (
            <SessionCard 
              key={session.id}
              user={session.user}
              date={session.date}
              time={session.time}
              status={session.status}
              onPress={() => setSelectedSession(session)}
            />
          ))}
        </View>

      </ScrollView>

      {/* 3. MODALS */}
      <RequestDetailsModal 
        visible={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />

      <SessionDetailsModal 
        visible={!!selectedSession}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onReschedule={() => setSessionToReschedule(selectedSession)}
      />

      <ViewAllRequestsModal
        visible={isViewAllRequestsOpen}
        requests={MOCK_REQUESTS}
        onClose={() => setViewAllRequestsOpen(false)}
        onSelectRequest={(req) => {
          setViewAllRequestsOpen(false);
          setTimeout(() => setSelectedRequest(req as typeof MOCK_REQUESTS[0]), 300); 
        }}
      />

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
    </View>
  );
}