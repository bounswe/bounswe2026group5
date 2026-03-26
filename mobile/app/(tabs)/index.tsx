import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

export default function Index() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-blue-500">
      <Text className="text-white text-3xl font-bold p-4 text-center">
        Tailwind is working! 🚀
      </Text>
    </SafeAreaView>
  );
}