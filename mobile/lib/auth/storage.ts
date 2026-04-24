/**
 * @fileoverview Secure token storage using expo-secure-store.
 * Handles persistent storage of auth tokens and user data.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { AuthTokens, AuthUser } from "./types";

const TOKEN_KEY = "auth_tokens";
const USER_KEY = "auth_user";

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error("Local storage is unavailable:", e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.error("Local storage is unavailable:", e);
    }
    return null;
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error("Local storage is unavailable:", e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

/**
 * Stores authentication tokens securely.
 *
 * @param tokens - Access and refresh tokens to store
 * @throws Error if storage fails
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  try {
    await setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("Failed to store tokens:", error);
    throw error;
  }
}

/**
 * Retrieves stored authentication tokens.
 *
 * @returns Stored tokens or null if none exist
 * @throws Error if retrieval fails
 */
export async function getStoredTokens(): Promise<AuthTokens | null> {
  try {
    const stored = await getItem(TOKEN_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthTokens;
  } catch (error) {
    console.error("Failed to retrieve tokens:", error);
    return null;
  }
}

/**
 * Stores user profile information persistently.
 *
 * @param user - User profile to store
 * @throws Error if storage fails
 */
export async function storeUser(user: AuthUser): Promise<void> {
  try {
    await setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to store user:", error);
    throw error;
  }
}

/**
 * Retrieves stored user profile information.
 *
 * @returns Stored user profile or null if none exist
 * @throws Error if retrieval fails
 */
export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const stored = await getItem(USER_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthUser;
  } catch (error) {
    console.error("Failed to retrieve user:", error);
    return null;
  }
}

/**
 * Clears all stored authentication data.
 *
 * @throws Error if clearing fails
 */
export async function clearAuthStorage(): Promise<void> {
  try {
    await Promise.all([
      deleteItem(TOKEN_KEY),
      deleteItem(USER_KEY),
    ]);
  } catch (error) {
    console.error("Failed to clear auth storage:", error);
    throw error;
  }
}


export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
}

export async function saveAuthData(data: StoredAuthData): Promise<void> {
  await Promise.all([
    storeTokens({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    }),
    storeUser({
      id: data.userId,
      username: data.username,
    } as unknown as AuthUser),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  return tokens.access_token;
}

export const clearAuthData = clearAuthStorage;
