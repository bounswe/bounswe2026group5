import { View, Text, TouchableOpacity } from 'react-native';

interface RequestCardProps {
  user: string;
  topic: string;
  type: 'incoming' | 'outgoing';
  isReschedule?: boolean;
  onPress?: () => void;
}

// FIX: Added `isReschedule` to the destructured props
export function RequestCard({ user, topic, type, isReschedule, onPress }: RequestCardProps) {
  const isIncoming = type === 'incoming';
  
  // Define what the USER's role is in this specific relationship
  const myRole = isIncoming ? 'Mentor' : 'Mentee';
  const badgeColor = isIncoming ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      // FIX: Apply amber styling if it's a reschedule request
      className={`p-4 rounded-xl shadow-sm border mb-3 ${isReschedule ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-gray-100'}`}
    >
      
      {/* Top Row: Name and Role Badge */}
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900">{user}</Text>
        <View className="flex-row gap-2">
          {/* FIX: Add the Reschedule Badge if applicable */}
          {isReschedule && (
            <View className="bg-amber-100 px-2 py-1 rounded-md">
              <Text className="text-xs font-bold uppercase tracking-wider text-amber-700">Reschedule</Text>
            </View>
          )}
          <View className={`px-2 py-1 rounded-md ${badgeColor.split(' ')[0]}`}>
            <Text className={`text-xs font-bold uppercase tracking-wider ${badgeColor.split(' ')[1]}`}>
              As {myRole}
            </Text>
          </View>
        </View>
      </View>

      {/* Middle Row: Context Text */}
      <View className="mb-3">
        {/* FIX: Change descriptive text based on reschedule status */}
        {isReschedule ? (
          <Text className="text-sm font-bold text-amber-700">
            Requested to reschedule your upcoming session.
          </Text>
        ) : (
          <Text className="text-sm text-gray-600">
            {isIncoming 
              ? 'Has requested you to be their Mentor.' 
              : 'You requested them to be your Mentor.'}
          </Text>
        )}
        <Text className="text-xs text-gray-400 mt-1 font-medium">Topic: {topic}</Text>
      </View>
      
      {/* Bottom Row: Actions */}
      <View className="flex-row justify-end mt-1">
        {isIncoming ? (
          <View className="flex-row gap-2">
            {/* TODO: Hook up to /api/requests/decline endpoint */}
            <TouchableOpacity 
              accessibilityRole="button"
              onPress={(e) => { e.stopPropagation(); console.log(`TODO: Decline request from ${user}`); }}
              className="bg-white px-4 py-2 rounded-lg border border-gray-200"
            >
              <Text className="text-gray-600 font-medium text-sm">Decline</Text>
            </TouchableOpacity>
            
            {/* TODO: Hook up to /api/requests/accept endpoint */}
            <TouchableOpacity 
              accessibilityRole="button"
              onPress={(e) => { e.stopPropagation(); console.log(`TODO: Accept request from ${user}`); }}
              // FIX: Update Accept button color if it's a reschedule
              className={`px-4 py-2 rounded-lg ${isReschedule ? 'bg-amber-600' : 'bg-blue-600'}`}
            >
              <Text className="text-white font-medium text-sm">Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
            <Text className="text-gray-500 text-sm font-medium">Request Pending...</Text>
          </View>
        )}
      </View>

    </TouchableOpacity>
  );
}