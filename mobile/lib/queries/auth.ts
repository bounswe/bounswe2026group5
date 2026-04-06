/**
 * @fileoverview Authentication mutations using React Query.
 * Handles login, registration, and logout mutations.
 */

import { useMutation } from "@tanstack/react-query";
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from "../auth/types";
import { useAuthStore } from "../auth/store";
import { API_BASE_URL } from "@/lib/api/config";

const AUTH_BASE_PATH = "/api/auth";

function getAuthErrorMessage(
  errorData: {
    detail?: string;
    email?: string[];
    password?: string[];
    confirm_password?: string[];
    non_field_errors?: string[];
  },
  fallbackMessage: string,
): string {
  return (
    errorData.detail ||
    errorData.email?.[0] ||
    errorData.password?.[0] ||
    errorData.confirm_password?.[0] ||
    errorData.non_field_errors?.[0] ||
    fallbackMessage
  );
}

async function postAuthEndpoint<TPayload>(
  endpoint: "login" | "register",
  payload: TPayload,
  fallbackError: string,
): Promise<AuthResponse> {
  const url = `${API_BASE_URL}${AUTH_BASE_PATH}/${endpoint}/`;

  if (__DEV__) {
    console.log("[Auth] Request", {
      endpoint,
      url,
      payloadPreview:
        typeof payload === "object" && payload !== null
          ? { ...payload, password: "***" }
          : payload,
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({}) as Record<string, string[]>);

    if (__DEV__) {
      console.error("[Auth] Error response", {
        endpoint,
        url,
        status: response.status,
        errorData,
      });
    }

    throw new Error(
      getAuthErrorMessage(
        errorData as {
          detail?: string;
          email?: string[];
          password?: string[];
          confirm_password?: string[];
          non_field_errors?: string[];
        },
        fallbackError,
      ),
    );
  }

  return response.json();
}

/**
 * POST /api/auth/login/ - Login with email and password.
 *
 * @param credentials - Email and password
 * @returns AuthResponse with tokens and user info
 */
async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  return postAuthEndpoint("login", credentials, "Login failed");
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
  return postAuthEndpoint("register", credentials, "Registration failed");
}

function useAuthMutation<TCredentials>(
  mutationFn: (credentials: TCredentials) => Promise<AuthResponse>,
) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn,
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
 * Hook for login mutation.
 * Handles login request, stores tokens and user, and updates auth store.
 *
 * @returns Mutation object with mutate, isPending, error, data
 */
export function useLoginMutation() {
  return useAuthMutation(loginUser);
}

/**
 * Hook for registration mutation.
 * Handles registration request, stores tokens and user, and updates auth store.
 *
 * @returns Mutation object with mutate, isPending, error, data
 */
export function useRegisterMutation() {
  return useAuthMutation(registerUser);
}

/**
 * Hook for logout mutation.
 * Clears auth state and tokens from storage.
 *
 * @returns Mutation object with mutate, isPending, error
 */
export function useLogoutMutation() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      // Call backend logout endpoint if it exists
      // For now, we'll just clear local auth state
      await logout();
    },
    onError: (error: Error) => {
      console.error("Logout failed:", error);
    },
  });
}
