import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import { useConversations } from "@/lib/queries/MessagingQueries";
import { Alert } from "react-native";

/**
 * useMessaging: Centralized hook for navigating to a message thread by username.
 */
export function useMessaging() {
  const router = useRouter();
  const { data: conversations = [], isLoading } = useConversations();

  const sendMessageTo = useCallback((username: string) => {
    if (isLoading) return;

    const conv = conversations.find(
      (c) => 
        c.mentor.username.toLowerCase() === username.toLowerCase() || 
        c.mentee.username.toLowerCase() === username.toLowerCase(),
    );

    if (conv) {
      router.push(`/messages/${conv.id}` as Href);
    } else {
      // If no conversation exists in the pre-fetched list, we redirect to the general messages tab.
      // In a more complex app, we would have a 'get_or_create' API call here.
      Alert.alert(
        "Conversation Not Found",
        "We couldn't find an existing conversation with this user. Please try starting one from the Messages tab.",
        [{ text: "Go to Messages", onPress: () => router.push("/messages" as Href) }, { text: "Cancel", style: "cancel" }]
      );
    }
  }, [conversations, isLoading, router]);

  return { sendMessageTo };
}
