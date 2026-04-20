import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/auth/store";
import {
  useConversations,
  useMessages,
  useSendMessage,
  type Message,
} from "@/lib/queries/MessagingQueries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isDifferentDay(a: string, b: string): boolean {
  return new Date(a).toDateString() !== new Date(b).toDateString();
}

// ---------------------------------------------------------------------------
// List item types (messages interleaved with date separators)
// ---------------------------------------------------------------------------

type SeparatorItem = { type: "separator"; date: string; key: string };
type MessageItem = { type: "message"; message: Message; key: string };
type ListItem = SeparatorItem | MessageItem;

function buildListItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  messages.forEach((msg, index) => {
    const prev = messages[index - 1];
    if (index === 0 || (prev && isDifferentDay(prev.created_at, msg.created_at))) {
      items.push({ type: "separator", date: msg.created_at, key: `sep-${msg.created_at}` });
    }
    items.push({ type: "message", message: msg, key: msg.id });
  });
  return items;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({
  name,
  pictureUrl,
  size,
}: {
  name: string;
  pictureUrl: string | null;
  size: number;
}) {
  if (pictureUrl) {
    return (
      <Image
        source={{ uri: pictureUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      className="bg-surface-active items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-bold text-primary" style={{ fontSize: size * 0.35 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function DateSeparator({ dateStr }: { dateStr: string }) {
  return (
    <View className="items-center my-4">
      <View className="bg-surface-input px-4 py-1 rounded-full">
        <Text className="text-[10px] font-medium text-on-surface-muted uppercase tracking-widest">
          {formatDateLabel(dateStr)}
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  isMe,
}: {
  message: Message;
  isMe: boolean;
}) {
  return (
    <View
      className={`w-full mb-1 ${isMe ? "items-end" : "items-start"}`}
    >
      <View style={{ maxWidth: "80%" }}>
        <View
          className={`rounded-2xl px-4 py-3 ${
            isMe ? "bg-primary rounded-br-sm" : "bg-surface-input rounded-bl-sm"
          }`}
          style={{
            shadowColor: "#1a1c1b",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <Text
            className={`text-[14px] leading-5 ${
              isMe ? "text-white" : "text-on-surface"
            }`}
          >
            {message.body}
          </Text>
          {message.attachment_url ? (
            <Text
              className={`text-[12px] mt-1 underline ${
                isMe ? "text-white/70" : "text-primary"
              }`}
            >
              Attachment
            </Text>
          ) : null}
        </View>
        <Text
          className={`text-[10px] text-on-surface-muted px-1 mt-0.5 ${
            isMe ? "text-right" : "text-left"
          }`}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

function EmptyMessages() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <View
        className="bg-surface-active items-center justify-center mb-4"
        style={{ width: 72, height: 72, borderRadius: 36 }}
      >
        <Ionicons name="chatbubbles-outline" size={36} color="#4a7c6f" />
      </View>
      <Text className="text-[15px] font-semibold text-on-surface text-center mb-1">
        No messages yet
      </Text>
      <Text className="text-[13px] text-on-surface-muted text-center">
        Say hello to start the conversation!
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ConversationScreen() {
  const { conversation_id } = useLocalSearchParams<{ conversation_id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentUsername = useAuthStore((state) => state.user?.username) ?? "";

  const { data: conversations = [] } = useConversations();
  const conversation = conversations.find((c) => c.id === conversation_id);

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
  } = useMessages(conversation_id ?? "");

  const sendMessage = useSendMessage(conversation_id ?? "");
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const prevMessageCount = useRef(0);

  const other = conversation
    ? conversation.mentor.username === currentUsername
      ? conversation.mentee
      : conversation.mentor
    : null;

  const listItems = buildListItems(messages);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!body || sendMessage.isPending || !conversation_id) return;
    setText("");
    try {
      await sendMessage.mutateAsync(body);
      queryClient.invalidateQueries({
        queryKey: ["messaging", "messages", conversation_id],
      });
    } catch {
      // Restore text if send failed
      setText(body);
    }
  }, [text, sendMessage, queryClient, conversation_id]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "separator") {
        return <DateSeparator dateStr={item.date} />;
      }
      return (
        <MessageBubble
          message={item.message}
          isMe={item.message.sender.username === currentUsername}
        />
      );
    },
    [currentUsername],
  );

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View
        className="bg-surface-card border-b border-divider flex-row items-center justify-between px-2"
        style={{ paddingTop: insets.top + 6, paddingBottom: 10 }}
      >
        <View className="flex-row items-center flex-1 min-w-0">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 items-center justify-center rounded-full mr-1"
          >
            <Ionicons name="arrow-back" size={22} color="#1c1c18" />
          </TouchableOpacity>

          {other ? (
            <View className="flex-row items-center flex-1 min-w-0">
              <Avatar name={other.display_name} pictureUrl={other.picture_url} size={40} />
              <View className="ml-3 flex-1 min-w-0">
                <Text
                  className="text-[16px] font-bold text-on-surface"
                  numberOfLines={1}
                >
                  {other.display_name}
                </Text>
                {other.title ? (
                  <Text
                    className="text-[12px] text-on-surface-soft"
                    numberOfLines={1}
                  >
                    {other.title}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-3 ml-1">
              <View
                className="bg-surface-input rounded-full"
                style={{ width: 40, height: 40 }}
              />
              <View className="bg-surface-input rounded-full h-4 w-28" />
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          className="w-10 h-10 items-center justify-center rounded-full ml-1"
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#4a7c6f" />
        </TouchableOpacity>
      </View>

      {/* Messages area + input wrapped in KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {messagesLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4a7c6f" />
          </View>
        ) : messagesError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="alert-circle-outline" size={40} color="#ba1a1a" />
            <Text className="text-[15px] font-semibold text-on-surface text-center mt-3">
              Failed to load messages
            </Text>
          </View>
        ) : (
          <FlatList<ListItem>
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={<EmptyMessages />}
          />
        )}

        {/* Input Bar */}
        <View
          className="bg-surface-card border-t border-divider px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-end" style={{ gap: 10 }}>
            <View
              className="flex-1 bg-surface-input rounded-xl px-4 py-3"
              style={{ minHeight: 48 }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={
                  other
                    ? `Message ${other.display_name.split(" ")[0]}…`
                    : "Type a message…"
                }
                placeholderTextColor="#8a8172"
                multiline
                className="text-[14px] text-on-surface"
                style={{ maxHeight: 120, paddingVertical: 0 }}
                returnKeyType="default"
                blurOnSubmit={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={!text.trim() || sendMessage.isPending}
              className="items-center justify-center rounded-xl bg-primary"
              style={{
                width: 48,
                height: 48,
                opacity: !text.trim() || sendMessage.isPending ? 0.45 : 1,
              }}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={19} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}