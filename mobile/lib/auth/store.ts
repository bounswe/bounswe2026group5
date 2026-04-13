/**
 * @fileoverview Zustand auth store for managing authentication state.
 * Handles user session, token storage, and auth state across the app.
 */

import { create } from "zustand";
import { AuthState, AuthUser, AuthTokens } from "./types";
import {
  storeTokens,
  getStoredTokens,
  storeUser,
  getStoredUser,
  clearAuthStorage,
} from "./storage";

const AUTH_INIT_TIMEOUT_MS = 5000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Auth initialization timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

interface AuthStore extends AuthState {
  /**
   * Initialize auth state from secure storage.
   * Called on app startup to restore persisted session.
   */
  initializeAuth: () => Promise<void>;

  /**
   * Set user as authenticated with tokens and user profile.
   * Persists tokens and user to secure storage.
   */
  setAuthenticated: (user: AuthUser, tokens: AuthTokens) => Promise<void>;

  /**
   * Clear authentication and logout user.
   * Removes all stored auth data.
   */
  logout: () => Promise<void>;

  /**
   * Update access token (for refresh token flow).
   * Keeps user and refresh token intact.
   */
  updateAccessToken: (accessToken: string) => Promise<void>;

  /**
   * Set authentication error.
   */
  setError: (error: string | null) => void;

  /**
   * Set loading state.
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Patch local user fields after profile/account updates.
   */
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const [tokens, user] = await Promise.all([
        withTimeout(getStoredTokens(), AUTH_INIT_TIMEOUT_MS),
        withTimeout(getStoredUser(), AUTH_INIT_TIMEOUT_MS),
      ]);

      if (tokens && user) {
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
          error: null,
        });
      } else {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: "Failed to restore session",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setAuthenticated: async (user: AuthUser, tokens: AuthTokens) => {
    try {
      await Promise.all([storeTokens(tokens), storeUser(user)]);

      set({
        user,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      console.error("Failed to set authenticated state:", error);
      set({ error: "Failed to save session" });
      throw error;
    }
  },

  logout: async () => {
    try {
      await clearAuthStorage();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to logout:", error);
      set({ error: "Failed to logout" });
      throw error;
    }
  },

  updateAccessToken: async (accessToken: string) => {
    try {
      const state = get();
      if (state.refreshToken) {
        await storeTokens({
          access_token: accessToken,
          refresh_token: state.refreshToken,
        });
        set({ accessToken, error: null });
      }
    } catch (error) {
      console.error("Failed to update access token:", error);
      set({ error: "Failed to refresh token" });
      throw error;
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  updateUser: async (patch: Partial<AuthUser>) => {
    const state = get();
    if (!state.user) {
      return;
    }

    const nextUser = {
      ...state.user,
      ...patch,
    };

    await storeUser(nextUser);
    set({ user: nextUser });
  },
}));
