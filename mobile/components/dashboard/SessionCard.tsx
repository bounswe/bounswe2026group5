import { View, Text, TouchableOpacity } from "react-native";

interface SessionCardProps {
  user: string;
  date: string;
  time: string;
  status: "Upcoming" | "Pending" | "Completed";
  onPress?: () => void;
}

export function SessionCard({
  user,
  date,
  time,
  status,
  onPress,
}: Readonly<SessionCardProps>) {
  // 1. Logic: Determine badge colors
  const getStatusStyles = () => {
    switch (status) {
      case "Upcoming":
        return { bg: "bg-green-100", text: "text-green-700" };
      case "Pending":
        return { bg: "bg-amber-100", text: "text-amber-700" };
      case "Completed":
        return { bg: "bg-gray-100", text: "text-gray-600" };
      default:
        return { bg: "bg-blue-100", text: "text-blue-700" };
    }
  };

  const statusStyles = getStatusStyles();

  // 2. Logic: Safely split the date string into month and day
  const [month = "TBD", day = "00"] = date.split(" ");

  // 3. UI: Render the interactive card
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={onPress}
      className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl shadow-sm border border-divider dark:border-divider-dark mb-3 flex-row items-center"
    >
      {/* Date/Time Left Column */}
      <View className="bg-surface-active dark:bg-surface-active-dark px-3 py-2 rounded-lg items-center justify-center mr-4 w-16 border border-divider/60 dark:border-divider-dark/70">
        <Text className="text-primary dark:text-primary-dim font-bold text-xs uppercase">
          {month}
        </Text>
        <Text className="text-on-surface dark:text-on-surface-dark font-bold text-xl">
          {day}
        </Text>
      </View>

      {/* User Info Middle Column */}
      <View className="flex-1 justify-center">
        <Text className="text-lg font-semibold text-on-surface dark:text-on-surface-dark">
          {user}
        </Text>
        <Text className="text-sm text-on-surface-soft dark:text-on-surface-soft-dark mt-0.5">
          {time}
        </Text>
      </View>

      {/* Status Badge Right Column */}
      <View className={`px-2 py-1 rounded-md ${statusStyles.bg}`}>
        <Text className={`text-xs font-semibold ${statusStyles.text}`}>
          {status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
