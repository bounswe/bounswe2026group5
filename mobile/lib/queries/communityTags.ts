import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { type DiscoverMentorProfile } from "@/lib/discover/types";

export type PopularTagsWindow = "all" | "7d" | "30d";

export interface CommunityTag {
  id: string;
  name: string;
  slug: string;
  description: string;
  member_count: number;
  created_at: string;
}

export interface CommunityTagDetail extends CommunityTag {
  created_by_username: string | null;
  is_member: boolean;
}

export interface CommunityTagListResponse {
  count: number;
  page: number;
  pageSize: number;
  results: CommunityTag[];
}

export interface CommunityTagMembersResponse {
  count: number;
  page: number;
  pageSize: number;
  results: DiscoverMentorProfile[];
}

export interface CommunityTaggableUser {
  username: string;
  display_name: string;
}

export interface CommunityTaggableUsersResponse {
  count: number;
  results: CommunityTaggableUser[];
}

export interface CommunityTagMembershipResponse {
  tag_id: string;
  tag_name: string;
  tag_slug: string;
  joined: boolean;
}

export interface CommunityTagListParams {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface PopularCommunityTagsParams {
  limit?: number;
  window?: PopularTagsWindow;
}

export interface CommunityTagMembersParams {
  tagId: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCommunityTagPayload {
  name: string;
  description?: string;
}

export interface UpdateCommunityTagPayload {
  tagId: string;
  description: string;
}

export const communityTagsQueryKeys = {
  all: ["community-tags"] as const,
  list: (params: CommunityTagListParams = {}) =>
    [
      ...communityTagsQueryKeys.all,
      "list",
      params.query?.trim() ?? "",
      params.page ?? 1,
      params.pageSize ?? 20,
    ] as const,
  popular: (params: PopularCommunityTagsParams = {}) =>
    [
      ...communityTagsQueryKeys.all,
      "popular",
      params.limit ?? 10,
      params.window ?? "all",
    ] as const,
  my: (username?: string) =>
    [...communityTagsQueryKeys.all, "me", username ?? "anonymous"] as const,
  detail: (tagId?: string) =>
    [...communityTagsQueryKeys.all, "detail", tagId ?? "unknown"] as const,
  members: (params: CommunityTagMembersParams) =>
    [
      ...communityTagsQueryKeys.all,
      "members",
      params.tagId,
      params.page ?? 1,
      params.pageSize ?? 20,
    ] as const,
  taggableUsers: (tagId?: string) =>
    [...communityTagsQueryKeys.all, "taggable-users", tagId ?? "unknown"] as const,
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

export function fetchCommunityTags(
  params: CommunityTagListParams = {},
): Promise<CommunityTagListResponse> {
  const query = params.query?.trim();
  const queryString = buildQueryString({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    q: query || undefined,
  });

  return apiGet<CommunityTagListResponse>(`/api/profiles/tags/?${queryString}`);
}

export function fetchPopularCommunityTags(
  params: PopularCommunityTagsParams = {},
): Promise<CommunityTag[]> {
  const queryString = buildQueryString({
    limit: params.limit ?? 10,
    window: params.window ?? "all",
  });

  return apiGet<CommunityTag[]>(`/api/profiles/tags/popular/?${queryString}`);
}

export function fetchMyCommunityTags(): Promise<CommunityTag[]> {
  return apiGet<CommunityTag[]>("/api/profiles/me/tags/");
}

export function fetchCommunityTagDetail(
  tagId: string,
): Promise<CommunityTagDetail> {
  return apiGet<CommunityTagDetail>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/`,
  );
}

export function fetchCommunityTagMembers({
  tagId,
  page = 1,
  pageSize = 20,
}: CommunityTagMembersParams): Promise<CommunityTagMembersResponse> {
  const queryString = buildQueryString({ page, pageSize });

  return apiGet<CommunityTagMembersResponse>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/members/?${queryString}`,
  );
}

export function fetchCommunityTaggableUsers(
  tagId: string,
): Promise<CommunityTaggableUsersResponse> {
  return apiGet<CommunityTaggableUsersResponse>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/taggable-users/`,
  );
}

export function createCommunityTag(
  payload: CreateCommunityTagPayload,
): Promise<CommunityTagDetail> {
  return apiPost<CommunityTagDetail, CreateCommunityTagPayload>(
    "/api/profiles/tags/",
    {
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
    },
  );
}

export function updateCommunityTagDescription({
  tagId,
  description,
}: UpdateCommunityTagPayload): Promise<CommunityTagDetail> {
  return apiPatch<CommunityTagDetail, { description: string }>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/`,
    { description: description.trim() },
  );
}

export function joinCommunityTag(
  tagId: string,
): Promise<CommunityTagMembershipResponse> {
  return apiPost<CommunityTagMembershipResponse>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/join/`,
  );
}

export function leaveCommunityTag(
  tagId: string,
): Promise<CommunityTagMembershipResponse> {
  return apiDelete<CommunityTagMembershipResponse>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/leave/`,
  );
}

