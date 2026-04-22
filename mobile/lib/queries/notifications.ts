import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href } from "expo-router";

import { apiGet, apiPut } from "@/lib/api/client";

export interface BackendNotificationActor {
  username?: string;
  display_name?: string;
  picture_url?: string;
}

export interface BackendNotification {
  id: string;
  type: string;
  title?: string;
  message: string;
  action_url?: string;
  extra_metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  actor?: BackendNotificationActor | null;
  resource_type?: string | null;
  resource_id?: string | null;
}

export interface MobileNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actorName?: string;
  actionUrl?: string;
  targetPath?: Href;
}

export const notificationsQueryKey = (username?: string) => [
  "notifications",
  "me",
  username ?? "anonymous",
] as const;

function prettifyNotificationType(type: string): string {
  return type
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getNotificationTitle(notification: BackendNotification): string {
  if (notification.title?.trim()) {
    return notification.title.trim();
  }

  switch (notification.type) {
    case "new_message":
    case "incoming_message":
    case "message_received":
      return "New message";
    case "new_mentorship_request":
    case "new_request":
    case "request_received":
      return "New request";
    case "new_match":
    case "request_accepted":
      return "Request accepted";
    case "mentorship_request_rejected":
    case "request_rejected":
      return "Request declined";
    case "slot_booked":
      return "Slot booked";
    case "session_canceled":
      return "Session canceled";
    case "session_rescheduled":
      return "Session rescheduled";
    case "match_deactivated":
      return "Connection ended";
    case "new_feedback_available":
    case "feedback_received":
      return "New feedback";
    default:
      return prettifyNotificationType(notification.type);
  }
}

export function getNotificationTargetPath(
  notification: Pick<
    BackendNotification,
    "type" | "resource_type" | "action_url" | "extra_metadata"
  >,
): Href | undefined {
  const extraMetadata = notification.extra_metadata ?? {};
  const metadataTargetPath =
    typeof extraMetadata.target_path === "string"
      ? extraMetadata.target_path
      : undefined;
  if (metadataTargetPath?.startsWith("/")) {
    return metadataTargetPath as Href;
  }

  const normalizedResourceType = notification.resource_type?.toLowerCase();

  if (
    normalizedResourceType === "meeting_session" ||
    normalizedResourceType === "session" ||
    normalizedResourceType === "availability_slot" ||
    notification.type === "slot_booked" ||
    notification.type.startsWith("session_")
  ) {
    return "/(tabs)/schedule";
  }

  if (
    normalizedResourceType === "conversation" ||
    normalizedResourceType === "message" ||
    normalizedResourceType === "mentorship_request" ||
    normalizedResourceType === "match" ||
    notification.type === "new_message" ||
    notification.type === "new_mentorship_request" ||
    notification.type === "mentorship_request_rejected" ||
    notification.type === "new_match" ||
    notification.type === "incoming_message" ||
    notification.type === "message_received" ||
    notification.type === "new_request" ||
    notification.type === "request_received" ||
    notification.type === "request_accepted" ||
    notification.type === "request_rejected" ||
    notification.type === "new_match" ||
    notification.type === "match_deactivated"
  ) {
    return "/(tabs)/connections";
  }

  if (
    notification.type === "feedback_received" ||
    notification.type === "new_feedback_available"
  ) {
    return "/(tabs)/profile";
  }

  return undefined;
}

export function mapBackendNotification(
  notification: BackendNotification,
): MobileNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: getNotificationTitle(notification),
    message: notification.message,
    isRead: notification.is_read,
    createdAt: notification.created_at,
    actorName:
      notification.actor?.display_name?.trim() ||
      notification.actor?.username?.trim() ||
      undefined,
    actionUrl: notification.action_url,
    targetPath: getNotificationTargetPath(notification),
  };
}

export function formatNotificationTimestamp(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

async function fetchNotifications(): Promise<MobileNotification[]> {
  const response = await apiGet<BackendNotification[]>("/api/notifications/");
  return response.map(mapBackendNotification);
}

export function useNotificationsQuery(username?: string) {
  return useQuery({
    queryKey: notificationsQueryKey(username),
    queryFn: fetchNotifications,
    enabled: Boolean(username),
    staleTime: 10_000,
    refetchOnMount: "always",
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationReadMutation(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiPut<{ detail: string }>(
        `/api/notifications/${encodeURIComponent(notificationId)}/read/`,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKey(username),
      });
    },
  });
}
