import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import {
  type ProfilePost,
  type ProfilePostAuthor,
} from "@/lib/queries/profile";

export type CommunityPostEventType = ProfilePost["event_type"];

export interface CommunityPost extends ProfilePost {
  category: "CoP";
  community_id: string;
  author: ProfilePostAuthor | null;
}

export interface CommunityPostFeedResponse {
  count: number;
  offset: number;
  limit: number;
  results: CommunityPost[];
}

export interface CreateCommunityPostPayload {
  tagId: string;
  event_type: CommunityPostEventType;
  content: string;
  media_url?: string | null;
  show_on_profile?: boolean;
  timestamp?: string | null;
  tagged_users?: string[];
}

export interface UpdateCommunityPostPayload {
  tagId: string;
  eventId: string;
  content?: string;
  event_type?: CommunityPostEventType;
  media_url?: string | null;
  show_on_profile?: boolean;
  tagged_users?: string[];
}

export interface DeleteCommunityPostPayload {
  tagId: string;
  eventId: string;
  show_on_profile?: boolean;
}

export interface CommunityPostListParams {
  tagId: string;
  limit?: number;
  offset?: number;
  eventType?: CommunityPostEventType;
}

export const communityPostsQueryKeys = {
  all: ["community-posts"] as const,
  list: (
    tagId: string,
    limit: number,
    offset: number,
    eventType?: CommunityPostEventType,
  ) => ["community-posts", tagId, limit, offset, eventType ?? "all"] as const,
  myFeed: (tagIds: string[], limit: number) =>
    ["community-posts", "me", "feed", tagIds.join(","), limit] as const,
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

export function fetchCommunityPosts({
  tagId,
  limit = 20,
  offset = 0,
  eventType,
}: CommunityPostListParams): Promise<CommunityPostFeedResponse> {
  const queryString = buildQueryString({
    limit,
    offset,
    event_type: eventType,
  });

  return apiGet<CommunityPostFeedResponse>(
    `/api/profiles/tags/${encodeURIComponent(tagId)}/posts/?${queryString}`,
  );
}

export function useCommunityPostsQuery(
  params: CommunityPostListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: communityPostsQueryKeys.list(
      params.tagId,
      params.limit ?? 20,
      params.offset ?? 0,
      params.eventType,
    ),
    queryFn: () => fetchCommunityPosts(params),
    enabled: Boolean(params.tagId) && enabled,
    staleTime: 30_000,
  });
}

export function useMyCommunityPostsFeedQuery(
  tagIds: string[],
  limitPerCommunity = 5,
  enabled = true,
) {
  const uniqueTagIds = [...new Set(tagIds.filter(Boolean))];
  const queries = useQueries({
    queries: uniqueTagIds.map((tagId) => ({
      queryKey: communityPostsQueryKeys.list(tagId, limitPerCommunity, 0),
      queryFn: () =>
        fetchCommunityPosts({
          tagId,
          limit: limitPerCommunity,
          offset: 0,
        }),
      enabled: enabled && uniqueTagIds.length > 0,
      staleTime: 30_000,
    })),
  });

  const posts = queries
    .flatMap((query) => query.data?.results ?? [])
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );

  return {
    data: posts,
    isLoading: queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.error)?.error,
  };
}

export function useCreateCommunityPostMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      event_type,
      content,
      media_url,
      show_on_profile,
      timestamp,
      tagged_users,
    }: CreateCommunityPostPayload) =>
      apiPost<CommunityPost, Omit<CreateCommunityPostPayload, "tagId">>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/posts/`,
        {
          event_type,
          content,
          ...(media_url ? { media_url } : {}),
          ...(show_on_profile ? { show_on_profile } : {}),
          ...(timestamp ? { timestamp } : {}),
          ...(tagged_users !== undefined ? { tagged_users } : {}),
        },
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityPostsQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "detail", variables.tagId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", currentUsername ?? "anonymous", "posts"],
        }),
        variables.show_on_profile
          ? queryClient.invalidateQueries({ queryKey: ["profiles"] })
          : Promise.resolve(),
      ]);
    },
  });
}

export function useUpdateCommunityPostMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, eventId, ...payload }: UpdateCommunityPostPayload) =>
      apiPatch<
        CommunityPost,
        Omit<UpdateCommunityPostPayload, "tagId" | "eventId">
      >(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/posts/${encodeURIComponent(eventId)}/`,
        payload,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityPostsQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", currentUsername ?? "anonymous", "posts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community-tags", "detail", variables.tagId],
        }),
      ]);
    },
  });
}

export function useDeleteCommunityPostMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      eventId,
      show_on_profile,
    }: DeleteCommunityPostPayload) =>
      apiDelete<void>(
        `/api/profiles/tags/${encodeURIComponent(tagId)}/posts/${encodeURIComponent(eventId)}/`,
      ),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: communityPostsQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", currentUsername ?? "anonymous", "posts"],
        }),
        variables.show_on_profile
          ? queryClient.invalidateQueries({ queryKey: ["profiles"] })
          : Promise.resolve(),
      ]);
    },
  });
}
