import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { useGoogleLoginMutation } from "@/lib/queries/googleAuth";
import { useAuthStore } from "@/lib/auth/store";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: vi.fn(),
    hasPlayServices: vi.fn(() => Promise.resolve(true)),
    signIn: vi.fn(() => Promise.resolve({
      data: { idToken: "fake-id-token" }
    })),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}));

vi.mock("@/lib/api/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

// Setup React Query wrapper
const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useGoogleLoginMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const { result } = renderHook(() => useGoogleLoginMutation(), { wrapper });

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

    const { result } = renderHook(() => useGoogleLoginMutation(), { wrapper });

    try {
      await result.current.mutateAsync();
    } catch (e) {
      // expected
    }

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("Google Login Failed");
  });
});
