import { useAuthStore } from "@/lib/auth/store";
import { AuthTokens, AuthUser } from "@/lib/auth/types";
import {
  clearAuthStorage,
  getStoredTokens,
  getStoredUser,
  storeTokens,
  storeUser,
} from "@/lib/auth/storage";

jest.mock("@/lib/auth/storage", () => ({
  storeTokens: jest.fn(),
  getStoredTokens: jest.fn(),
  storeUser: jest.fn(),
  getStoredUser: jest.fn(),
  clearAuthStorage: jest.fn(),
}));

const mockedStoreTokens = storeTokens as jest.MockedFunction<
  typeof storeTokens
>;
const mockedGetStoredTokens = getStoredTokens as jest.MockedFunction<
  typeof getStoredTokens
>;
const mockedStoreUser = storeUser as jest.MockedFunction<typeof storeUser>;
const mockedGetStoredUser = getStoredUser as jest.MockedFunction<
  typeof getStoredUser
>;
const mockedClearAuthStorage = clearAuthStorage as jest.MockedFunction<
  typeof clearAuthStorage
>;

const baseUser: AuthUser = {
  id: "1",
  email: "u@example.com",
  username: "user1",
  role: "MENTEE",
  auth_provider: "local",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const baseTokens: AuthTokens = {
  access_token: "a-token",
  refresh_token: "r-token",
};

function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
  });
}

describe("auth store", () => {
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStoreTokens.mockResolvedValue(undefined);
    mockedStoreUser.mockResolvedValue(undefined);
    mockedClearAuthStorage.mockResolvedValue(undefined);
    mockedGetStoredTokens.mockResolvedValue(null);
    mockedGetStoredUser.mockResolvedValue(null);
    resetStore();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("initializes authenticated state when persisted user and tokens exist", async () => {
    mockedGetStoredTokens.mockResolvedValue(baseTokens);
    mockedGetStoredUser.mockResolvedValue(baseUser);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(baseUser);
    expect(state.accessToken).toBe("a-token");
    expect(state.refreshToken).toBe("r-token");
    expect(state.error).toBeNull();
  });

  it("initializes unauthenticated state when persisted data is missing", async () => {
    mockedGetStoredTokens.mockResolvedValue(null);
    mockedGetStoredUser.mockResolvedValue(null);

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it("surfaces restore failure when initialization throws", async () => {
    mockedGetStoredTokens.mockRejectedValue(new Error("boom"));

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe("Failed to restore session");
    expect(state.isLoading).toBe(false);
  });

  it("sets authenticated state and persists user/tokens", async () => {
    await useAuthStore.getState().setAuthenticated(baseUser, baseTokens);

    expect(mockedStoreTokens).toHaveBeenCalledWith(baseTokens);
    expect(mockedStoreUser).toHaveBeenCalledWith(baseUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(baseUser);
    expect(state.accessToken).toBe("a-token");
    expect(state.refreshToken).toBe("r-token");
    expect(state.error).toBeNull();
  });

  it("throws and records save error if persisting authenticated state fails", async () => {
    mockedStoreTokens.mockRejectedValue(new Error("write failed"));

    await expect(
      useAuthStore.getState().setAuthenticated(baseUser, baseTokens),
    ).rejects.toThrow("write failed");

    expect(useAuthStore.getState().error).toBe("Failed to save session");
  });

  it("clears auth state on logout", async () => {
    useAuthStore.setState({
      user: baseUser,
      accessToken: baseTokens.access_token,
      refreshToken: baseTokens.refresh_token,
      isAuthenticated: true,
      error: null,
      isLoading: false,
    });

    await useAuthStore.getState().logout();

    expect(mockedClearAuthStorage).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("throws and records logout error if clearing storage fails", async () => {
    mockedClearAuthStorage.mockRejectedValue(new Error("cannot clear"));

    await expect(useAuthStore.getState().logout()).rejects.toThrow(
      "cannot clear",
    );
    expect(useAuthStore.getState().error).toBe("Failed to logout");
  });

  it("updates access token when refresh token exists", async () => {
    useAuthStore.setState({
      user: baseUser,
      accessToken: baseTokens.access_token,
      refreshToken: baseTokens.refresh_token,
      isAuthenticated: true,
      error: null,
      isLoading: false,
    });

    await useAuthStore.getState().updateAccessToken("new-access");

    expect(mockedStoreTokens).toHaveBeenCalledWith({
      access_token: "new-access",
      refresh_token: "r-token",
    });
    expect(useAuthStore.getState().accessToken).toBe("new-access");
  });

  it("does not persist access token if refresh token is missing", async () => {
    useAuthStore.setState({
      user: baseUser,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
    });

    await useAuthStore.getState().updateAccessToken("new-access");

    expect(mockedStoreTokens).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("throws and records refresh-token update errors", async () => {
    useAuthStore.setState({
      user: baseUser,
      accessToken: "old-access",
      refreshToken: "r-token",
      isAuthenticated: true,
      error: null,
      isLoading: false,
    });
    mockedStoreTokens.mockRejectedValue(new Error("persist failed"));

    await expect(
      useAuthStore.getState().updateAccessToken("new-access"),
    ).rejects.toThrow("persist failed");
    expect(useAuthStore.getState().error).toBe("Failed to refresh token");
  });

  it("supports direct loading/error setters", () => {
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setError("x");

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.error).toBe("x");
  });

  it("updates user fields and persists patched profile", async () => {
    useAuthStore.setState({
      user: baseUser,
      accessToken: baseTokens.access_token,
      refreshToken: baseTokens.refresh_token,
      isAuthenticated: true,
      error: null,
      isLoading: false,
    });

    await useAuthStore
      .getState()
      .updateUser({ role: "MENTOR", username: "mentor1" });

    expect(mockedStoreUser).toHaveBeenCalledWith({
      ...baseUser,
      role: "MENTOR",
      username: "mentor1",
    });
    expect(useAuthStore.getState().user?.role).toBe("MENTOR");
    expect(useAuthStore.getState().user?.username).toBe("mentor1");
  });

  it("does nothing when patching user while unauthenticated", async () => {
    await useAuthStore.getState().updateUser({ username: "no-op" });

    expect(mockedStoreUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
