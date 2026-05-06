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

function appendUploadFile(
  formData: FormData,
  fieldName: string,
  file: LocalUploadFile,
) {
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
}

export function uploadPostMedia(
  file: LocalUploadFile,
): Promise<PostMediaUploadResponse> {
  const formData = new FormData();
  appendUploadFile(formData, "file", file);

  return apiPostMultipart<PostMediaUploadResponse>(
    "/api/profiles/me/uploads/",
    formData,
  );
}

export function uploadProfilePicture(
  file: LocalUploadFile,
): Promise<ProfilePictureUploadResponse> {
  const formData = new FormData();
  appendUploadFile(formData, "picture", file);

  return apiPostMultipart<ProfilePictureUploadResponse>(
    "/api/profiles/me/picture/",
    formData,
  );
}

export function deleteProfilePicture(): Promise<ProfilePictureUploadResponse> {
  return apiDelete<ProfilePictureUploadResponse>("/api/profiles/me/picture/");
}
