import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Runtime API configuration for mobile backend calls.
 */
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

function normalizeUrl(value: string): string {
  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  return withScheme.replace(/\/$/, "");
}

function getExpoHostIp(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;
  const host = hostUri?.split(":")[0];

  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }

  return host;
}

function devFallbackBaseUrl(): string {
  const expoHostIp = getExpoHostIp();
  if (expoHostIp) {
    return `http://${expoHostIp}:8000`;
  }

  // Android emulator maps host loopback to 10.0.2.2.
  return Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://127.0.0.1:8000";
}

const resolvedBaseUrl = normalizeUrl(configuredBaseUrl || devFallbackBaseUrl());

export const API_BASE_URL = resolvedBaseUrl;
export function getAbsoluteUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("file://") ||
    path.startsWith("content://") ||
    path.startsWith("ph://") ||
    path.startsWith("assets-library://") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function getAbsoluteImageUrl(
  path: string | null | undefined,
  cacheKey?: string | number,
): string {
  const absoluteUrl = getAbsoluteUrl(path);

  if (
    !absoluteUrl ||
    cacheKey === undefined ||
    cacheKey === null ||
    cacheKey === ""
  ) {
    return absoluteUrl;
  }

  if (
    absoluteUrl.startsWith("data:") ||
    absoluteUrl.startsWith("content://") ||
    absoluteUrl.startsWith("ph://") ||
    absoluteUrl.startsWith("assets-library://")
  ) {
    return absoluteUrl;
  }

  try {
    const url = new URL(absoluteUrl);
    url.searchParams.set("v", String(cacheKey));
    return url.toString();
  } catch {
    const separator = absoluteUrl.includes("?") ? "&" : "?";
    return `${absoluteUrl}${separator}v=${encodeURIComponent(String(cacheKey))}`;
  }
}

export const API_ACCESS_TOKEN = process.env.EXPO_PUBLIC_ACCESS_TOKEN ?? "";

export const PROFILE_USERNAME = process.env.EXPO_PUBLIC_PROFILE_USERNAME ?? "";

/**
 * Mock fallback is DISABLED by default during production.
 * Set EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=true in .env.local to enable.
 */
export const ENABLE_MOCK_FALLBACK =
  process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK === "true";
