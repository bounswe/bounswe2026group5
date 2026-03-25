import { View, Text, TouchableOpacity } from 'react-native';

// Later, this interface can be moved to a shared workspace package!
interface SessionCardProps {
  user: string;
  date: string;
  time: string;
  status: 'Upcoming' | 'Pending' | 'Completed';
}

export function SessionCard({ user, date, time, status }: SessionCardProps) {
  
  // Dynamic styling based on status
  const getStatusBadge = () => {
    switch (status) {
      case 'Upcoming':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      case 'Completed':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex-row items-center"
    >
      {/* Date/Time Left Column */}
      <View className="bg-blue-50 px-3 py-2 rounded-lg items-center justify-center mr-4 w-16">
        <Text className="text-blue-600 font-bold text-xs uppercase">{date.split(' ')[0]}</Text>
        <Text className="text-blue-900 font-bold text-xl">{date.split(' ')[1]}</Text>
      </View>

      {/* User Info Middle Column */}
      <View className="flex-1 justify-center">
        <Text className="text-lg font-semibold text-gray-900">{user}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{time}</Text>
      </View>

      {/* Status Badge Right Column */}
      <View className={`px-2 py-1 rounded-md ${getStatusBadge().split(' ')[0]}`}>
        <Text className={`text-xs font-semibold ${getStatusBadge().split(' ')[1]}`}>
          {status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}