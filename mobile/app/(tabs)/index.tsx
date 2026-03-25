import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- MOCK DATA ---
const MOCK_REQUESTS = [
  { id: '1', type: 'incoming', user: 'Ahmet Yılmaz', role: 'Mentee', topic: 'React Native Basics' },
  { id: '2', type: 'outgoing', user: 'Elif Kaya', role: 'Mentor', topic: 'System Design' },
];

const MOCK_SESSIONS = [
  { id: '1', date: 'Oct 28', time: '14:00', user: 'Zeynep Demir', status: 'Upcoming' },
  { id: '2', date: 'Oct 29', time: '10:00', user: 'Can Özkan', status: 'Pending' },
];
// -----------------

export default function Dashboard() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 py-6">
        
        {/* Header Section */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900">Dashboard</Text>
          <Text className="text-base text-gray-500 mt-1">Welcome back! Here is your overview.</Text>
        </View>

        {/* Mentorship Requests Section (We will build this next) */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-gray-800 mb-4">Requests</Text>
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <Text className="text-gray-400 italic">Request cards will go here...</Text>
          </View>
        </View>

        {/* Upcoming Sessions Section (We will build this after) */}
        <View className="mb-8">
          <Text className="text-xl font-semibold text-gray-800 mb-4">Upcoming Sessions</Text>
          <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <Text className="text-gray-400 italic">Session cards will go here...</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}