import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPostMultipart } from "@/lib/api/client";
import { appendUploadFile, type LocalUploadFile } from "@/lib/queries/uploads";
import { useFirestoreMessages } from "@/hooks/useFirestoreMessages";
import { isFirebaseAvailable } from "@/lib/firebase-client";
import { useMemo, useState, useCallback } from "react";

// ---- Types ----

export interface ProfileSummary {
  id: string;
  username: string;
  display_name: string;
  picture_url: string | null;
  title: string | null;
}

export interface Conversation {
  id: string;
  match_id: string;
  mentor: ProfileSummary;
  mentee: ProfileSummary;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: ProfileSummary;
  body: string;
  attachment_url: string | null;
  original_filename?: string | null;
  created_at: string;
  read_receipts?: Record<string, string>;
  status_for_me?: 'sent' | 'delivered' | 'read';
}

export interface SendMessageInput {
  body?: string;
  attachment?: LocalUploadFile | null;
}

// ---- Hooks ----

export function useConversations() {
  return useQuery({
    queryKey: ["messaging", "conversations"],
    queryFn: () => apiGet<Conversation[]>("/api/messages/conversations/"),
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}

/**
 * useMessages: Unified hook for real-time Firestore sync with HTTP polling fallback.
 */
export function useMessages(conversationId: string) {
  const [pageSize, setPageSize] = useState(50);
  
  const { 
    messages: firebaseMessages, 
    isLoading: fbLoading, 
    isFirebaseAvailable: fbAvailable,
    loadMore: fbLoadMore,
    hasMore: fbHasMore
  } = useFirestoreMessages(conversationId);

  const { data: httpMessages = [], isLoading: httpLoading } = useQuery({
    queryKey: ["messaging", "messages", conversationId, pageSize],
    queryFn: () =>
      apiGet<Message[]>(
        `/api/messages/conversations/${conversationId}/?page=1&pageSize=${pageSize}`,
      ),
    staleTime: 2000,
    refetchInterval: 2000, // Poll every 2s
    enabled: !!conversationId && (!isFirebaseAvailable() || !fbAvailable),
  });

  const mergedMessages = useMemo(() => {
    const remoteMessages = fbAvailable ? firebaseMessages : httpMessages;
    
    // Transform Firebase messages to match the Message interface if needed
    return (remoteMessages as any[]).map(msg => {
      if ('sender_username' in msg) {
        // This is a Firebase message, transform it
        const status = (msg.read_receipts?.[msg.sender_id] || 'sent') as 'sent' | 'delivered' | 'read';
        return {
          id: msg.id,
          conversation_id: conversationId,
          sender: {
            id: msg.sender_id,
            username: msg.sender_username,
            display_name: msg.sender_display_name,
            picture_url: msg.sender_picture_url,
            title: null,
          },
          body: msg.body,
          attachment_url: msg.attachment_url,
          original_filename: msg.original_filename,
          created_at: msg.created_at,
          read_receipts: msg.read_receipts,
          status_for_me: status,
        } as Message;
      }
      return msg; // Already a Message from API
    }).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [fbAvailable, firebaseMessages, httpMessages, conversationId]);

  const loadMore = useCallback(() => {
    if (fbAvailable) {
      fbLoadMore();
    } else {
      setPageSize(prev => prev + 50);
    }
  }, [fbAvailable, fbLoadMore]);

  return {
    data: mergedMessages,
    isLoading: fbAvailable ? fbLoading : httpLoading,
    loadMore,
    hasMore: fbAvailable ? fbHasMore : httpMessages.length >= pageSize
  };
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body = "", attachment = null }: SendMessageInput) => {
      const formData = new FormData();
      if (body) {
        formData.append("body", body);
      }
      if (attachment) {
        await appendUploadFile(formData, "attachment", attachment);
      }

      return apiPostMultipart<Message>(
        `/api/messages/conversations/${conversationId}/`,
        formData,
      );
    },
    onSuccess: () => {
        // Invalidate to refresh the thread
        queryClient.invalidateQueries({ queryKey: ["messaging", "messages", conversationId] });
    }
  });
}

/**
 * useMarkRead: Batch marking of a conversation as read with optimistic updates for mobile.
 */
export function useMarkRead(conversationId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            return apiGet(`/api/messages/conversations/${conversationId}/mark-read/`);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['messaging', 'conversations'] });
            const previousConversations = queryClient.getQueryData<Conversation[]>(['messaging', 'conversations']);
            
            queryClient.setQueryData<Conversation[]>(['messaging', 'conversations'], (old) => {
                return old?.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c);
            });

            return { previousConversations };
        },
        onError: (_err, _newVal, context) => {
            if (context?.previousConversations) {
                queryClient.setQueryData(['messaging', 'conversations'], context.previousConversations);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
            queryClient.invalidateQueries({ queryKey: ['messaging', 'messages', conversationId] });
        }
    });
}
