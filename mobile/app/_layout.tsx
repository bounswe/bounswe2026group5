import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client for TanStack Query
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        {/* Define your main navigation stacks here */}
        <Stack.Screen name="index" options={{ title: 'Home' }} />
      </Stack>
    </QueryClientProvider>
  );
}