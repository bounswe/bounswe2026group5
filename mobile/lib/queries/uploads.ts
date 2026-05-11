import { Platform } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPostMultipart } from "@/lib/api/client";

export interface LocalUploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface PostMediaUploadResponse {
  url: string;
}

export interface ProfilePictureUploadResponse {
  detail: string;
  picture_url: string;
}

export async function appendUploadFile(
  formData: FormData,
  fieldName: string,
  file: LocalUploadFile,
) {
  if (Platform.OS === "web") {
    // On web, we need to convert the URI to a real Blob/File
    const response = await fetch(file.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, file.name);
  } else {
    // On native, we use the standard React Native object
    formData.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  }
}

export async function uploadPostMedia(
  file: LocalUploadFile,
): Promise<PostMediaUploadResponse> {
  const formData = new FormData();
  await appendUploadFile(formData, "file", file);

  return apiPostMultipart<PostMediaUploadResponse>(
    "/api/profiles/me/uploads/",
    formData,
  );
}

export async function uploadProfilePicture(
  file: LocalUploadFile,
): Promise<ProfilePictureUploadResponse> {
  const formData = new FormData();
  await appendUploadFile(formData, "picture", file);

  return apiPostMultipart<ProfilePictureUploadResponse>(
    "/api/profiles/me/picture/",
    formData,
  );
}

export function deleteProfilePicture(): Promise<ProfilePictureUploadResponse> {
  return apiDelete<ProfilePictureUploadResponse>("/api/profiles/me/picture/");
}

export function useUploadProfilePictureMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["community-posts"] }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "settings"],
        }),
        currentUsername
          ? queryClient.invalidateQueries({
              queryKey: ["profiles", currentUsername, "posts"],
            })
          : Promise.resolve(),
      ]);
    },
  });
}

export function useDeleteProfilePictureMutation(currentUsername?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfilePicture,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
        queryClient.invalidateQueries({ queryKey: ["community-posts"] }),
        queryClient.invalidateQueries({
          queryKey: ["profiles", "me", "settings"],
        }),
        currentUsername
          ? queryClient.invalidateQueries({
              queryKey: ["profiles", currentUsername, "posts"],
            })
          : Promise.resolve(),
      ]);
    },
  });
}
