import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/api/config";
import { useAuthStore } from "@/lib/auth/store";

export interface DashboardRequestItem {
  id: string;
  requestId: string;
  user: string;
  topic: string;
  type: "incoming" | "outgoing";
  mentorUsername: string;
  menteeUsername: string;
  slotId?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  message?: string;
  proposedDate?: string;
  isReschedule?: boolean;
}

type BackendRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface DashboardSessionItem {
  id: string;
  requestId: string;
  user: string;
  date: string;
  rawDate: string;
  time: string;
  status: "Upcoming" | "Pending" | "Completed";
  topic: string;
  myRole: "Mentor" | "Mentee";
}

export interface AvailabilityDayItem {
  day: string;
  times: Array<{
    id: string;
    label: string;
    isBooked: boolean;
  }>;
}

interface BackendProfileSummary {
  id: string;
  username: string;
  display_name: string;
  picture_url: string;
  title: string;
}

interface BackendMentorshipRequest {
  id: string;
  mentor: BackendProfileSummary;
  mentee: BackendProfileSummary;
  slot_id: string | null;
  slot_date: string | null;
  slot_start_time: string | null;
  slot_end_time: string | null;
  status: BackendRequestStatus;
  cover_letter: string;
  created_at: string;
  responded_at: string | null;
}

interface BackendMatch {
  id: string;
  mentor: BackendProfileSummary;
  mentee: BackendProfileSummary;
  request_id: string;
  is_active: boolean;
}

interface BackendUpcomingSession {
  slot_id: string;
  mentor: BackendProfileSummary;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  status: BackendRequestStatus;
  booked_at: string;
}

interface BackendAvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  is_booked: boolean;
}

interface CreateAvailabilitySlotPayload {
  date: string;
  startTime: string;
  endTime: string;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const PROPOSED_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

const SESSION_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

function toDisplayTime(value: string | null): string {
  if (!value) {
    return "TBD";
  }
  return value.slice(0, 5);
}

function parseLocalDateTime(dateValue: string, timeValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes, seconds = "0"] = timeValue.split(":");

  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
}

function toProposedDate(value: BackendMentorshipRequest): string | undefined {
  if (!value.slot_date || !value.slot_start_time) {
    return undefined;
  }

  const date = new Date(`${value.slot_date}T00:00:00`);
  const label = PROPOSED_DATE_FORMATTER.format(date);
  const start = toDisplayTime(value.slot_start_time);
  const end = value.slot_end_time
    ? toDisplayTime(value.slot_end_time)
    : undefined;
  return end ? `${label} ${start}-${end}` : `${label} ${start}`;
}

/**
 * Fetch all mentorship requests for the authenticated user.
 */
export function useMentorshipRequestsQuery(currentUsername?: string) {
  return useQuery({
    queryKey: ["mentorship", "requests", "me", currentUsername ?? "anonymous"],
    queryFn: () =>
      apiGet<BackendMentorshipRequest[]>("/api/mentorship/requests/me/"),
    enabled: Boolean(currentUsername),
    refetchOnMount: "always",
    staleTime: 60_000,
  });
}

/**
 * Fetch all active mentorship matches for the authenticated user.
 */
export function useMentorshipMatchesQuery(currentUsername?: string) {
  return useQuery({
    queryKey: ["mentorship", "matches", "me", currentUsername ?? "anonymous"],
    queryFn: () => apiGet<BackendMatch[]>("/api/mentorship/matches/me/"),
    enabled: Boolean(currentUsername),
    refetchOnMount: "always",
    staleTime: 60_000,
  });
}

/**
 * Fetch upcoming sessions for the authenticated mentee.
 */
export function useMentorshipUpcomingSessionsQuery(currentUsername?: string) {
  return useQuery({
    queryKey: [
      "mentorship",
      "sessions",
      "me",
      "upcoming",
      currentUsername ?? "anonymous",
    ],
    queryFn: () =>
      apiGet<BackendUpcomingSession[]>("/api/mentorship/sessions/me/upcoming/"),
    enabled: Boolean(currentUsername),
    refetchOnMount: "always",
    staleTime: 60_000,
  });
}

interface CreateMentorshipRequestPayload {
  mentor_username: string;
  slot_id: string;
  cover_letter?: string;
}

/**
 * Create a mentorship request for a selected mentor slot.
 */
export function useCreateMentorshipRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMentorshipRequestPayload) =>
      apiPost<BackendMentorshipRequest, CreateMentorshipRequestPayload>(
        "/api/mentorship/requests/",
        payload,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mentorship", "requests", "me"],
      });
    },
  });
}

interface RespondToMentorshipRequestPayload {
  requestId: string;
  action: "accept" | "reject";
}

/**
 * Accept or reject a pending mentorship request.
 */
export function useRespondToMentorshipRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, action }: RespondToMentorshipRequestPayload) =>
      apiPost<
        BackendMentorshipRequest,
        {
          action: "accept" | "reject";
        }
      >(`/api/mentorship/requests/${requestId}/respond/`, { action }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "requests", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "matches", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "sessions", "me", "upcoming"],
        }),
      ]);
    },
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
 * Create an availability slot for the authenticated mentor.
 */
