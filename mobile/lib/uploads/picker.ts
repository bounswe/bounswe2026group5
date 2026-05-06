import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

import type { LocalUploadFile } from "@/lib/queries/uploads";

const MB = 1024 * 1024;
const LIMITS = {
  PROFILE: 5 * MB,
  POST: 10 * MB,
  CHAT: 20 * MB,
};

function extensionFromMimeType(mimeType?: string | null): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "jpg";
}

function validateFileSize(size: number | undefined, limit: number): boolean {
  if (size && size > limit) {
    const limitMB = limit / MB;
    Alert.alert(
      "File Too Large",
      `The selected file is ${Math.round(size / MB)}MB. Maximum allowed size is ${limitMB}MB.`,
    );
    return false;
  }
  return true;
}

export async function pickProfilePictureFile(): Promise<LocalUploadFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: false,
    mediaTypes: ["images"],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!validateFileSize(asset.fileSize, LIMITS.PROFILE)) return null;

  const type = asset.mimeType ?? "image/jpeg";
  const extension = extensionFromMimeType(type);

  return {
    uri: asset.uri,
    name: asset.fileName ?? `profile-picture.${extension}`,
    type,
  };
}

export async function pickPostMediaFile(): Promise<LocalUploadFile | null> {
  const DocumentPicker = await import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!validateFileSize(asset.size, LIMITS.POST)) return null;

  return {
    uri: asset.uri,
    name: asset.name || "attachment",
    type: asset.mimeType || "application/octet-stream",
  };
}

export async function pickMessageImageFile(): Promise<LocalUploadFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: false,
    mediaTypes: ["images"],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!validateFileSize(asset.fileSize, LIMITS.CHAT)) return null;

  const type = asset.mimeType ?? "image/jpeg";
  const extension = extensionFromMimeType(type);

  return {
    uri: asset.uri,
    name: asset.fileName ?? `chat-image.${extension}`,
    type,
  };
}

export async function pickMessagePdfFile(): Promise<LocalUploadFile | null> {
  const DocumentPicker = await import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!validateFileSize(asset.size, LIMITS.CHAT)) return null;

  return {
    uri: asset.uri,
    name: asset.name || "attachment.pdf",
    type: asset.mimeType || "application/pdf",
  };
}

// Deprecated alias for backward compatibility
export const pickImageFile = pickProfilePictureFile;
export const pickPostImageFile = pickPostMediaFile;
