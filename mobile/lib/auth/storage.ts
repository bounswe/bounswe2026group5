/**
 * @fileoverview Secure token storage using expo-secure-store.
 * Handles persistent storage of auth tokens and user data.
 */

import * as SecureStore from "expo-secure-store";
import { AuthTokens, AuthUser } from "./types";

const TOKEN_KEY = "auth_tokens";
const USER_KEY = "auth_user";

/**
 * Stores authentication tokens securely.
 *
 * @param tokens - Access and refresh tokens to store
 * @throws Error if storage fails
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
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
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
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
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
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
    const stored = await SecureStore.getItemAsync(USER_KEY);
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
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  } catch (error) {
    console.error("Failed to clear auth storage:", error);
    throw error;
  }
}

// ============================================================================
// COMPATIBILITY ADAPTERS (feat/mobile-register-api-integration)
// These ensure the registration flow code doesn't break while utilizing 
// the optimized JSON storage engine from the dev branch above.
// ============================================================================

export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
}

export async function saveAuthData(data: StoredAuthData): Promise<void> {
  await Promise.all([
    storeTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      access: data.accessToken, // Fallback mapped for safety 
      refresh: data.refreshToken, // Fallback mapped for safety
    } as unknown as AuthTokens),
    storeUser({
      id: data.userId,
      username: data.username,
    } as unknown as AuthUser),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;
  
  // Safely extract token regardless of how the AuthTokens type is mapped internally
  return (tokens as any).accessToken || (tokens as any).access || null;
}

export const clearAuthData = clearAuthStorage;