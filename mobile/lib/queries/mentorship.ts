import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

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
  matchId?: string;
  sessionId?: string;
  mentorUsername?: string;
  user: string;
  date: string;
  rawDate: string;
  time: string;
  status: "Upcoming" | "Pending" | "Completed";
  topic: string;
  myRole: "Mentor" | "Mentee";
  isSessionStarted?: boolean;
}

export interface AvailabilityDayItem {
  day: string;
  times: {
    id: string;
    label: string;
    isBooked: boolean;
    date?: string;
  }[];
}

export type TimelineCategory = "AGTE" | "MCTE" | "PrP" | "CoP";
export type MCTEEventType = "achievement" | "social" | "progress";

export interface TimelineEvent {
  id: string;
  category: TimelineCategory;
  event_type: string;
  timestamp: string;
  actor_role?: string | null;
  author?: BackendProfileSummary | null;
  content?: string;
  payload: Record<string, unknown>;
  show_on_profile: boolean;
  is_editable: boolean;
}

export interface MatchJourneyFeed {
  ordering: "desc";
  count: number;
  offset: number;
  limit: number;
  results: TimelineEvent[];
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

export type MentorshipRequest = BackendMentorshipRequest;

interface BackendMatch {
  id: string;
  mentor: BackendProfileSummary;
  mentee: BackendProfileSummary;
  request_id: string;
  is_active: boolean;
}

interface BackendFeedback {
  id: string;
  match: string;
  submitted_by: BackendProfileSummary;
  rating: number;
  text: string;
  created_at: string;
}

interface SubmitFeedbackPayload {
  matchId: string;
  rating: number;
  text?: string;
}

interface RescheduleSessionPayload {
  sessionId: string;
  newSlotId: string;
  mentorUsername?: string;
}

export type MentorshipMatch = BackendMatch;
export type MatchFeedback = BackendFeedback;

interface BackendUpcomingSession {
  slot_id: string;
  mentor: BackendProfileSummary;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  status: BackendRequestStatus;
  booked_at: string;
}

type MeetingSessionRoleFilter = "mentor" | "mentee" | "all";
type MeetingSessionStatusFilter =
  | "upcoming"
  | "past"
  | "scheduled"
  | "rescheduled"
  | "canceled"
  | "completed";

interface BackendMeetingSession {
  session_id: string;
  match_id: string;
  mentor: BackendProfileSummary;
  mentee: BackendProfileSummary;
  source_slot_id: string | null;
  scheduled_start_at: string;
  scheduled_end_at: string;
  status: "SCHEDULED" | "RESCHEDULED" | "CANCELED" | "COMPLETED";
  display_status: "SCHEDULED" | "RESCHEDULED" | "CANCELED" | "COMPLETED";
  my_role: "MENTOR" | "MENTEE" | "UNKNOWN";
  allowed_actions: string[];
  canceled_by_role: "MENTOR" | "MENTEE" | null;
  cancel_reason: string;
  created_at: string;
  updated_at: string;
}

export type BackendJourneyEvent = Partial<TimelineEvent> & {
  type?: string;
  event_type?: string;
  payload?: Record<string, unknown> | null;
};

export interface BackendJourneyFeed {
  ordering: "desc";
  count: number;
  offset: number;
  limit: number;
  results: BackendJourneyEvent[];
}

export interface CreateTimelineEventPayload {
  matchId: string;
  event_type: MCTEEventType;
  content: string;
  timestamp?: string;
  show_on_profile?: boolean;
}

export interface UpdateTimelineEventPayload {
  matchId: string;
  eventId: string;
  event_type?: MCTEEventType;
  content?: string;
  timestamp?: string;
  show_on_profile?: boolean;
}

export interface DeleteTimelineEventPayload {
  matchId: string;
  eventId: string;
  show_on_profile?: boolean;
}

interface MeetingSessionQueryParams {
  role?: MeetingSessionRoleFilter;
  status?: MeetingSessionStatusFilter;
}

interface BackendAvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  is_booked: boolean;
  bookedBy?: string | null;
  bookedAt?: string | null;
  sessionId?: string | null;
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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalIsoDate(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalIsoTime(value: string): string {
  const date = new Date(value);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function toDashboardSessionStatus(
  status: BackendMeetingSession["display_status"],
): DashboardSessionItem["status"] {
  if (status === "COMPLETED" || status === "CANCELED") {
    return "Completed";
  }
  return "Upcoming";
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

function normalizeTimelineEvent(event: BackendJourneyEvent): TimelineEvent {
  return {
    id: String(event.id ?? ""),
    category: event.category ?? "AGTE",
    event_type: event.event_type ?? event.type ?? "journey_event",
    timestamp: String(event.timestamp ?? new Date().toISOString()),
    actor_role: event.actor_role ?? null,
    author: event.author ?? null,
    content: event.content,
    payload: event.payload ?? {},
    show_on_profile: event.show_on_profile ?? false,
    is_editable: event.is_editable ?? false,
  };
}

export function mapJourneyFeedToTimelineEvents(
  feed: BackendJourneyFeed,
): MatchJourneyFeed {
  return {
    ordering: feed.ordering,
    count: feed.count,
    offset: feed.offset,
    limit: feed.limit,
    results: feed.results.map(normalizeTimelineEvent),
  };
}

/**
 * Helper to sort sessions: Active sessions first, then sorted by date.
 */
function sortSessionsChronologically(
  a: DashboardSessionItem,
  b: DashboardSessionItem,
) {
  const weightA = a.status === "Completed" ? 1 : 0;
  const weightB = b.status === "Completed" ? 1 : 0;
  if (weightA !== weightB) {
    return weightA - weightB;
  }

  const aStartTime = a.time.split(" - ")[0] ?? "00:00";
  const bStartTime = b.time.split(" - ")[0] ?? "00:00";
  return (
    parseLocalDateTime(a.rawDate, `${aStartTime}:00`).getTime() -
    parseLocalDateTime(b.rawDate, `${bStartTime}:00`).getTime()
  );
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
 * List feedback entries for a match (mentor/mentee participants only).
 */
export function useMatchFeedbackQuery(matchId?: string) {
  return useQuery({
    queryKey: ["mentorship", "matches", matchId ?? "unknown", "feedback"],
    queryFn: () =>
      apiGet<BackendFeedback[]>(
        `/api/mentorship/matches/${encodeURIComponent(matchId || "")}/feedback/`,
      ),
    enabled: Boolean(matchId),
    staleTime: 60_000,
  });
}

/**
 * Fetch private journey timeline events for a mentorship match.
 *
 * The current backend returns AGTE lifecycle events; the unified timeline
 * response from #462 can also include MCTE records.
 */
export function useMatchJourneyQuery(matchId?: string) {
  return useQuery({
    queryKey: ["mentorship", "matches", matchId ?? "unknown", "journey"],
    queryFn: async () => {
      const feed = await apiGet<BackendJourneyFeed>(
        `/api/mentorship/matches/${encodeURIComponent(matchId || "")}/journey/`,
      );
      return mapJourneyFeedToTimelineEvents(feed);
    },
    enabled: Boolean(matchId),
    staleTime: 60_000,
  });
}

/**
 * Create a manually-authored journey event for a match.
 */
export function useCreateTimelineEventMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      event_type,
      content,
      timestamp,
      show_on_profile,
    }: CreateTimelineEventPayload) =>
      apiPost<TimelineEvent, Omit<CreateTimelineEventPayload, "matchId">>(
        `/api/mentorship/matches/${encodeURIComponent(matchId)}/journey/events/`,
        {
          event_type,
          content,
          ...(timestamp ? { timestamp } : {}),
          show_on_profile: show_on_profile ?? false,
        },
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "matches", variables.matchId, "journey"],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "matches",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        variables.show_on_profile
          ? queryClient.invalidateQueries({ queryKey: ["profiles"] })
          : Promise.resolve(),
      ]);
    },
  });
}

