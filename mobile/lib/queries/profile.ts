import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPatch, apiPost } from "@/lib/api/client";

/** Minimal author shape embedded in each profile post. */
export interface ProfilePostAuthor {
  id: string;
  username: string;
  display_name: string;
  picture_url: string;
  title: string;
}

export type ProfilePostCategory = "PrP" | "MCTE" | "CoP";

/**
 * A single item returned by GET /api/profiles/{username}/posts/.
 *
 * Categories:
 *   - "PrP"  — profile post authored directly by the profile owner
 *   - "MCTE" — manually-created timeline event where show_on_profile === true
 *   - "CoP"  — community post shared by the profile owner
 *
 * AGTE events never appear in this feed (server-side guarantee).
 * Private MCTE (show_on_profile === false) never appear either.
 */
export interface ProfilePost {
  id: string;
  source_id: string;
  category: ProfilePostCategory;
  event_type: "achievement" | "social" | "progress";
  content: string;
  media_url: string | null;
  timestamp: string;
  created_at: string;
  last_edited: string | null;
  show_on_profile: boolean;
  community_id: string | null;
  actor_role: string | null;
  author: ProfilePostAuthor | null;
}

export interface CreateProfilePostPayload {
  event_type: ProfilePost["event_type"];
  content: string;
  media_url?: string | null;
  timestamp?: string | null;
}

export interface ProfilePostFeedResponse {
  count: number;
  offset: number;
  limit: number;
  results: ProfilePost[];
}

interface UpdateProfilePayload {
  username: string;
  display_name?: string;
  bio?: string;
  skills?: string[];
}

interface ProfilePatchResponse {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  picture_url: string;
  title: string;
  is_visible: boolean;
  show_initials_only: boolean;
  created_at: string;
  updated_at: string;
}

interface PublicProfileRatingResponse {
  username: string;
  average_rating: string;
  review_count: number;
}

export interface ProfileReview {
  rating: number;
  text: string;
  created_at: string;
}

export interface ProfileReviewsResponse {
  count: number;
  page: number;
  pageSize: number;
  results: ProfileReview[];
}

/**
 * Retrieve the list of public reviews for a specific profile.
 */
export function useProfileReviewsQuery(
  username?: string,
  page: number = 1,
  pageSize: number = 6,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["profiles", username ?? "anonymous", "reviews", page, pageSize],
    queryFn: () =>
      apiGet<ProfileReviewsResponse>(
        `/api/profiles/${encodeURIComponent(username || "")}/reviews/?page=${page}&pageSize=${pageSize}`,
      ),
    enabled: Boolean(username) && enabled,
    staleTime: 60_000,
  });
}

/**
 * Retrieve public, batch-updated mentor rating by username.
 */
export function useProfileRatingQuery(username?: string) {
  return useQuery({
    queryKey: ["profiles", username ?? "anonymous", "rating"],
    queryFn: () =>
      apiGet<PublicProfileRatingResponse>(
        `/api/profiles/${encodeURIComponent(username || "")}/rating/`,
      ),
    enabled: Boolean(username),
    staleTime: 60_000,
  });
}

/**
 * Patch own profile by username.
 */
export function useUpdateOwnProfileMutation() {
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { username: _username, ...body } = payload;
      return apiPatch<
        ProfilePatchResponse,
        Omit<UpdateProfilePayload, "username">
      >(`/api/profiles/me/`, body);
    },
  });
}

/**
 * Create a new profile post for the authenticated user.
 */
export function useCreateProfilePostMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProfilePostPayload) =>
      apiPost<ProfilePost, CreateProfilePostPayload>(
        "/api/profiles/me/posts/",
        {
          event_type: payload.event_type,
          content: payload.content,
          ...(payload.media_url ? { media_url: payload.media_url } : {}),
          ...(payload.timestamp ? { timestamp: payload.timestamp } : {}),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profiles", currentUsername ?? "anonymous", "posts"],
      });
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

interface UseProfilePostsQueryOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Fetch profile feed posts for a given username.
 *
 * Returns PrP posts and public MCTE events (show_on_profile === true).
 * AGTE events are excluded server-side; the hook also defensively filters them
 * on the client.
 *
 * Endpoint: GET /api/profiles/{username}/posts/
 */
export function useProfilePostsQuery(
  username?: string,
  { limit = 6, offset = 0, enabled = true }: UseProfilePostsQueryOptions = {},
) {
  return useQuery({
    queryKey: ["profiles", username ?? "anonymous", "posts", limit, offset],
    queryFn: async () => {
      const qs = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      }).toString();
      const feed = await apiGet<ProfilePostFeedResponse>(
        `/api/profiles/${encodeURIComponent(username || "")}/posts/?${qs}`,
      );
      // Defensive client-side guard: strip any AGTE or private MCTE items that
      // should never appear but could if the backend contract changes.
      return {
        ...feed,
        results: feed.results.filter(
          (post) =>
            post.category !== ("AGTE" as string) &&
            post.show_on_profile !== false,
        ),
      };
    },
    enabled: Boolean(username) && enabled,
    staleTime: 60_000,
  });
}
