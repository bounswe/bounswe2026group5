/**
 * @fileoverview Authentication mutations using React Query.
 * Handles login, registration, and logout mutations.
 */

import { useMutation } from "@tanstack/react-query";
import { apiGet } from "../api/client";
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from "../auth/types";
import { useAuthStore } from "../auth/store";

/**
 * POST /api/auth/login/ - Login with email and password.
 *
 * @param credentials - Email and password
 * @returns AuthResponse with tokens and user info
 */
async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/login/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail ||
        errorData.email?.[0] ||
        errorData.non_field_errors?.[0] ||
        "Login failed",
    );
  }

  return response.json();
}

/**
 * POST /api/auth/register/ - Create new user account.
 *
 * @param credentials - Email and password
 * @returns AuthResponse with tokens and user info
 */
async function registerUser(
  credentials: RegisterCredentials,
): Promise<AuthResponse> {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/register/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail ||
        errorData.email?.[0] ||
        errorData.password?.[0] ||
        errorData.non_field_errors?.[0] ||
        "Registration failed",
    );
  }

  return response.json();
}

/**
 * Hook for login mutation.
 * Handles login request, stores tokens and user, and updates auth store.
 *
 * @returns Mutation object with mutate, isPending, error, data
 */
export function useLoginMutation() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn: loginUser,
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
      setError(error.message);
    },
  });
}

/**
 * Hook for registration mutation.
 * Handles registration request, stores tokens and user, and updates auth store.
 *
 * @returns Mutation object with mutate, isPending, error, data
 */
export function useRegisterMutation() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn: registerUser,
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
      setError(error.message);
    },
  });
}
