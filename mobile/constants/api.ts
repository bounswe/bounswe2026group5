const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const API_BASE_URL = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl;
