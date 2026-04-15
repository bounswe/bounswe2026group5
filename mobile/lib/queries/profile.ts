import { useMutation, useQuery } from "@tanstack/react-query";

import { apiGet, apiPatch } from "@/lib/api/client";

interface UpdateProfilePayload {
  username: string;
  display_name?: string;
  bio?: string;
  expertises?: string[];
  eager_to_learn?: string[];
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
      const { username, ...body } = payload;
      return apiPatch<ProfilePatchResponse, Omit<UpdateProfilePayload, "username">>(
        `/api/profiles/${encodeURIComponent(username)}/`,
        body,
      );
    },
  });
}
