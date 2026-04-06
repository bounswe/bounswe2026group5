import { useMutation } from "@tanstack/react-query";

import { apiPatch } from "@/lib/api/client";

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
