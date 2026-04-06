import { Platform } from "react-native";

const defaultBaseUrl = Platform.select({
  // Android emulator maps host machine localhost to 10.0.2.2.
  android: "http://10.0.2.2:8000",
  default: "http://127.0.0.1:8000",
});

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || defaultBaseUrl;

export const API_BASE_URL = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl;
