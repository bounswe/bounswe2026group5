import { useMutation, useQuery } from "@tanstack/react-query";

import { apiGet, apiPatch } from "@/lib/api/client";

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
      return apiPatch<ProfilePatchResponse, Omit<UpdateProfilePayload, "username">>(
        `/api/profiles/me/`,
        body,
      );
    },
  });
}
