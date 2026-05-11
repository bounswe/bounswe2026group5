import { renderHook, waitFor } from "@testing-library/react-native";

// expo-notifications and expo-device are mocked globally in jest.setup.js

const mockRegisterToken = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockIsFirebaseAvailable = jest.fn();

jest.mock("@/lib/queries/notifications", () => ({
  useRegisterFCMTokenMutation: () => ({ mutate: mockRegisterToken }),
  notificationsQueryKey: (username: string) => ["notifications", username],
}));

jest.mock("@/lib/auth/store", () => ({
  useAuthStore: (
    selector: (state: { user: { username: string } }) => unknown,
  ) => selector({ user: { username: "alice" } }),
}));

jest.mock("@/lib/firebase-client", () => ({
  isFirebaseAvailable: () => mockIsFirebaseAvailable(),
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// Import after mocks so the hook picks them up
import { usePushNotifications } from "@/hooks/usePushNotifications";

describe("usePushNotifications", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Notifications: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFirebaseAvailable.mockReturnValue(true);
    Notifications = require("expo-notifications");
  });

  it("skips all setup when the user is not authenticated", async () => {
    renderHook(() => usePushNotifications(false));

    // Allow any pending microtasks to drain
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(Notifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(mockRegisterToken).not.toHaveBeenCalled();
  });

  it("uses polling fallback and skips Firebase token registration when Firebase is not configured", async () => {
    mockIsFirebaseAvailable.mockReturnValue(false);

    renderHook(() => usePushNotifications(true));

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(Notifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(mockRegisterToken).not.toHaveBeenCalled();
  });

  it("registers the device FCM token after loading notification modules when authenticated", async () => {
    renderHook(() => usePushNotifications(true));

    await waitFor(() => {
      expect(mockRegisterToken).toHaveBeenCalledWith({
        token: "mock-token",
        device_type: expect.stringMatching(/^(ios|android)$/),
      });
    });
  });

  it("invalidates the notifications query for the current user when a notification arrives", async () => {
    renderHook(() => usePushNotifications(true));

    await waitFor(() => {
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    });

    const [receivedCallback] =
      Notifications.addNotificationReceivedListener.mock.calls[0];
    receivedCallback();

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["notifications", "alice"],
    });
  });

  it("removes both notification listeners when the hook unmounts", async () => {
    const mockRemoveReceived = jest.fn();
    const mockRemoveResponse = jest.fn();

    Notifications.addNotificationReceivedListener.mockReturnValue({
      remove: mockRemoveReceived,
    });
    Notifications.addNotificationResponseReceivedListener.mockReturnValue({
      remove: mockRemoveResponse,
    });

    const { unmount } = renderHook(() => usePushNotifications(true));

    await waitFor(() => {
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveReceived).toHaveBeenCalled();
    expect(mockRemoveResponse).toHaveBeenCalled();
  });
});
