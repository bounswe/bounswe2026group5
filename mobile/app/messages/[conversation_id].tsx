import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReportSheet } from "@/components/report/ReportSheet";
import { useAuthStore } from "@/lib/auth/store";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkRead,
  type Message,
} from "@/lib/queries/MessagingQueries";
import { useSubmitReportMutation } from "@/lib/queries/reporting";
import type { LocalUploadFile } from "@/lib/queries/uploads";
import {
  pickMessageImageFile,
  pickMessagePdfFile,
  pickMessageAudioFile,
} from "@/lib/uploads/picker";

import { API_BASE_URL } from "@/lib/api/config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

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

function isImageAttachment(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(jpe?g|png|gif|webp)$/.test(path);
}

function getAttachmentLabel(url: string, originalName?: string | null): string {
  if (originalName) return originalName;
  const path = url.split("?")[0] ?? "";
  const fileName = decodeURIComponent(path.split("/").pop() || "");
  return fileName || "Attachment";
}

function isAudioAttachment(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(mp3|wav|ogg|m4a|aac)$/.test(path);
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
    if (
      index === 0 ||
      (prev && isDifferentDay(prev.created_at, msg.created_at))
    ) {
      items.push({
        type: "separator",
        date: msg.created_at,
        key: `sep-${msg.created_at}`,
      });
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
  const absoluteUrl = getAbsoluteUrl(pictureUrl);
  if (absoluteUrl) {
    return (
      <Image
        source={{ uri: absoluteUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      className="bg-surface-active items-center justify-center"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text
        className="font-bold text-primary"
        style={{ fontSize: size * 0.35 }}
      >
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
  onLongPress,
  onImagePress,
}: {
  message: Message;
  isMe: boolean;
  onLongPress?: () => void;
  onImagePress?: (url: string) => void;
}) {
  const attachmentUrl = getAbsoluteUrl(message.attachment_url);
  
  const getStatusIcon = () => {
    const status = message.status_for_me;
    if (status === "read") {
      return <Ionicons name="checkmark-done" size={14} color="#ffffffcc" style={{ marginLeft: 4 }} />;
    }
    if (status === "delivered") {
      return <Ionicons name="checkmark-done" size={14} color="#ffffffcc" style={{ marginLeft: 4 }} />;
    }
    if (status === "sent") {
      return <Ionicons name="checkmark" size={14} color="#ffffff99" style={{ marginLeft: 4 }} />;
    }
    return null;
  };

  return (
    <View className={`w-full mb-1 ${isMe ? "items-end" : "items-start"}`}>
      <TouchableOpacity
        testID={`message-bubble-${message.id}`}
        activeOpacity={0.85}
        disabled={!onLongPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={{ maxWidth: "80%" }}
      >
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
          {message.body ? (
            <Text
              className={`text-[14px] leading-5 ${
                isMe ? "text-white" : "text-on-surface"
              }`}
            >
              {message.body}
            </Text>
          ) : null}
          {attachmentUrl ? (
            <TouchableOpacity
              testID={`message-attachment-${message.id}`}
              activeOpacity={0.85}
              onPress={() => {
                if (attachmentUrl && isImageAttachment(attachmentUrl)) {
                  onImagePress?.(attachmentUrl);
                } else if (attachmentUrl) {
                  void Linking.openURL(attachmentUrl);
                }
              }}
              className={message.body ? "mt-2" : ""}
            >
              {attachmentUrl && isImageAttachment(attachmentUrl) ? (
                <Image
                  source={{ uri: attachmentUrl }}
                  className="rounded-xl mb-2"
                  style={{ width: 180, height: 130 }}
                  resizeMode="cover"
                />
              ) : null}
              <View
                className={`flex-row items-center rounded-xl px-3 py-2 ${
                  isMe ? "bg-white/15" : "bg-white"
                }`}
              >
                <Ionicons
                  name={
                    isImageAttachment(attachmentUrl)
                      ? "image"
                      : isAudioAttachment(attachmentUrl)
                      ? "musical-notes"
                      : "document-text"
                  }
                  size={16}
                  color={isMe ? "#ffffff" : "#4a7c6f"}
                />
                <Text
                  className={`text-[12px] font-semibold ml-2 flex-1 ${
                    isMe ? "text-white" : "text-primary"
                  }`}
                  numberOfLines={1}
                >
                  {getAttachmentLabel(attachmentUrl, message.original_filename)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        <View className={`flex-row items-center px-1 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
          <Text className="text-[10px] text-on-surface-muted">
            {formatTime(message.created_at)}
          </Text>
          {isMe && getStatusIcon()}
        </View>
      </TouchableOpacity>
    </View>
  );
}


function ImageViewer({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  if (!url) return null;
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black items-center justify-center">
        <TouchableOpacity 
          onPress={onClose} 
          className="absolute top-12 right-6 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/20"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Image
          source={{ uri: url }}
          className="w-full h-full"
          resizeMode="contain"
        />
      </View>
    </Modal>
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
      <Text className="text-[13px] text-on-surface-muted text-center px-8">
        Say hello to start the conversation!
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ConversationScreen() {
  const { conversation_id } = useLocalSearchParams<{
    conversation_id: string;
  }>();
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
    loadMore,
    hasMore,
  } = useMessages(conversation_id ?? "");

  const markRead = useMarkRead(conversation_id ?? "");
  const sendMessage = useSendMessage(conversation_id ?? "");
  const submitReportMutation = useSubmitReportMutation();
  const [text, setText] = useState("");
  const [messageToReport, setMessageToReport] = useState<Message | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<LocalUploadFile | null>(null);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<ListItem>>(null);
  const isNearBottomRef = useRef(true);
  const hasInitialScrollDoneRef = useRef(false);
  const prevLastMessageIdRef = useRef<string | null>(null);

  // Mark conversation as read on mount and when new messages arrive if near bottom
  useEffect(() => {
    if (conversation_id) {
      markRead.mutate();
    }
  }, [conversation_id]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && isNearBottomRef.current) {
        markRead.mutate();
    }
  }, [messages.length]);

  const handleHeaderScroll = useCallback(async () => {
    if (hasMore && !messagesLoading && !isRefreshing) {
      setIsRefreshing(true);
      await loadMore();
      setIsRefreshing(false);
    }
  }, [hasMore, messagesLoading, isRefreshing, loadMore]);

  const other = conversation
    ? conversation.mentor.username === currentUsername
      ? conversation.mentee
      : conversation.mentor
    : null;

  const listItems = buildListItems(messages);

  useEffect(() => {
    isNearBottomRef.current = true;
    hasInitialScrollDoneRef.current = false;
    prevLastMessageIdRef.current = null;
  }, [conversation_id]);

  // Scroll to bottom on initial load, then only for new messages when user is near bottom
  useEffect(() => {
    const latestMessageId = messages[messages.length - 1]?.id ?? null;
    const hasNewMessage =
      latestMessageId !== null &&
      latestMessageId !== prevLastMessageIdRef.current;

    const shouldAutoScroll =
      messages.length > 0 &&
      (!hasInitialScrollDoneRef.current ||
        (hasNewMessage && isNearBottomRef.current));

    if (shouldAutoScroll) {
      const timeoutId = setTimeout(() => {
        flatListRef.current?.scrollToEnd({
          animated: hasInitialScrollDoneRef.current,
        });
      }, 80);
      hasInitialScrollDoneRef.current = true;
      prevLastMessageIdRef.current = latestMessageId;
      return () => clearTimeout(timeoutId);
    }

    prevLastMessageIdRef.current = latestMessageId;
  }, [messages]);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      isNearBottomRef.current = distanceFromBottom <= 80;

      // Detect top of list to load more (older) messages
      if (contentOffset.y <= 10 && !messagesLoading && hasMore) {
        void handleHeaderScroll();
      }
    },
    [messagesLoading, hasMore, handleHeaderScroll],
  );

  const handleSend = useCallback(async () => {
    const body = text.trim();
    const currentAttachment = attachment;
    if ((!body && !currentAttachment) || sendMessage.isPending || !conversation_id) return;
    setText("");
    setAttachment(null);
    setShowAttachOptions(false);
    setAttachmentError(null);
    try {
      await sendMessage.mutateAsync({ body, attachment: currentAttachment });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "messages", conversation_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["messaging", "conversations"],
      });
    } catch {
      // Restore draft if send failed
      setText(body);
      setAttachment(currentAttachment);
    }
  }, [text, attachment, sendMessage, queryClient, conversation_id]);

  const handlePickImage = useCallback(async () => {
    setAttachmentError(null);
    try {
      const file = await pickMessageImageFile();
      if (file) {
        setAttachment(file);
        setShowAttachOptions(false);
      }
    } catch {
      setAttachmentError("Could not attach that image.");
    }
  }, []);

  const handlePickPdf = useCallback(async () => {
    setAttachmentError(null);
    try {
      const file = await pickMessagePdfFile();
      if (file) {
        setAttachment(file);
        setShowAttachOptions(false);
      }
    } catch {
      setAttachmentError("Could not attach that PDF.");
    }
  }, []);

  const handlePickAudio = useCallback(async () => {
    setAttachmentError(null);
    try {
      const file = await pickMessageAudioFile();
      if (file) {
        setAttachment(file);
        setShowAttachOptions(false);
      }
    } catch {
      setAttachmentError("Could not attach that audio file.");
    }
  }, []);

  const handleSubmitReport = useCallback(
    async ({
      reason,
      description,
    }: {
      reason: "SPAM" | "HARASSMENT" | "INAPPROPRIATE_CONTENT" | "OTHER";
      description: string;
    }) => {
      if (!messageToReport) {
        return;
      }

      setReportError(null);
      try {
        await submitReportMutation.mutateAsync({
          reported_username: messageToReport.sender.username,
          related_message_id: messageToReport.id,
          reason,
          description,
        });
        setMessageToReport(null);
      } catch (reportSubmitError) {
        setReportError(
          reportSubmitError instanceof Error
            ? reportSubmitError.message
            : "Failed to submit report.",
        );
      }
    },
    [messageToReport, submitReportMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "separator") {
        return <DateSeparator dateStr={item.date} />;
      }
      return (
        <MessageBubble
          message={item.message}
          isMe={item.message.sender.username === currentUsername}
          onImagePress={(url) => setFullScreenImage(url)}
          onLongPress={
            item.message.sender.username === currentUsername
              ? undefined
              : () => {
                  setReportError(null);
                  setMessageToReport(item.message);
                }
          }
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
            testID="back-button"
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 items-center justify-center rounded-full mr-1"
          >
            <Ionicons name="arrow-back" size={22} color="#1c1c18" />
          </TouchableOpacity>

          {other ? (
            <View className="flex-row items-center flex-1 min-w-0">
              <Avatar
                name={other.display_name}
                pictureUrl={other.picture_url}
                size={40}
              />
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
          <View testID="messages-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4a7c6f" />
          </View>
        ) : messagesError ? (
          <View testID="messages-error" className="flex-1 items-center justify-center px-8">
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
            ListHeaderComponent={isRefreshing ? <ActivityIndicator size="small" color="#4a7c6f" style={{ marginVertical: 10 }} /> : null}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={<EmptyMessages />}
          />
        )}

        {/* Input Bar */}
        <View
          className="bg-surface-card border-t border-divider px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {showAttachOptions ? (
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity
                testID="attach-image-button"
                activeOpacity={0.85}
                onPress={handlePickImage}
                className="flex-row items-center bg-surface-input rounded-xl px-3 py-2"
              >
                <Ionicons name="image-outline" size={18} color="#4a7c6f" />
                <Text className="text-[13px] font-semibold text-on-surface ml-2">
                  Image
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="attach-pdf-button"
                activeOpacity={0.85}
                onPress={handlePickPdf}
                className="flex-row items-center bg-surface-input rounded-xl px-3 py-2"
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#4a7c6f"
                />
                <Text className="text-[13px] font-semibold text-on-surface ml-2">
                  PDF
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="attach-audio-button"
                activeOpacity={0.85}
                onPress={handlePickAudio}
                className="flex-row items-center bg-surface-input rounded-xl px-3 py-2"
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={18}
                  color="#4a7c6f"
                />
                <Text className="text-[13px] font-semibold text-on-surface ml-2">
                  Audio
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {attachment ? (
            <View
              testID="selected-attachment"
              className="flex-row items-center bg-surface-input rounded-xl px-3 py-2 mb-3"
            >
              <Ionicons
                name={
                  attachment.type.startsWith("image/")
                    ? "image"
                    : attachment.type.startsWith("audio/")
                    ? "musical-notes"
                    : "document-text"
                }
                size={18}
                color="#4a7c6f"
              />
              <Text
                className="text-[13px] font-semibold text-on-surface ml-2 flex-1"
                numberOfLines={1}
              >
                {attachment.name}
              </Text>
              <TouchableOpacity
                testID="selected-attachment-remove"
                activeOpacity={0.7}
                onPress={() => setAttachment(null)}
              >
                <Ionicons name="close-circle" size={20} color="#8a8172" />
              </TouchableOpacity>
            </View>
          ) : null}

          {attachmentError ? (
            <Text className="text-[12px] text-red-700 mb-2">
              {attachmentError}
            </Text>
          ) : null}

          <View className="flex-row items-end" style={{ gap: 10 }}>
            <TouchableOpacity
              testID="attachment-plus-button"
              onPress={() => setShowAttachOptions((current) => !current)}
              activeOpacity={0.8}
              disabled={sendMessage.isPending}
              className="items-center justify-center rounded-xl bg-surface-input"
              style={{
                width: 48,
                height: 48,
                opacity: sendMessage.isPending ? 0.45 : 1,
              }}
            >
              <Ionicons name="add" size={24} color="#4a7c6f" />
            </TouchableOpacity>

            <View
              className="flex-1 bg-surface-input rounded-xl px-4 py-3"
              style={{ minHeight: 48 }}
            >
              <TextInput
                testID="message-input"
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
              testID="send-button"
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={(!text.trim() && !attachment) || sendMessage.isPending}
              className="items-center justify-center rounded-xl bg-primary"
              style={{
                width: 48,
                height: 48,
                opacity:
                  (!text.trim() && !attachment) || sendMessage.isPending
                    ? 0.45
                    : 1,
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

      <ReportSheet
        visible={Boolean(messageToReport)}
        title="Report message"
        isSubmitting={submitReportMutation.isPending}
        errorMessage={reportError}
        onClose={() => {
          if (!submitReportMutation.isPending) {
            setMessageToReport(null);
          }
        }}
        onSubmit={(payload) => {
          void handleSubmitReport(payload);
        }}
      />

      <ImageViewer 
        url={fullScreenImage} 
        onClose={() => setFullScreenImage(null)} 
      />
    </View>
  );
}
