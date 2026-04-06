/**
 * Runtime API configuration for mobile backend calls.
 */
import { Platform } from "react-native";

const defaultBaseUrl = Platform.select({
  // Android emulator maps host machine localhost to 10.0.2.2.
  android: "http://10.0.2.2:8000",
  default: "http://localhost:8000",
});

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? defaultBaseUrl;

export const API_ACCESS_TOKEN = process.env.EXPO_PUBLIC_ACCESS_TOKEN ?? "";

export const PROFILE_USERNAME = process.env.EXPO_PUBLIC_PROFILE_USERNAME ?? "";

/**
 * Mock fallback is DISABLED by default during production.
 * Set EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=true in .env.local to enable.
 */
export const ENABLE_MOCK_FALLBACK =
  process.env.EXPO_PUBLIC_ENABLE_MOCK_FALLBACK === "true";
