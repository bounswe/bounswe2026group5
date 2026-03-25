import { View, Text, TouchableOpacity } from 'react-native';

// Define the exact shape of the data this component needs
interface RequestCardProps {
  user: string;
  role: 'Mentor' | 'Mentee';
  topic: string;
  type: 'incoming' | 'outgoing';
}

export function RequestCard({ user, role, topic, type }: RequestCardProps) {
  const isIncoming = type === 'incoming';

  return (
    <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex-row justify-between items-center">
      <View>
        <Text className="text-lg font-semibold text-gray-900">{user}</Text>
        <Text className="text-sm text-gray-500 mt-1">
          Wants to be your <Text className="font-medium text-blue-600">{role}</Text>
        </Text>
        <Text className="text-xs text-gray-400 mt-1">Topic: {topic}</Text>
      </View>

      {/* Action Buttons */}
      {isIncoming ? (
        <View className="flex-row gap-2">
          <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg">
            <Text className="text-white font-medium">Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-gray-100 px-3 py-1 rounded-full">
          <Text className="text-gray-500 text-xs font-medium">Pending</Text>
        </View>
      )}
    </View>
  );
}