import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPostMultipart } from "@/lib/api/client";
import { appendUploadFile, type LocalUploadFile } from "@/lib/queries/uploads";

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
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: ProfileSummary;
  body: string;
  attachment_url: string | null;
  created_at: string;
}

export interface SendMessageInput {
  body?: string;
  attachment?: LocalUploadFile | null;
}

export function useConversations() {
  return useQuery({
    queryKey: ["messaging", "conversations"],
    queryFn: () => apiGet<Conversation[]>("/api/messages/conversations/"),
    staleTime: 30 * 1000,
    refetchOnMount: "always",
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messaging", "messages", conversationId],
    queryFn: () =>
      apiGet<Message[]>(
        `/api/messages/conversations/${conversationId}/?page=1&pageSize=50`,
      ),
    staleTime: 2000,
    refetchInterval: 2000,
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
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
  });
}