/**
 * Update an editable manually-authored journey event.
 */
export function useUpdateTimelineEventMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      eventId,
      event_type,
      content,
      timestamp,
      show_on_profile,
    }: UpdateTimelineEventPayload) =>
      apiPatch<TimelineEvent, Omit<UpdateTimelineEventPayload, "matchId" | "eventId">>(
        `/api/mentorship/matches/${encodeURIComponent(matchId)}/journey/events/${encodeURIComponent(eventId)}/`,
        {
          ...(event_type ? { event_type } : {}),
          ...(content !== undefined ? { content } : {}),
          ...(timestamp ? { timestamp } : {}),
          ...(show_on_profile !== undefined ? { show_on_profile } : {}),
        },
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "matches", variables.matchId, "journey"],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "matches",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        variables.show_on_profile !== undefined
          ? queryClient.invalidateQueries({ queryKey: ["profiles"] })
          : Promise.resolve(),
      ]);
    },
  });
}

/**
 * Delete an editable manually-authored journey event.
 */
export function useDeleteTimelineEventMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, eventId }: DeleteTimelineEventPayload) =>
      apiDelete(
        `/api/mentorship/matches/${encodeURIComponent(matchId)}/journey/events/${encodeURIComponent(eventId)}/`,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "matches", variables.matchId, "journey"],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "matches",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        variables.show_on_profile
          ? queryClient.invalidateQueries({ queryKey: ["profiles"] })
          : Promise.resolve(),
      ]);
    },
  });
}