export function deleteCommunityTag(tagId: string): Promise<void> {
  return apiDelete<void>(`/api/profiles/tags/${encodeURIComponent(tagId)}/`);
}

export function useCommunityTagsQuery(params: CommunityTagListParams = {}) {
  return useQuery({
    queryKey: communityTagsQueryKeys.list(params),
    queryFn: () => fetchCommunityTags(params),
    staleTime: 30_000,
  });
}

export function usePopularCommunityTagsQuery(
  params: PopularCommunityTagsParams = {},
) {
  return useQuery({
    queryKey: communityTagsQueryKeys.popular(params),
    queryFn: () => fetchPopularCommunityTags(params),
    staleTime: 30_000,
  });
}

export function useMyCommunityTagsQuery(username?: string) {
  return useQuery({
    queryKey: communityTagsQueryKeys.my(username),
    queryFn: fetchMyCommunityTags,
    enabled: Boolean(username),
    staleTime: 30_000,
  });
}

export function useCommunityTagDetailQuery(tagId?: string) {
  return useQuery({
    queryKey: communityTagsQueryKeys.detail(tagId),
    queryFn: () => fetchCommunityTagDetail(tagId ?? ""),
    enabled: Boolean(tagId),
    staleTime: 30_000,
  });
}

export function useCommunityTagMembersQuery(
  params: CommunityTagMembersParams,
  enabled = true,
) {
  return useQuery({
    queryKey: communityTagsQueryKeys.members(params),
    queryFn: () => fetchCommunityTagMembers(params),
    enabled: Boolean(params.tagId) && enabled,
    staleTime: 30_000,
  });
}

export function useCommunityTaggableUsersQuery(
  tagId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: communityTagsQueryKeys.taggableUsers(tagId),
    queryFn: () => fetchCommunityTaggableUsers(tagId ?? ""),
    enabled: Boolean(tagId) && enabled,
    staleTime: 30_000,
  });
}

export function useCreateCommunityTagMutation(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommunityTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.my(username) });
    },
  });
}

export function useUpdateCommunityTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCommunityTagDescription,
    onSuccess: async (tag) => {
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.all });
      await queryClient.invalidateQueries({
        queryKey: communityTagsQueryKeys.detail(tag.id),
      });
    },
  });
}

export function useJoinCommunityTagMutation(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinCommunityTag,
    onSuccess: async (membership) => {
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.my(username) });
      await queryClient.invalidateQueries({
        queryKey: communityTagsQueryKeys.detail(membership.tag_id),
      });
    },
  });
}

export function useLeaveCommunityTagMutation(username?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: leaveCommunityTag,
    onSuccess: async (membership) => {
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: communityTagsQueryKeys.my(username) });
      await queryClient.invalidateQueries({
        queryKey: communityTagsQueryKeys.detail(membership.tag_id),
      });
    },
  });
}
