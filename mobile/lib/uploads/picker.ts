import * as ImagePicker from "expo-image-picker";

import type { LocalUploadFile } from "@/lib/queries/uploads";

function extensionFromMimeType(mimeType?: string | null): string {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/gif") {
    return "gif";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

export async function pickImageFile(): Promise<LocalUploadFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: false,
    mediaTypes: ["images"],
    quality: 0.9,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) {
    return null;
  }

  const type = asset.mimeType ?? "image/jpeg";
  const extension = extensionFromMimeType(type);

  return {
    uri: asset.uri,
    name: asset.fileName ?? `post-media.${extension}`,
    type,
  };
}

export const pickPostImageFile = pickImageFile;