/**
 * Submit match feedback as mentor or mentee.
 */
export function useSubmitMatchFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, rating, text }: SubmitFeedbackPayload) =>
      apiPost<BackendFeedback, { rating: number; text?: string }>(
        `/api/mentorship/matches/${encodeURIComponent(matchId)}/feedback/`,
        {
          rating,
          ...(text ? { text } : {}),
        },
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "matches", variables.matchId, "feedback"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles"],
        }),
      ]);
    },
  });
}

/**
 * Cancel a booked session for a match. Mentor and mentee are both permitted.
 */
export function useCancelSessionMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiPost<BackendMentorshipRequest>(
        `/api/mentorship/sessions/${encodeURIComponent(sessionId)}/cancel/`,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "meeting-sessions", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "matches",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "requests",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles"],
        }),
      ]);
    },
  });
}

/**
 * Reschedule a booked session to another mentor availability slot.
 */
export function useRescheduleSessionMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, newSlotId }: RescheduleSessionPayload) =>
      apiPost<BackendMentorshipRequest, { new_slot_id: string }>(
        `/api/mentorship/sessions/${encodeURIComponent(sessionId)}/reschedule/`,
        { new_slot_id: newSlotId },
      ),
    onSuccess: async (_data, variables) => {
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "meeting-sessions", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "matches",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "requests",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles"],
        }),
      ];

      if (variables.mentorUsername) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              "profiles",
              variables.mentorUsername,
              "availability-slots",
            ],
          }),
        );
      }

      await Promise.all(invalidations);
    },
  });
}

/**
 * Deactivate a mentorship match (idempotent endpoint).
 */
export function useDeactivateMatchMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) =>
      apiPost<BackendMatch>(
        `/api/mentorship/matches/${encodeURIComponent(matchId)}/deactivate/`,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "matches",
            "me",
            currentUsername ?? "anonymous",
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "requests", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "meeting-sessions", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles"],
        }),
      ]);
    },
  });
}

/**
 * Fetch canonical meeting sessions for the authenticated user.
 */
async function fetchMeetingSessions(
  params: MeetingSessionQueryParams = {},
): Promise<BackendMeetingSession[]> {
  const query = new URLSearchParams();
  if (params.role && params.role !== "all") {
    query.set("role", params.role);
  }
  if (params.status) {
    query.set("status", params.status);
  }

  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";

  return apiGet<BackendMeetingSession[]>(
    `/api/mentorship/meeting-sessions/me/${suffix}`,
  );
}

/**
 * Fetch canonical meeting sessions for mobile dashboard/schedule consumers.
 */
