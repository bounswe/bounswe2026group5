import { View, Text, TouchableOpacity } from "react-native";

interface RequestCardProps {
  user: string;
  topic: string;
  type: "incoming" | "outgoing";
  isReschedule?: boolean;
  onPress?: () => void;
  onShowProfile?: () => void;
}

export function RequestCard({
  user,
  topic,
  type,
  isReschedule,
  onPress,
  onShowProfile,
}: Readonly<RequestCardProps>) {
  const isIncoming = type === "incoming";

  const myRole = isIncoming ? "Mentor" : "Mentee";
  const badgeColor = isIncoming
    ? "bg-indigo-100 text-indigo-700"
    : "bg-emerald-100 text-emerald-700";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`p-4 rounded-xl shadow-sm border mb-3 ${isReschedule ? "bg-amber-50/30 border-amber-200" : "bg-white border-gray-100"}`}
    >
      {/* Top Row: Name and Role Badge */}
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900">{user}</Text>
        <View className="flex-row gap-2">
          {/* FIX: Add the Reschedule Badge if applicable */}
          {isReschedule && (
            <View className="bg-amber-100 px-2 py-1 rounded-md">
              <Text className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Reschedule
              </Text>
            </View>
          )}
          <View className={`px-2 py-1 rounded-md ${badgeColor.split(" ")[0]}`}>
            <Text
              className={`text-xs font-bold uppercase tracking-wider ${badgeColor.split(" ")[1]}`}
            >
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
              ? "Has requested you to be their Mentor."
              : "You requested them to be your Mentor."}
          </Text>
        )}
        <Text className="text-xs text-gray-400 mt-1 font-medium">
          Topic: {topic}
        </Text>
      </View>

      {/* Bottom Row: Status */}
      <View className="flex-row justify-between items-center mt-1">
        {onShowProfile ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onShowProfile}
            className="bg-white px-3 py-2 rounded-lg border border-gray-200"
          >
            <Text className="text-gray-700 text-sm font-semibold">
              Show Profile
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {isIncoming ? (
          <View className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
            <Text className="text-indigo-700 text-sm font-semibold">
              Open to respond
            </Text>
          </View>
        ) : (
          <View className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
            <Text className="text-gray-500 text-sm font-medium">
              Request Pending...
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
