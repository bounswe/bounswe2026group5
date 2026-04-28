import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, Text, View } from "react-native";

const plannedFeedItems = [
  "Community discussions",
  "Recommended posts",
  "Member updates",
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <View
        className="bg-surface-card dark:bg-surface-card-dark z-10 shadow-sm border-b border-divider dark:border-divider-dark"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row justify-between items-center px-4 pb-3 pt-2">
          <Text className="text-2xl font-extrabold text-on-surface dark:text-on-surface-dark">
            Community
          </Text>
          <NotificationBell />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark mb-3">
            Your Communities
          </Text>
          <View
            testID="community-empty-state"
            className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark"
          >
            <Text className="text-on-surface-soft dark:text-on-surface-soft-dark font-medium">
              Join communities from Discover to see them here.
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-lg font-bold text-on-surface dark:text-on-surface-dark mb-3">
            Community Feed
          </Text>
          <View className="bg-surface-card dark:bg-surface-card-dark p-4 rounded-xl border border-divider dark:border-divider-dark">
            <Text className="text-on-surface dark:text-on-surface-dark font-semibold mb-2">
              Feed structure is ready
            </Text>
            {plannedFeedItems.map((item) => (
              <Text
                key={item}
                className="text-on-surface-soft dark:text-on-surface-soft-dark mb-1"
              >
                {item}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
