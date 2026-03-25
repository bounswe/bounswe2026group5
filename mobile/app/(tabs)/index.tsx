import { Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequestCard } from '../../components/dashboard/RequestCard';
import { SessionCard } from '../../components/dashboard/SessionCard';

// Mock Data (To be replaced with TanStack Query later)
const MOCK_REQUESTS = [
  { id: '1', type: 'incoming' as const, user: 'Ahmet Yılmaz', topic: 'React Native Basics' },
  { id: '2', type: 'outgoing' as const, user: 'Elif Kaya', topic: 'System Design' },
];

const MOCK_SESSIONS = [
  { id: '1', date: 'OCT 28', time: '14:00', user: 'Zeynep Demir', status: 'Upcoming' as const },
];

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-extrabold text-gray-900">Dashboard</Text>
          <Text className="text-base text-gray-500 mt-1">Your mentorship overview</Text>
        </View>

        {/* Requests Section */}
        <Text className="text-xl font-bold text-gray-800 mb-4">Requests</Text>
        {MOCK_REQUESTS.map(req => (
          <RequestCard key={req.id} {...req} />
        ))}

        {/* Sessions Section */}
        <Text className="text-xl font-bold text-gray-800 mb-4 mt-6">Upcoming Sessions</Text>
        {MOCK_SESSIONS.map(session => (
          <SessionCard key={session.id} {...session} />
        ))}
        
        {/* Bottom padding so the scroll doesn't get hidden behind the tab bar */}
        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}