export function useMentorshipMeetingSessionsQuery(
  currentUsername?: string,
  params: MeetingSessionQueryParams = {},
) {
  return useQuery({
    queryKey: [
      "mentorship",
      "meeting-sessions",
      "me",
      params.role ?? "all",
      params.status ?? "all",
      currentUsername ?? "anonymous",
    ],
    queryFn: () => fetchMeetingSessions(params),
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

interface BookAvailabilitySlotPayload {
  mentorUsername: string;
  slotId: string;
}

interface BookAvailabilitySlotResponse {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  is_booked: boolean;
  bookedBy?: string | null;
  bookedAt?: string | null;
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

/**
 * Book a mentor availability slot directly (used when mentor-mentee connection already exists).
 */
export function useBookAvailabilitySlotMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mentorUsername, slotId }: BookAvailabilitySlotPayload) =>
      apiPost<BookAvailabilitySlotResponse>(
        `/api/profiles/${mentorUsername}/availability-slots/${slotId}/book/`,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "mentorship",
            "sessions",
            "me",
            "upcoming",
            currentUsername ?? "anonymous",
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["mentorship", "meeting-sessions", "me"],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "profiles",
            variables.mentorUsername,
            "availability-slots",
          ],
        }),
      ]);
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
          queryKey: ["mentorship", "meeting-sessions", "me"],
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
export function useAvailabilitySlotsQuery(username: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["profiles", username, "availability-slots"],
    queryFn: () =>
      apiGet<BackendAvailabilitySlot[]>(
        `/api/profiles/${username}/availability-slots/`,
      ),
    enabled: Boolean(username) && enabled,
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
        "/api/profiles/me/availability-slots/",
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
    mutationFn: (slotId: string) =>
      apiDelete(
        `/api/profiles/me/availability-slots/${encodeURIComponent(slotId)}/`,
      ),
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
 * Build mentor-side session cards from booked availability slots.
 * Enriches with mentee display_name from matches data.
 */
export function mapMentorBookedSlotsToSessions(
  slots: BackendAvailabilitySlot[],
  matches?: BackendMatch[],
): DashboardSessionItem[] {
  const menteeByUsername = new Map(
    (matches ?? []).map((match) => [
      match.mentee.username,
      match.mentee.display_name || match.mentee.username,
    ]),
  );

  const now = new Date();

  return slots
    .filter((slot) => slot.is_booked && Boolean(slot.bookedBy))
    .map((slot) => {
      const sessionStart = parseLocalDateTime(
        slot.date,
        `${slot.startTime}:00`,
      );
      const sessionEnd = parseLocalDateTime(slot.date, `${slot.endTime}:00`);
      const isCompleted = now > sessionEnd;
      const isStarted = now >= sessionStart;

      const menteeDisplay =
        menteeByUsername.get(slot.bookedBy ?? "") || slot.bookedBy || "Mentee";

      const status: DashboardSessionItem["status"] = isCompleted
        ? "Completed"
        : "Upcoming";

      return {
        id: slot.id,
        requestId: slot.id,
        user: menteeDisplay,
        date: SESSION_DATE_FORMATTER.format(sessionStart),
        rawDate: slot.date,
        time: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
        status,
        topic: "Mentorship Session",
        myRole: "Mentor" as "Mentor" | "Mentee",
        isSessionStarted: isStarted,
      };
    })
    .sort(sortSessionsChronologically);
}

/**
 * Build session cards from canonical meeting sessions endpoint.
 */
export function mapMeetingSessionsToDashboard(
  sessions: BackendMeetingSession[],
): DashboardSessionItem[] {
  const now = new Date();
  const latestActiveSessionByMatch = new Map<string, BackendMeetingSession>();
  const nonActiveSessions: BackendMeetingSession[] = [];

  sessions.forEach((session) => {
    const isActive =
      session.display_status === "SCHEDULED" ||
      session.display_status === "RESCHEDULED";

    if (!isActive) {
      nonActiveSessions.push(session);
      return;
    }

    const current = latestActiveSessionByMatch.get(session.match_id);
    if (!current) {
      latestActiveSessionByMatch.set(session.match_id, session);
      return;
    }

    const currentUpdatedAt = new Date(current.updated_at).getTime();
    const nextUpdatedAt = new Date(session.updated_at).getTime();

    if (nextUpdatedAt > currentUpdatedAt) {
      latestActiveSessionByMatch.set(session.match_id, session);
      return;
    }

    if (
      nextUpdatedAt === currentUpdatedAt &&
      new Date(session.scheduled_start_at).getTime() >
        new Date(current.scheduled_start_at).getTime()
    ) {
      latestActiveSessionByMatch.set(session.match_id, session);
    }
  });

  const normalizedSessions = [
    ...latestActiveSessionByMatch.values(),
    ...nonActiveSessions,
  ];

  return normalizedSessions
    .map((session) => {
      const startAt = new Date(session.scheduled_start_at);
      const endAt = new Date(session.scheduled_end_at);
      const myRole: DashboardSessionItem["myRole"] =
        session.my_role === "MENTOR" ? "Mentor" : "Mentee";
      const peer =
        session.my_role === "MENTOR" ? session.mentee : session.mentor;
      const rawDate = toLocalIsoDate(session.scheduled_start_at);

      return {
        id: session.source_slot_id ?? session.session_id,
        requestId: session.match_id,
        matchId: session.match_id,
        sessionId: session.session_id,
        mentorUsername:
          session.my_role === "MENTEE" ? session.mentor.username : undefined,
        user: peer.display_name || peer.username,
        date: SESSION_DATE_FORMATTER.format(startAt),
        rawDate,
        time: `${toDisplayTime(toLocalIsoTime(session.scheduled_start_at))} - ${toDisplayTime(toLocalIsoTime(session.scheduled_end_at))}`,
        status: toDashboardSessionStatus(session.display_status),
        topic: "Mentorship Session",
        myRole,
        isSessionStarted: now >= startAt && now <= endAt,
      };
    })
    .sort(sortSessionsChronologically);
}

/**
 * Build session cards from dedicated upcoming sessions endpoint.
 */
export function mapUpcomingSessionsToDashboard(
  sessions: BackendUpcomingSession[],
): DashboardSessionItem[] {
  const now = new Date();

  return sessions
    .map((session) => {
      const sessionStart = parseLocalDateTime(
        session.slot_date,
        session.slot_start_time,
      );
      const sessionEnd = session.slot_end_time
        ? parseLocalDateTime(session.slot_date, session.slot_end_time)
        : sessionStart;

      const isStarted = now >= sessionStart;

      let uiStatus: DashboardSessionItem["status"] = "Upcoming";
      if (session.status === "PENDING") {
        uiStatus = "Pending";
      } else if (now > sessionEnd) {
        uiStatus = "Completed";
      }

      return {
        id: session.slot_id,
        requestId: session.slot_id,
        user: session.mentor.display_name || session.mentor.username,
        date: SESSION_DATE_FORMATTER.format(sessionStart),
        rawDate: session.slot_date,
        time: `${toDisplayTime(session.slot_start_time)} - ${toDisplayTime(session.slot_end_time)}`,
        status: uiStatus,
        topic: "Mentorship Session",
        myRole: "Mentee" as "Mentor" | "Mentee",
        isSessionStarted: isStarted,
      };
    })
    .sort(sortSessionsChronologically);
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
    {
      id: string;
      label: string;
      isBooked: boolean;
      date?: string;
    }[]
  >();

  slots.forEach((slot) => {
    const day = WEEKDAY_FORMATTER.format(new Date(`${slot.date}T00:00:00`));
    const daySlots = dayMap.get(day) ?? [];

    daySlots.push({
      id: slot.id,
      label: `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`,
      isBooked: slot.is_booked,
      date: slot.date,
    });

    dayMap.set(day, daySlots);
  });

  return Array.from(dayMap.entries()).map(([day, times]) => ({ day, times }));
}
