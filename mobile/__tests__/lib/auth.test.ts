import {
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  getCurrentUser,
  isEmailVerificationRequiredError,
  verifyEmail,
} from "@/lib/queries/auth";
import { ApiError, apiGet } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => {
  class MockApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    ApiError: MockApiError,
    apiGet: jest.fn(),
    apiPost: jest.fn(),
  };
});

describe("auth query helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("verifies email with an encoded token", async () => {
    (apiGet as jest.Mock).mockResolvedValueOnce({
      detail: "Email has been verified successfully.",
    });

    await expect(verifyEmail("token with spaces/+")).resolves.toEqual({
      detail: "Email has been verified successfully.",
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/api/auth/verify-email/?token=token%20with%20spaces%2F%2B",
    );
  });

  it("fetches the current authenticated user", async () => {
    const user = {
      id: "user-1",
      email: "ada@example.com",
      username: "ada",
      role: "USER",
      auth_provider: "LOCAL",
      is_active: true,
      is_email_verified: true,
      created_at: "2026-04-29T00:00:00Z",
    };
    (apiGet as jest.Mock).mockResolvedValueOnce(user);

    await expect(getCurrentUser()).resolves.toEqual(user);

    expect(apiGet).toHaveBeenCalledWith("/api/auth/me/");
  });

  it("detects verification-required API errors", () => {
    expect(
      isEmailVerificationRequiredError(
        new ApiError(403, EMAIL_VERIFICATION_REQUIRED_MESSAGE),
      ),
    ).toBe(true);

    expect(
      isEmailVerificationRequiredError(new ApiError(403, "Different failure")),
    ).toBe(false);
    expect(isEmailVerificationRequiredError(new Error("Nope"))).toBe(false);
  });
});
