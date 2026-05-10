import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

export type WorkshopStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type WorkshopAttendanceStatus = "attending" | "attended";

interface WorkshopAuthorSummary {
  id: string;
  username: string;
  display_name: string;
  picture_url: string;
  title: string;
}

export interface WorkshopParticipant {
  id: string;
  participant: WorkshopAuthorSummary;
  joined_at: string;
  show_on_profile: boolean;
}

export interface CommunityWorkshopListItem {
  id: string;
  community_id: string;
  community_name: string;
  author: WorkshopAuthorSummary | null;
  title: string;
  description: string;
  scheduled_at: string;
  end_at: string;
  max_participants: number;
  participant_count: number;
  is_full: boolean;
  status: WorkshopStatus;
  current_user_enrolled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityWorkshopDetail extends CommunityWorkshopListItem {
  participants: WorkshopParticipant[];
}

export interface CommunityWorkshopFeedResponse {
  count: number;
  offset: number;
  limit: number;
  results: CommunityWorkshopListItem[];
}

export interface WorkshopAttendanceItem {
  id: string;
  workshop_id: string;
  workshop_title: string;
  workshop_description: string;
  workshop_status: WorkshopStatus;
  workshop_scheduled_at: string;
  workshop_end_at: string;
  community_id: string;
  community_name: string;
  author: WorkshopAuthorSummary | null;
  joined_at: string;
  show_on_profile: boolean;
  attendance_status: WorkshopAttendanceStatus;
}

export interface WorkshopAttendanceFeedResponse {
  count: number;
  attending_count: number;
  attended_count: number;
  offset: number;
  limit: number;
  results: WorkshopAttendanceItem[];
}

export interface CommunityWorkshopListParams {
  tagId: string;
  limit?: number;
  offset?: number;
  status?: WorkshopStatus;
}

export interface CreateCommunityWorkshopPayload {
  tagId: string;
  title: string;
  description?: string;
  scheduled_at: string;
  end_at: string;
  max_participants: number;
}

export interface UpdateCommunityWorkshopPayload {
  tagId: string;
  workshopId: string;
  title?: string;
  description?: string;
  scheduled_at?: string;
  end_at?: string;
  max_participants?: number;
  status?: WorkshopStatus;
}

export interface UpdateWorkshopParticipationPayload {
  tagId: string;
  workshopId: string;
  show_on_profile?: boolean;
}

export interface WorkshopDashboardItem {
  id: string;
  workshopId: string;
  communityId: string;
  communityName: string;
  user: string;
  date: string;
  rawDate: string;
  time: string;
  status: "Upcoming" | "Completed";
  topic: string;
  myRole: "Mentor" | "Mentee";
  isWorkshop: true;
  workshopStatus: WorkshopStatus;
}

export const workshopsQueryKeys = {
  all: ["workshops"] as const,
  communityList: (
    tagId: string,
    limit: number,
    offset: number,
    status?: WorkshopStatus,
  ) => ["workshops", "community", tagId, limit, offset, status ?? "all"] as const,
  detail: (tagId: string, workshopId: string) =>
    ["workshops", "community", tagId, workshopId] as const,
  myAttendance: (
    status: "all" | "attending" | "attended",
    limit: number,
    offset: number,
    currentUsername?: string,
  ) =>
    [
      "workshops",
      "me",
      "attendance",
      currentUsername ?? "anonymous",
      status,
      limit,
      offset,
    ] as const,
  participation: (tagId: string, workshopId: string, currentUsername?: string) =>
    [
      "workshops",
      "community",
      tagId,
      workshopId,
      "participation",
      currentUsername ?? "anonymous",
    ] as const,
};

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalIsoDate(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toDisplayDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function toDisplayTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startLabel = `${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}`;
  const endLabel = `${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`;

  return `${startLabel} - ${endLabel}`;
}

export function isWorkshopActive(
  workshop:
    | Pick<CommunityWorkshopListItem, "status" | "end_at">
    | Pick<WorkshopAttendanceItem, "workshop_status" | "workshop_end_at">,
): boolean {
  const status = "status" in workshop ? workshop.status : workshop.workshop_status;
  const endAt = "end_at" in workshop ? workshop.end_at : workshop.workshop_end_at;

  return status === "SCHEDULED" && new Date(endAt).getTime() > Date.now();
}

export function mapWorkshopAttendanceToDashboard(
  rows: WorkshopAttendanceItem[],
  currentUsername?: string,
): WorkshopDashboardItem[] {
  return rows
    .map((row) => {
      const authorUsername = row.author?.username;
      const myRole =
        currentUsername && authorUsername === currentUsername ? "Mentor" : "Mentee";

      return {
        id: row.workshop_id,
        workshopId: row.workshop_id,
        communityId: row.community_id,
        communityName: row.community_name,
        user:
          myRole === "Mentor"
            ? row.community_name
            : (row.author?.display_name ?? row.community_name),
        date: toDisplayDate(row.workshop_scheduled_at),
        rawDate: toLocalIsoDate(row.workshop_scheduled_at),
        time: toDisplayTimeRange(row.workshop_scheduled_at, row.workshop_end_at),
        status: row.attendance_status === "attending" ? "Upcoming" : "Completed",
        topic: row.workshop_title,
        myRole,
        isWorkshop: true,
        workshopStatus: row.workshop_status,
      } satisfies WorkshopDashboardItem;
    })
    .sort(
      (left, right) =>
        new Date(left.rawDate).getTime() - new Date(right.rawDate).getTime(),
    );
}

export function fetchCommunityWorkshops({
  tagId,
  limit = 20,
  offset = 0,
  status,
}: CommunityWorkshopListParams): Promise<CommunityWorkshopFeedResponse> {
  const queryString = buildQueryString({
    limit,
    offset,
    status,
  });

  return apiGet<CommunityWorkshopFeedResponse>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/?${queryString}`,
  );
}

export function fetchCommunityWorkshopDetail(
  tagId: string,
  workshopId: string,
): Promise<CommunityWorkshopDetail> {
  return apiGet<CommunityWorkshopDetail>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/`,
  );
}

