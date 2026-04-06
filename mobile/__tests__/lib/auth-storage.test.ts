import {
  clearAuthStorage,
  getStoredTokens,
  getStoredUser,
  storeTokens,
  storeUser,
} from "@/lib/auth/storage";
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("auth storage", () => {
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("stores tokens and user payloads as JSON", async () => {
    await storeTokens({ access_token: "a", refresh_token: "r" });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_tokens",
      JSON.stringify({ access_token: "a", refresh_token: "r" }),
    );

    await storeUser({
      id: "1",
      email: "u@example.com",
      username: "u1",
      role: "MENTEE",
      auth_provider: "local",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_user",
      expect.any(String),
    );
  });

  it("rethrows write errors for tokens and user storage", async () => {
    mockSecureStore.setItemAsync.mockRejectedValueOnce(
      new Error("token write fail"),
    );
    await expect(
      storeTokens({ access_token: "a", refresh_token: "r" }),
    ).rejects.toThrow("token write fail");

    mockSecureStore.setItemAsync.mockRejectedValueOnce(
      new Error("user write fail"),
    );
    await expect(
      storeUser({
        id: "1",
        email: "u@example.com",
        username: "u1",
        role: "MENTEE",
        auth_provider: "local",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).rejects.toThrow("user write fail");
  });

  it("reads and parses stored tokens and user", async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(
        JSON.stringify({ access_token: "a", refresh_token: "r" }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          id: "1",
          email: "u@example.com",
          username: "u1",
          role: "MENTEE",
          auth_provider: "local",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        }),
      );

    await expect(getStoredTokens()).resolves.toEqual({
      access_token: "a",
      refresh_token: "r",
    });
    await expect(getStoredUser()).resolves.toEqual({
      id: "1",
      email: "u@example.com",
      username: "u1",
      role: "MENTEE",
      auth_provider: "local",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    });
  });

  it("returns null when stored values are empty or invalid", async () => {
    mockSecureStore.getItemAsync
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("not-json");

    await expect(getStoredTokens()).resolves.toBeNull();
    await expect(getStoredTokens()).resolves.toBeNull();
    await expect(getStoredUser()).resolves.toBeNull();
    await expect(getStoredUser()).resolves.toBeNull();
  });

  it("clears both auth keys and rethrows clear errors", async () => {
    await clearAuthStorage();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_tokens");
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_user");

    mockSecureStore.deleteItemAsync.mockRejectedValueOnce(
      new Error("delete fail"),
    );
    await expect(clearAuthStorage()).rejects.toThrow("delete fail");
  });
});
