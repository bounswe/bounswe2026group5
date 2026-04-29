import VerifyEmailScreen from "@/app/verify-email";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const mockReplace = jest.fn();
const mockVerifyMutateAsync = jest.fn();
const mockCurrentUserMutateAsync = jest.fn();
const mockResendMutateAsync = jest.fn();
const mockUpdateUser = jest.fn();
let mockToken: string | undefined | string[] = "valid-token";
let mockIsAuthenticated = true;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ token: mockToken }),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isAuthenticated: mockIsAuthenticated,
      updateUser: mockUpdateUser,
    }),
}));

jest.mock("@/lib/queries/auth", () => ({
  useVerifyEmailMutation: () => ({
    mutateAsync: mockVerifyMutateAsync,
    isPending: false,
  }),
  useCurrentUserMutation: () => ({
    mutateAsync: mockCurrentUserMutateAsync,
    isPending: false,
  }),
  useResendEmailVerificationMutation: () => ({
    mutateAsync: mockResendMutateAsync,
    isPending: false,
  }),
}));

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = "valid-token";
    mockIsAuthenticated = true;
    mockVerifyMutateAsync.mockResolvedValue({
      detail: "Email has been verified successfully.",
    });
    mockCurrentUserMutateAsync.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      username: "ada",
      role: "USER",
      auth_provider: "LOCAL",
      is_active: true,
      is_email_verified: true,
      created_at: "2026-04-29T00:00:00Z",
    });
    mockResendMutateAsync.mockResolvedValue({
      detail: "If your email is unverified, a new verification link has been sent.",
    });
  });

  it("verifies the token, refreshes the user, and shows success", async () => {
    const { findByText, getByTestId } = render(<VerifyEmailScreen />);

    expect(await findByText("Email verified")).toBeTruthy();
    expect(
      await findByText("Email has been verified successfully."),
    ).toBeTruthy();

    expect(mockVerifyMutateAsync).toHaveBeenCalledWith("valid-token");
    expect(mockCurrentUserMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ is_email_verified: true }),
    );

    fireEvent.press(getByTestId("go-to-dashboard-button"));
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });

  it("patches local verification when user refresh fails after backend success", async () => {
    mockCurrentUserMutateAsync.mockRejectedValueOnce(new Error("Offline"));

    render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        is_email_verified: true,
      });
    });
  });

  it("shows a missing-token error without calling verify", async () => {
    mockToken = undefined;

    const { findByText, getByTestId } = render(<VerifyEmailScreen />);

    expect(await findByText("Verification failed")).toBeTruthy();
    expect(
      await findByText("This verification link is missing a token."),
    ).toBeTruthy();
    expect(mockVerifyMutateAsync).not.toHaveBeenCalled();

    fireEvent.press(getByTestId("resend-verification-button"));

    expect(mockResendMutateAsync).toHaveBeenCalledTimes(1);
    expect(
      await findByText(
        "If your email is unverified, a new verification link has been sent.",
      ),
    ).toBeTruthy();
  });

  it("shows invalid-token errors without requiring an authenticated user", async () => {
    mockIsAuthenticated = false;
    mockVerifyMutateAsync.mockRejectedValueOnce(
      new Error("Invalid or expired token."),
    );

    const { findByText, queryByTestId } = render(<VerifyEmailScreen />);

    expect(await findByText("Verification failed")).toBeTruthy();
    expect(await findByText("Invalid or expired token.")).toBeTruthy();
    expect(mockCurrentUserMutateAsync).not.toHaveBeenCalled();
    expect(queryByTestId("resend-verification-button")).toBeNull();
  });
});
