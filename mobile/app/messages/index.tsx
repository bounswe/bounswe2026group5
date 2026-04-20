import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/lib/auth/store";
import {
  useConversations,
  type Conversation,
} from "@/lib/queries/MessagingQueries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({
  name,
  pictureUrl,
}: {
  name: string;
  pictureUrl: string | null;
}) {
  if (pictureUrl) {
    return (
      <Image
        source={{ uri: pictureUrl }}
        className="w-14 h-14 rounded-full"
        style={{ width: 56, height: 56, borderRadius: 28 }}
      />
    );
  }
  return (
    <View
      className="bg-surface-active items-center justify-center"
      style={{ width: 56, height: 56, borderRadius: 28 }}
    >
      <Text className="text-lg font-bold text-primary">{getInitials(name)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Conversation Item
// ---------------------------------------------------------------------------

function ConversationItem({
  conversation,
  myUsername,
  onPress,
}: {
  conversation: Conversation;
  myUsername: string;
  onPress: () => void;
}) {
  const other =
    conversation.mentor.username === myUsername
      ? conversation.mentee
      : conversation.mentor;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-center p-4 bg-surface-card rounded-xl mb-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <Avatar name={other.display_name} pictureUrl={other.picture_url} />

      <View className="ml-4 flex-1">
        <View className="flex-row justify-between items-baseline mb-0.5">
          <Text
            className="text-[15px] font-semibold text-on-surface flex-1"
            numberOfLines={1}
          >
            {other.display_name}
          </Text>
          <Text className="text-[11px] text-on-surface-muted ml-2 shrink-0">
            {formatRelativeTime(conversation.updated_at)}
          </Text>
        </View>
        <Text className="text-[13px] text-on-surface-soft" numberOfLines={1}>
          @{other.username}
        </Text>
        {other.title ? (
          <Text className="text-[12px] text-on-surface-muted mt-0.5" numberOfLines={1}>
            {other.title}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color="#8a8172"
        style={{ marginLeft: 8 }}
      />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <View className="items-center justify-center pt-20 px-8">
      <View
        className="bg-surface-active items-center justify-center mb-4"
        style={{ width: 72, height: 72, borderRadius: 36 }}
      >
        <Ionicons name="chatbubbles-outline" size={36} color="#4a7c6f" />
      </View>
      <Text className="text-[17px] font-bold text-on-surface text-center mb-2">
        {hasSearch ? "No results found" : "No conversations yet"}
      </Text>
      <Text className="text-[14px] text-on-surface-soft text-center leading-5">
        {hasSearch
          ? "Try a different name or username."
          : "Your conversations with mentors and mentees will appear here."}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUsername = useAuthStore((state) => state.user?.username) ?? "";
  const { data: conversations = [], isLoading, isError, refetch } = useConversations();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const other =
      conv.mentor.username === currentUsername ? conv.mentee : conv.mentor;
    const q = search.toLowerCase();
    return (
      other.display_name.toLowerCase().includes(q) ||
      other.username.toLowerCase().includes(q)
    );
  });

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <Text className="text-[28px] font-extrabold text-on-surface">
          Messages
        </Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4 mt-1">
        <View
          className="flex-row items-center bg-surface-input rounded-xl px-4"
          style={{ height: 48 }}
        >
          <Ionicons name="search-outline" size={18} color="#8a8172" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search mentors, connections..."
            placeholderTextColor="#8a8172"
            className="flex-1 ml-2 text-[14px] text-on-surface"
            style={{ paddingVertical: 0 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#8a8172" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4a7c6f" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={40} color="#ba1a1a" />
          <Text className="text-[15px] font-semibold text-on-surface text-center mt-3 mb-2">
            Failed to load conversations
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            activeOpacity={0.7}
            className="bg-primary px-6 py-2.5 rounded-xl mt-1"
          >
            <Text className="text-white font-semibold text-[14px]">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState hasSearch={search.length > 0} />}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              myUsername={currentUsername}
              onPress={() =>
                router.push(`/messages/${item.id}` as never)
              }
            />
          )}
        />
      )}
    </View>
  );
}