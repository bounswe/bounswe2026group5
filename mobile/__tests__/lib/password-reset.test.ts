import { forgotPassword, resetPassword } from "@/lib/queries/auth";
import { API_BASE_URL } from "@/lib/api/config";

const AUTH_BASE = `${API_BASE_URL}/api/auth`;

const fetchMock = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

// fetchWithTimeout wraps fetch — resolve its module so we use the real wrapper
// but intercept the underlying fetch.
jest.mock("@/lib/api/fetchWithTimeout", () => ({
  fetchWithTimeout: (url: string, init: RequestInit) =>
    globalThis.fetch(url, init),
}));

describe("forgotPassword", () => {
  it("posts email to the forgot-password endpoint", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    await forgotPassword("user@example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      `${AUTH_BASE}/forgot-password/`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );
  });

  it("throws with the backend detail message on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Rate limit exceeded." }),
    });

    await expect(forgotPassword("user@example.com")).rejects.toThrow(
      "Rate limit exceeded.",
    );
  });

  it("throws with the email field error when detail is absent", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ email: ["Enter a valid email address."] }),
    });

    await expect(forgotPassword("bad-email")).rejects.toThrow(
      "Enter a valid email address.",
    );
  });

  it("falls back to a generic message when the error body is empty", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(forgotPassword("user@example.com")).rejects.toThrow(
      "Something went wrong",
    );
  });
});

describe("resetPassword", () => {
  const payload = {
    token: "valid-token",
    new_password: "newPass123",
    confirm_password: "newPass123",
  };

  it("posts token and passwords to the reset-password endpoint", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    await resetPassword(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      `${AUTH_BASE}/reset-password/`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("throws with the backend detail on a 400 response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Token has expired." }),
    });

    await expect(resetPassword(payload)).rejects.toThrow("Token has expired.");
  });

  it("falls back to a generic message when detail is absent", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(resetPassword(payload)).rejects.toThrow(
      "Password reset failed",
    );
  });
});