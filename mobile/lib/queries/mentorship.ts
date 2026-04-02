import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api/client";

export interface DashboardRequestItem {
  id: string;
  user: string;
  topic: string;
  type: "incoming" | "outgoing";
  message?: string;
  proposedDate?: string;
  isReschedule?: boolean;
}

export interface AvailabilityDayItem {
  day: string;
  times: string[];
}

interface BackendProfileSummary {
  username: string;
  display_name: string;
}

interface BackendMentorshipRequest {
  id: string;
  mentor: BackendProfileSummary;
  mentee: BackendProfileSummary;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  cover_letter: string;
  created_at: string;
}

interface BackendAvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  is_booked: boolean;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const PROPOSED_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

/**
 * Fetch all mentorship requests for the authenticated user.
 */
export function useMentorshipRequestsQuery() {
  return useQuery({
    queryKey: ["mentorship", "requests", "me"],
    queryFn: () =>
      apiGet<BackendMentorshipRequest[]>("/api/mentorship/requests/me/"),
    staleTime: 60_000,
  });
}

/**
 * Fetch all availability slots for a given profile username.
 *
 * @param username Profile username path parameter.
 */
export function useAvailabilitySlotsQuery(username: string) {
  return useQuery({
    queryKey: ["profiles", username, "availability-slots"],
    queryFn: () =>
      apiGet<BackendAvailabilitySlot[]>(
        `/api/profiles/${username}/availability-slots/`,
      ),
    enabled: Boolean(username),
    staleTime: 60_000,
  });
}

/**
 * Map backend mentorship request payloads to dashboard UI items.
 *
 * @param requests Raw backend response.
 * @param currentUsername Current authenticated profile username.
 */
export function mapRequestsToDashboard(
  requests: BackendMentorshipRequest[],
  currentUsername: string,
): DashboardRequestItem[] {
  return requests
    .filter((item) => item.status === "PENDING")
    .map((item) => {
      const isIncoming = item.mentor.username === currentUsername;
      const peer = isIncoming ? item.mentee : item.mentor;
      const createdAt = new Date(item.created_at);

      return {
        id: item.id,
        user: peer.display_name || peer.username,
        topic: "Mentorship Request",
        type: isIncoming ? "incoming" : "outgoing",
        message: item.cover_letter || undefined,
        proposedDate: `${PROPOSED_DATE_FORMATTER.format(createdAt)} (requested)`,
      };
    });
}

/**
 * Group backend availability slots by weekday to match current UI contract.
 *
 * @param slots Raw backend availability slot list.
 */
export function mapAvailabilityToSchedule(
  slots: BackendAvailabilitySlot[],
): AvailabilityDayItem[] {
  const dayMap = new Map<string, string[]>();

  slots.forEach((slot) => {
    if (slot.is_booked) {
      return;
    }

    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const range = `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`;
    const dayRanges = dayMap.get(day) ?? [];

    dayRanges.push(range);
    dayMap.set(day, dayRanges);
  });

  return Array.from(dayMap.entries()).map(([day, times]) => ({ day, times }));
}
