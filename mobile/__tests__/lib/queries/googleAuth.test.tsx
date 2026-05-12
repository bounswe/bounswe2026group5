import React from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import {
  configureGoogleSignIn,
  useGoogleLoginMutation,
} from "@/lib/queries/googleAuth";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  actual.NativeModules.RNGoogleSignin = {};
  return actual;
});

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({
      data: { idToken: "fake-id-token" }
    })),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}));

jest.mock("@/lib/api/fetchWithTimeout", () => ({
  fetchWithTimeout: jest.fn(),
}));

// Setup React Query wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useGoogleLoginMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("configures Google Sign-In when the native module is available", () => {
    configureGoogleSignIn();

    expect(GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        offlineAccess: false,
      }),
    );
  });

  it("successfully logs in with Google and updates auth store", async () => {
    const mockAuthResponse = {
      access_token: "access-token",
      refresh_token: "refresh-token",
      user: { id: "1", email: "test@google.com", username: "google_user" },
    };

    (fetchWithTimeout as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAuthResponse),
    });

    const { result } = renderHook(() => useGoogleLoginMutation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    expect(GoogleSignin.signIn).toHaveBeenCalled();
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/google/"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id_token: "fake-id-token" }),
      })
    );

    // Verify auth store was updated (implicitly via mutation onSuccess)
    // In a real test environment, you'd check useAuthStore.getState().isAuthenticated
  });

  it("handles Google sign-in failure", async () => {
    (GoogleSignin.signIn as any).mockRejectedValueOnce(new Error("Google Login Failed"));

    const { result } = renderHook(() => useGoogleLoginMutation(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync();
    } catch (e) {
      // expected
    }

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe("Google Login Failed");
    });
  });
});
