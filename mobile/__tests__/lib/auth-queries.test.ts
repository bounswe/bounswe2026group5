import {
  updateProfileFn,
  updateUsernameFn,
  updateUsageModeFn,
} from "@/lib/queries/authQueries";
import { API_BASE_URL } from "@/lib/api/config";

describe("authQueries", () => {
  const fetchMock = jest.fn();
  function expectJsonRequest(
    url: string,
    options: {
      method: string;
      token?: string;
      body?: unknown;
    },
  ) {
    expect(fetchMock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: options.method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      }),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it("sends onboarding username updates to the dedicated username endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: "custom_user" }),
    });

    const result = await updateUsernameFn({
      accessToken: "token-123",
      username: "custom_user",
    });

    expect(result).toEqual({ username: "custom_user" });
    expectJsonRequest(
      `${API_BASE_URL}/api/profiles/me/username/`,
      {
        method: "PATCH",
        token: "token-123",
        body: { username: "custom_user" },
      },
    );
  });

  it("surfaces username validation errors from the dedicated endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ username: ["This username is already taken."] }),
    });

    await expect(
      updateUsernameFn({
        accessToken: "token-123",
        username: "taken_user",
      }),
    ).rejects.toMatchObject({
      message: "This username is already taken.",
      fieldErrors: { username: "This username is already taken." },
    });
  });

  it("still updates profile details through the profile endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ display_name: "Ada Lovelace" }),
    });

    await updateProfileFn({
      accessToken: "token-123",
      display_name: "Ada Lovelace",
      bio: "Builds systems.",
      skills: ["Testing"],
    });

    expectJsonRequest(
      `${API_BASE_URL}/api/profiles/me/`,
      {
        method: "PATCH",
        token: "token-123",
        body: {
          display_name: "Ada Lovelace",
          bio: "Builds systems.",
          skills: ["Testing"],
        },
      },
    );
  });

  it("still updates usage mode through the role endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "1",
        email: "ada@example.com",
        username: "ada_user",
        role: "USER",
        auth_provider: "email",
        app_usage_mode: "MENTOR",
        is_active: true,
        created_at: "2026-04-21T00:00:00Z",
      }),
    });

    await updateUsageModeFn({
      app_usage_mode: "MENTOR",
      accessToken: "token-123",
    });

    expectJsonRequest(
      `${API_BASE_URL}/api/auth/me/role/`,
      {
        method: "PATCH",
        token: "token-123",
        body: { app_usage_mode: "MENTOR" },
      },
    );
  });
});