export function useCreateAvailabilitySlotMutation(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAvailabilitySlotPayload) =>
      apiPost<BackendAvailabilitySlot, CreateAvailabilitySlotPayload>(
        `/api/profiles/${username}/availability-slots/`,
        payload,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profiles", username, "availability-slots"],
      });
    },
  });
}

/**
 * Delete an availability slot for the authenticated mentor.
 */
export function useDeleteAvailabilitySlotMutation(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotId: string) => {
      const accessToken = useAuthStore.getState().accessToken;
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/${username}/availability-slots/${slotId}/`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete availability slot.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profiles", username, "availability-slots"],
      });
    },
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
      const fallbackDate = `${PROPOSED_DATE_FORMATTER.format(createdAt)} (requested)`;

      return {
        id: item.id,
        requestId: item.id,
        user: peer.display_name || peer.username,
        topic: "Mentorship Request",
        type: isIncoming ? "incoming" : "outgoing",
        mentorUsername: item.mentor.username,
        menteeUsername: item.mentee.username,
        slotId: item.slot_id ?? undefined,
        status: item.status,
        message: item.cover_letter || undefined,
        proposedDate: toProposedDate(item) || fallbackDate,
      };
    });
}

/**
 * Build session cards from active matches and accepted request slot data.
 */
export function mapMatchesToSessions(
  requests: BackendMentorshipRequest[],
  matches: BackendMatch[],
  currentUsername: string,
): DashboardSessionItem[] {
  const acceptedById = new Map(
    requests
      .filter((request) => request.status === "ACCEPTED")
      .map((request) => [request.id, request]),
  );

  const now = new Date();
  const sessionItems: DashboardSessionItem[] = [];

  matches
    .filter((match) => match.is_active)
    .forEach((match) => {
      const request = acceptedById.get(match.request_id);
      if (!request?.slot_date || !request.slot_start_time) {
        return;
      }

      const isMentor = match.mentor.username === currentUsername;
      const peer = isMentor ? match.mentee : match.mentor;

      const sessionDate = parseLocalDateTime(
        request.slot_date,
        request.slot_start_time,
      );
      const status: DashboardSessionItem["status"] =
        sessionDate < now ? "Completed" : "Upcoming";

      sessionItems.push({
        id: match.id,
        requestId: request.id,
        user: peer.display_name || peer.username,
        date: SESSION_DATE_FORMATTER.format(sessionDate),
        rawDate: request.slot_date,
        time: request.slot_end_time
          ? `${toDisplayTime(request.slot_start_time)} - ${toDisplayTime(request.slot_end_time)}`
          : toDisplayTime(request.slot_start_time),
        status,
        topic: "Mentorship Session",
        myRole: isMentor ? "Mentor" : "Mentee",
      });
    });

  return sessionItems.sort((a, b) => {
    const aStartTime = a.time.split(" - ")[0] ?? "00:00";
    const bStartTime = b.time.split(" - ")[0] ?? "00:00";
    return (
      parseLocalDateTime(a.rawDate, `${aStartTime}:00`).getTime() -
      parseLocalDateTime(b.rawDate, `${bStartTime}:00`).getTime()
    );
  });
}

/**
 * Build session cards from dedicated upcoming sessions endpoint.
 */
export function mapUpcomingSessionsToDashboard(
  sessions: BackendUpcomingSession[],
): DashboardSessionItem[] {
  return sessions
    .map((session) => {
      const sessionDate = parseLocalDateTime(
        session.slot_date,
        session.slot_start_time,
      );
      const uiStatus: DashboardSessionItem["status"] =
        session.status === "PENDING" ? "Pending" : "Upcoming";

      return {
        id: session.slot_id,
        requestId: session.slot_id,
        user: session.mentor.display_name || session.mentor.username,
        date: SESSION_DATE_FORMATTER.format(sessionDate),
        rawDate: session.slot_date,
        time: `${toDisplayTime(session.slot_start_time)} - ${toDisplayTime(session.slot_end_time)}`,
        status: uiStatus,
        topic: "Mentorship Session",
        myRole: "Mentee" as const,
      };
    })
    .sort((a, b) => {
      const aStartTime = a.time.split(" - ")[0] ?? "00:00";
      const bStartTime = b.time.split(" - ")[0] ?? "00:00";
      return (
        parseLocalDateTime(a.rawDate, `${aStartTime}:00`).getTime() -
        parseLocalDateTime(b.rawDate, `${bStartTime}:00`).getTime()
      );
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
  const dayMap = new Map<
    string,
    Array<{
      id: string;
      label: string;
      isBooked: boolean;
    }>
  >();

  slots.forEach((slot) => {
    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const daySlots = dayMap.get(day) ?? [];

    daySlots.push({
      id: slot.id,
      label: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      isBooked: slot.is_booked,
    });

    dayMap.set(day, daySlots);
  });

  return Array.from(dayMap.entries()).map(([day, times]) => ({ day, times }));
}
