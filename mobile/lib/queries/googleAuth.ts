/**
 * @fileoverview Google OAuth authentication for React Native.
 * Uses @react-native-google-signin/google-signin to trigger native Google
 * login dialog and exchange the resulting ID token with the backend.
 */

import { useMutation } from "@tanstack/react-query";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { AuthResponse } from "../auth/types";
import { useAuthStore } from "../auth/store";
import { API_BASE_URL } from "@/lib/api/config";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

const AUTH_GOOGLE_PATH = "/api/auth/google/";

/**
 * Configure Google Sign-In.
 * Must be called once before any sign-in attempt (e.g. in app _layout).
 */
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
    offlineAccess: false,
  });
}

/**
 * Trigger native Google sign-in and exchange the ID token with the backend.
 * Returns the same AuthResponse shape as email login/register.
 */
async function googleLoginUser(): Promise<AuthResponse> {
  // Check Play Services availability
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Trigger the native Google login dialog
  const signInResult = await GoogleSignin.signIn();

  const idToken = signInResult.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In did not return an ID token.");
  }

  if (__DEV__) {
    console.log("[GoogleAuth] Got ID token, sending to backend...");
  }

  // Exchange the ID token with our backend
  const url = `${API_BASE_URL}${AUTH_GOOGLE_PATH}`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({}) as Record<string, unknown>);

    const message =
      (errorData as { detail?: string }).detail ||
      `Google login failed (${response.status})`;

    if (__DEV__) {
      console.error("[GoogleAuth] Backend error", {
        status: response.status,
        errorData,
      });
    }

    throw new Error(message);
  }

  return response.json();
}

/**
 * Hook for Google OAuth login mutation.
 * Handles the full flow: native dialog → backend exchange → auth store update.
 *
 * @returns Mutation object with mutateAsync, isPending, error, data
 */
export function useGoogleLoginMutation() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn: googleLoginUser,
    onSuccess: async (data: AuthResponse) => {
      try {
        await setAuthenticated(data.user, {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        setError(null);
      } catch (error) {
        console.error("Failed to set authenticated state:", error);
        setError("Failed to save session");
      }
    },
    onError: (error: Error) => {
      // Don't show error if user just cancelled the dialog
      if (
        error.message?.includes(statusCodes.SIGN_IN_CANCELLED) ||
        error.message?.includes("canceled")
      ) {
        return;
      }
      setError(error.message);
    },
  });
}