export function fetchMyWorkshopAttendance(
  status: "all" | "attending" | "attended" = "all",
  limit = 50,
  offset = 0,
): Promise<WorkshopAttendanceFeedResponse> {
  const queryString = buildQueryString({ status, limit, offset });
  return apiGet<WorkshopAttendanceFeedResponse>(
    `/api/profiles/me/workshops/attendance/?${queryString}`,
  );
}

export function useCommunityWorkshopsQuery(
  params: CommunityWorkshopListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: workshopsQueryKeys.communityList(
      params.tagId,
      params.limit ?? 20,
      params.offset ?? 0,
      params.status,
    ),
    queryFn: () => fetchCommunityWorkshops(params),
    enabled: Boolean(params.tagId) && enabled,
    staleTime: 30_000,
  });
}

export function useMyCommunityWorkshopsFeedQuery(
  tagIds: string[],
  limitPerCommunity = 5,
  enabled = true,
) {
  const uniqueTagIds = [...new Set(tagIds.filter(Boolean))];
  const queries = useQueries({
    queries: uniqueTagIds.map((tagId) => ({
      queryKey: workshopsQueryKeys.communityList(tagId, limitPerCommunity, 0),
      queryFn: () =>
        fetchCommunityWorkshops({
          tagId,
          limit: limitPerCommunity,
          offset: 0,
        }),
      enabled: enabled && uniqueTagIds.length > 0,
      staleTime: 30_000,
    })),
  });

  const workshops = queries
    .flatMap((query) => query.data?.results ?? [])
    .sort((left, right) => {
      const leftActive = isWorkshopActive(left);
      const rightActive = isWorkshopActive(right);

      if (leftActive !== rightActive) {
        return leftActive ? -1 : 1;
      }

      if (leftActive) {
        return (
          new Date(left.scheduled_at).getTime() -
          new Date(right.scheduled_at).getTime()
        );
      }

      return (
        new Date(right.scheduled_at).getTime() -
        new Date(left.scheduled_at).getTime()
      );
    });

  return {
    data: workshops,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.error)?.error,
    refetch: async () => {
      await Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

export function useCommunityWorkshopDetailQuery(
  tagId?: string,
  workshopId?: string,
) {
  return useQuery({
    queryKey: workshopsQueryKeys.detail(tagId ?? "", workshopId ?? ""),
    queryFn: () => fetchCommunityWorkshopDetail(tagId ?? "", workshopId ?? ""),
    enabled: Boolean(tagId && workshopId),
    staleTime: 30_000,
  });
}

export function useMyWorkshopAttendanceQuery(
  currentUsername?: string,
  {
    status = "all",
    limit = 50,
    offset = 0,
  }: {
    status?: "all" | "attending" | "attended";
    limit?: number;
    offset?: number;
  } = {},
) {
  return useQuery({
    queryKey: workshopsQueryKeys.myAttendance(
      status,
      limit,
      offset,
      currentUsername,
    ),
    queryFn: () => fetchMyWorkshopAttendance(status, limit, offset),
    enabled: Boolean(currentUsername),
    staleTime: 30_000,
  });
}

export function useCreateCommunityWorkshopMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, ...payload }: CreateCommunityWorkshopPayload) =>
      apiPost<CommunityWorkshopDetail, Omit<CreateCommunityWorkshopPayload, "tagId">>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/`,
        payload,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workshopsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "detail", variables.tagId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "me", currentUsername ?? "anonymous"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "workshops"],
        }),
      ]);
    },
  });
}

export function useUpdateCommunityWorkshopMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      workshopId,
      ...payload
    }: UpdateCommunityWorkshopPayload) =>
      apiPatch<
        CommunityWorkshopDetail,
        Omit<UpdateCommunityWorkshopPayload, "tagId" | "workshopId">
      >(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/`,
        payload,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workshopsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "workshops"],
        }),
        queryClient.invalidateQueries({
          queryKey: workshopsQueryKeys.detail(
            variables.tagId,
            variables.workshopId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "detail", variables.tagId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "me", currentUsername ?? "anonymous"],
        }),
      ]);
    },
  });
}

export function useDeleteCommunityWorkshopMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      workshopId,
    }: Pick<UpdateCommunityWorkshopPayload, "tagId" | "workshopId">) =>
      apiDelete<void>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/`,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workshopsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "workshops"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "detail", variables.tagId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "me", currentUsername ?? "anonymous"],
        }),
      ]);
    },
  });
}

export function useJoinCommunityWorkshopMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, workshopId, show_on_profile }: UpdateWorkshopParticipationPayload) =>
      apiPost<WorkshopParticipant, { show_on_profile?: boolean }>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/join/`,
        show_on_profile !== undefined ? { show_on_profile } : {},
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workshopsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "workshops"],
        }),
        queryClient.invalidateQueries({
          queryKey: workshopsQueryKeys.detail(
            variables.tagId,
            variables.workshopId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: workshopsQueryKeys.participation(
            variables.tagId,
            variables.workshopId,
            currentUsername,
          ),
        }),
      ]);
    },
  });
}

export function useLeaveCommunityWorkshopMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      workshopId,
    }: Pick<UpdateWorkshopParticipationPayload, "tagId" | "workshopId">) =>
      apiPost<void>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/leave/`,
        {},
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workshopsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "workshops"],
        }),
        queryClient.invalidateQueries({
          queryKey: workshopsQueryKeys.detail(
            variables.tagId,
            variables.workshopId,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: workshopsQueryKeys.participation(
            variables.tagId,
            variables.workshopId,
            currentUsername,
          ),
        }),
      ]);
    },
  });
}

export function useUpdateMyWorkshopParticipationMutation(
  currentUsername?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, workshopId, show_on_profile }: UpdateWorkshopParticipationPayload) =>
      apiPatch<WorkshopParticipant, { show_on_profile?: boolean }>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/workshops/${encodeURIComponent(workshopId)}/participants/me/`,
        show_on_profile !== undefined ? { show_on_profile } : {},
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workshopsQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "workshops"],
        }),
        queryClient.invalidateQueries({
          queryKey: workshopsQueryKeys.participation(
            variables.tagId,
            variables.workshopId,
            currentUsername,
          ),
        }),
      ]);
    },
  });
}
