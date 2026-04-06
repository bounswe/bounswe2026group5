import { Platform } from "react-native";

/**
 * Runtime API configuration for mobile backend calls.
 */
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

function normalizeUrl(value: string): string {
  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  return withScheme.replace(/\/$/, "");
}

function devFallbackBaseUrl(): string {
  // Android emulator maps host loopback to 10.0.2.2.
  return Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://127.0.0.1:8000";
}

const resolvedBaseUrl = normalizeUrl(configuredBaseUrl || devFallbackBaseUrl());

export const API_BASE_URL = resolvedBaseUrl;

export const API_ACCESS_TOKEN = process.env.EXPO_PUBLIC_ACCESS_TOKEN ?? "";

export const PROFILE_USERNAME = process.env.EXPO_PUBLIC_PROFILE_USERNAME ?? "";

/**
 * Mock fallback is DISABLED by default during production.
 * Set EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=true in .env.local to enable.
 */
export const ENABLE_MOCK_FALLBACK =
  process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK === "true";
