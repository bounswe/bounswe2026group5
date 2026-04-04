/**
 * Runtime API configuration for mobile backend calls.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export const API_ACCESS_TOKEN = process.env.EXPO_PUBLIC_ACCESS_TOKEN ?? "";

export const PROFILE_USERNAME = process.env.EXPO_PUBLIC_PROFILE_USERNAME ?? "";

/**
 * Mock fallback is DISABLED by default during production.
 * Set EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=true in .env.local to enable.
 */
export const ENABLE_MOCK_FALLBACK =
  process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK === "true";
