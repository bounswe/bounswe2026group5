import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPostFormData } from "@/lib/api/client";

export interface Post {
  id: string;
  author_username: string;
  author_display_name: string;
  author_picture_url: string;
  content: string;
  image_url: string | null;
  is_mine: boolean;
  created_at: string;
}

export function useFeedQuery() {
  return useQuery<Post[]>({
    queryKey: ["feed"],
    queryFn: () => apiGet<Post[]>("/api/posts/"),
  });
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, imageUri }: { content: string; imageUri?: string }) => {
      const form = new FormData();
      form.append("content", content);

      if (imageUri) {
        const filename = imageUri.split("/").pop() ?? "photo.jpg";
        const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
        const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
        form.append("image", { uri: imageUri, name: filename, type: mime } as unknown as Blob);
      }

      return apiPostFormData<Post>("/api/posts/", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => apiDelete(`/api/posts/${postId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
